import { buildRequest } from '../azure.mjs';
import {
  TOTAL_SLOTS, parseEvents, extractTokens, totalSlots, fitToBar, melodyFeatures, meanFeatures, randomMelody, trainBigram, sampleBigram, copiedShare,
  synthesizeMelody, verifyRender, renderPianoRoll, tokenOf, SLOT_SECONDS, BPM,
} from '../media/music.mjs';
import { encodeWav } from '../media/wav.mjs';
import { canvasToPng } from '../media/raster.mjs';
import { experimentResult, table, image, audio, text, bars, code } from './contract.mjs';

export const corpus = [
  { title: 'Twinkle, Twinkle, Little Star, lines 1-2', source: 'Traditional French tune, public domain', tokens: 'C4:2 C4:2 G4:2 G4:2 A4:2 A4:2 G4:4 F4:2 F4:2 E4:2 E4:2 D4:2 D4:2 C4:4' },
  { title: 'Twinkle, Twinkle, Little Star, lines 3-4', source: 'Traditional French tune, public domain', tokens: 'G4:2 G4:2 F4:2 F4:2 E4:2 E4:2 D4:4 G4:2 G4:2 F4:2 F4:2 E4:2 E4:2 D4:4' },
  { title: 'Ode to Joy, bars 1-4', source: 'Beethoven, 1824, public domain', tokens: 'E4:2 E4:2 F4:2 G4:2 G4:2 F4:2 E4:2 D4:2 C4:2 C4:2 D4:2 E4:2 E4:3 D4:1 D4:4' },
  { title: 'Ode to Joy, bars 5-8', source: 'Beethoven, 1824, public domain', tokens: 'E4:2 E4:2 F4:2 G4:2 G4:2 F4:2 E4:2 D4:2 C4:2 C4:2 D4:2 E4:2 D4:3 C4:1 C4:4' },
  { title: 'Frere Jacques, bars 1-4', source: 'Traditional French round, public domain', tokens: 'C4:2 D4:2 E4:2 C4:2 C4:2 D4:2 E4:2 C4:2 E4:2 F4:2 G4:4 E4:2 F4:2 G4:4' },
  { title: 'Frere Jacques, bars 5-8', source: 'Traditional French round, public domain', tokens: 'G4:1 A4:1 G4:1 F4:1 E4:2 C4:2 G4:1 A4:1 G4:1 F4:1 E4:2 C4:2 C4:2 G4:2 C4:4 C4:2 G4:2 C4:4' },
  { title: 'Mary Had a Little Lamb, bars 1-4', source: 'Traditional, 1830s, public domain', tokens: 'E4:2 D4:2 C4:2 D4:2 E4:2 E4:2 E4:4 D4:2 D4:2 D4:4 E4:2 G4:2 G4:4' },
  { title: 'Mary Had a Little Lamb, bars 5-8', source: 'Traditional, 1830s, public domain', tokens: 'E4:2 D4:2 C4:2 D4:2 E4:2 E4:2 E4:2 E4:2 D4:2 D4:2 E4:2 D4:2 C4:4 R:4' },
  { title: 'Au clair de la lune, bars 1-4', source: 'Traditional French song, public domain', tokens: 'C4:2 C4:2 C4:2 D4:2 E4:4 D4:4 C4:2 E4:2 D4:2 D4:2 C4:4 R:4' },
];
export const corpusPhrases = corpus.map(entry => parseEvents(entry.tokens.split(' ')).events);
export const SAMPLES = 30;
export const GPT_SAMPLES = 5;
export const seeds = { random: 100, low: 200, high: 300 };
export const LOW_TEMPERATURE = 0.7;
export const HIGH_TEMPERATURE = 1.6;

export const composePrompt = 'Compose a simple, singable 4-bar melody in C major as a list of note events. Write each event as PITCH:DURATION, separated by single spaces. Allowed pitches: C4 D4 E4 F4 G4 A4 B4 C5, and R for a rest. Allowed durations, in eighth notes: 1, 2, 3 or 4. The durations must add up to exactly 32. Finish on C4 or C5. Reply with only the events on one line, with no explanation.';

const labels = [
  'Random notes (the baseline)',
  'A next-note model trained on nine tunes, low temperature',
  'The same model, high temperature',
  'GPT-4o composing from written instructions',
];
const pct = value => `${(100 * value).toFixed(0)}%`;
const f2 = value => Number(value.toFixed(2));

export function generateSet(kind, model) {
  return Array.from({ length: SAMPLES }, (_, i) => (kind === 'random' ? randomMelody(seeds.random + i) :
    sampleBigram(model, kind === 'low' ? LOW_TEMPERATURE : HIGH_TEMPERATURE, seeds[kind] + i)));
}

export const copiedMean = set => set.reduce((sum, events) => sum + copiedShare(events, corpusPhrases, 4), 0) / set.length;

const featureRows = (means, label, copied) => [
  [label, pct(means.stepwiseRatio), pct(means.leapRatio), f2(means.rangeSteps), pct(means.endsOnTonic), pct(means.repetition), f2(means.uniqueTokens), copied === null ? 'not applicable' : pct(copied)],
];

export const musicLab = {
  id: '36-music-tokens', title: 'Music is tokens', minutes: 12, series: 'genai',
  concept: 'A melody can be written as a sequence of note-event tokens. A model that predicts the next token can then compose, just as Lab 00 predicted words. Here three kinds of composer are measured with the same music-theory yardstick, and every melody is rendered to real audio that we check by pitch tracking.',
  question: 'What did learning from nine tunes change compared with random notes, and what did raising the temperature change?',
  caveat: 'Azure offers no music-generation model in this subscription, so this lab uses symbolic notes, a tiny statistical model, and GPT-4o prompted to write notes; it is not how audio models like MusicGen or Lyria work. The corpus is nine simplified public-domain phrases, the synthesizer is a basic harmonic tone generator, and these measurements do not judge whether a melody is beautiful.',
  exercise: 'Replace one of the nine phrases in corpus (lib/genai/music-lab.mjs) with another public-domain phrase of exactly 32 eighth-note slots, redeploy, and see which statistics move.',
  cases: labels.map(label => ({ label, experiment: true })),
  async run(ctx) {
    const model = trainBigram(corpusPhrases);
    const baseline = meanFeatures(corpusPhrases.map(melodyFeatures));
    const emit = async ({ label, events, statistics, summary, calls = [], extra = {}, notes = [] }) => {
      const started = performance.now();
      const id = ['random', 'bigram-low', 'bigram-high', 'gpt4o'][labels.indexOf(label)];
      const samples = synthesizeMelody(events);
      const render = verifyRender(samples, events);
      const wav = ctx.artifacts.add({ id: `${id}-audio`, extension: 'wav', data: encodeWav(samples, 16000), description: `${label}: ${f2(samples.length / 16000)} seconds, ${BPM} beats per minute, 16 kHz mono.` });
      const roll = ctx.artifacts.add({ id: `${id}-piano-roll`, extension: 'png', data: canvasToPng(renderPianoRoll(events)), description: `Piano roll of the melody for ${label}: pitch up, time to the right, four bars.` });
      const features = melodyFeatures(events);
      const tokens = events.map(tokenOf).join(' ');
      ctx.addResult(experimentResult({
        label, startedAt: started, calls, artifacts: [wav, roll], summary,
        output: `${tokens}\nThis melody: ${pct(features.stepwiseRatio)} stepwise, ${pct(features.leapRatio)} large leaps, ends on the tonic: ${features.endsOnTonic ? 'yes' : 'no'}.\nAudio check: ${render.verified} of ${render.checked} notes measured within 50 cents of the written pitch.\nAcross ${statistics.samples} melodies: ${pct(statistics.mean.stepwiseRatio)} stepwise, ${f2(statistics.mean.uniqueTokens)} distinct tokens, ${pct(statistics.copied)} of 4-token runs copied from the nine training tunes.\n${notes.join('\n')}`.trim(),
        measurements: { tokens, events, features, statistics, render: { checked: render.checked, verified: render.verified, worstCents: f2(render.worstCents) }, ...extra },
        display: [
          audio(wav, `${label}. ${TOTAL_SLOTS} eighth notes at ${BPM} beats per minute is ${TOTAL_SLOTS * SLOT_SECONDS} seconds.`),
          image(roll, 'Piano roll: higher notes are higher up, time runs left to right, vertical lines mark bars, and the gray line is a rest.', `Piano roll for ${label}`),
          code('The melody as tokens (PITCH:eighth-note-duration)', tokens),
          table(`Music-theory measurements (mean of ${statistics.samples} melodies)`, ['Composer', 'Stepwise motion', 'Large leaps (4+ steps)', 'Range (scale steps)', 'Ends on tonic', 'Repeated note pairs', 'Distinct tokens', 'Copied from training (4-token runs)'],
            [...featureRows(statistics.mean, label, statistics.copied), ...featureRows(baseline, 'Nine training tunes', null)]),
          bars('Variety: distinct tokens per melody (mean)', [{ label, value: f2(statistics.mean.uniqueTokens), max: 12, detail: f2(statistics.mean.uniqueTokens) }, { label: 'Nine training tunes', value: f2(baseline.uniqueTokens), max: 12, detail: f2(baseline.uniqueTokens) }]),
          bars('Stepwise motion (mean)', [{ label, value: Number((100 * statistics.mean.stepwiseRatio).toFixed(1)), max: 100, detail: pct(statistics.mean.stepwiseRatio) }, { label: 'Nine training tunes', value: Number((100 * baseline.stepwiseRatio).toFixed(1)), max: 100, detail: pct(baseline.stepwiseRatio) }]),
          table('Audio verification: does the sound match the notes?', ['Measurement', 'Value'], [['Notes checked by pitch tracking', render.checked], ['Within 50 cents of the written pitch', render.verified], ['Worst error (cents)', f2(render.worstCents)]]),
          ...notes.map(note => text(note)),
        ],
      }));
    };
    const randomSet = generateSet('random', model);
    await emit({ label: labels[0], events: randomSet[0], statistics: { samples: SAMPLES, mean: meanFeatures(randomSet.map(melodyFeatures)), copied: copiedMean(randomSet) }, extra: { seed: seeds.random },
      summary: `Draw ${SAMPLES} melodies by choosing every pitch (or rest) and duration uniformly at random until 32 eighth-note slots are filled. The first (seed ${seeds.random}) is rendered to audio.` });
    const lowSet = generateSet('low', model);
    await emit({ label: labels[1], events: lowSet[0], statistics: { samples: SAMPLES, mean: meanFeatures(lowSet.map(melodyFeatures)), copied: copiedMean(lowSet) }, extra: { seed: seeds.low, temperature: LOW_TEMPERATURE },
      notes: ['Training: count which note event follows each note event in nine simplified public-domain phrases, then sample the next event in proportion to those counts. This is the same idea as Lab 00 with a much shorter memory and a vocabulary of notes instead of words.'],
      summary: `Train a next-note (bigram) model on nine public-domain phrases and sample ${SAMPLES} melodies at temperature ${LOW_TEMPERATURE}. The first (seed ${seeds.low}) is rendered.` });
    const highSet = generateSet('high', model);
    await emit({ label: labels[2], events: highSet[0], statistics: { samples: SAMPLES, mean: meanFeatures(highSet.map(melodyFeatures)), copied: copiedMean(highSet) }, extra: { seed: seeds.high, temperature: HIGH_TEMPERATURE },
      notes: ['Higher temperature flattens the model\'s next-note probabilities, so it picks less common continuations more often. It can only choose among continuations it has seen, so it adds variety but cannot invent a style it never learned.'],
      summary: `Sample ${SAMPLES} melodies from the same trained model at temperature ${HIGH_TEMPERATURE}, which flattens its next-token probabilities. The first (seed ${seeds.high}) is rendered.` });
    const response = await ctx.azure.chat(buildRequest({ model: 'standard', messages: [{ role: 'user', content: composePrompt }], parameters: { temperature: 1, n: GPT_SAMPLES, max_tokens: 200 } }, ctx.config));
    const attempts = response.choices.map(choice => {
      const { events, rejected } = parseEvents(extractTokens(choice.message.content ?? ''));
      const exact = rejected.length === 0 && events.length > 0 && totalSlots(events) === TOTAL_SLOTS;
      return { raw: choice.message.content ?? '', events, rejected, slots: totalSlots(events), exact, fitted: events.length ? fitToBar(events) : null };
    });
    const usable = attempts.filter(attempt => attempt.fitted);
    if (!usable.length) throw new Error('GPT-4o returned no parseable note events.');
    const chosen = usable[0];
    const exactCount = attempts.filter(attempt => attempt.exact).length;
    const flaws = attempts.filter(attempt => !attempt.exact).map(attempt => `${attempt.slots} slots${attempt.rejected.length ? ` with ${attempt.rejected.length} invalid token(s)` : ''}`).join(', ');
    await emit({
      label: labels[3], events: chosen.fitted, calls: [response.call], extra: { prompt: composePrompt, attempts: attempts.map(({ fitted, events, ...rest }) => rest), repaired: !chosen.exact },
      statistics: { samples: usable.length, mean: meanFeatures(usable.map(attempt => melodyFeatures(attempt.fitted))), copied: copiedMean(usable.map(attempt => attempt.fitted)), written: attempts.length, exactlyValid: exactCount },
      notes: [`GPT-4o wrote ${attempts.length} melodies. ${exactCount === attempts.length ? `All ${exactCount} used only allowed tokens and summed to exactly ${TOTAL_SLOTS} slots.` : `${exactCount} used only allowed tokens and summed to exactly ${TOTAL_SLOTS} slots; the others were ${flaws}.`}${chosen.exact ? '' : ' The rendered melody was repaired (cut or padded with a rest) to fit 32 slots.'}`],
      summary: `Ask GPT-4o (temperature 1, ${GPT_SAMPLES} samples in one request) for a melody in the same token format: "${composePrompt}" The first usable melody is rendered; any that miss 32 slots are cut or padded with a rest.`,
    });
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [random, low, high, gpt] = results;
    const model = trainBigram(corpusPhrases);
    const same = (expected, result) => expected.map(tokenOf).join(' ') === result.measurements.tokens;
    const rendered = results.map(result => result.measurements.render);
    const mean = (result, key) => result.measurements.statistics.mean[key];
    return [
      check('The training tunes are valid 32-slot phrases', corpusPhrases.length === corpus.length && corpusPhrases.every(phrase => totalSlots(phrase) === TOTAL_SLOTS), `${corpus.length} phrases of 32 eighth-note slots.`),
      check('Every rendered melody fills exactly four bars', results.every(result => totalSlots(result.measurements.events) === TOTAL_SLOTS), '32 slots, 8 seconds each.'),
      check('The audio matches the written notes under pitch tracking', rendered.every(render => render.checked > 0 && render.verified / render.checked >= 0.95), rendered.map(render => `${render.verified}/${render.checked} (worst ${render.worstCents} cents)`).join('; ')),
      check('Random and trained melodies are reproducible from their seeds', same(randomMelody(seeds.random), random) && same(sampleBigram(model, LOW_TEMPERATURE, seeds.low), low) && same(sampleBigram(model, HIGH_TEMPERATURE, seeds.high), high), 'Re-running the seeded composers reproduces the exact tokens.'),
      check('The trained model moves more stepwise than random notes', mean(low, 'stepwiseRatio') > mean(random, 'stepwiseRatio'),
        `${pct(mean(low, 'stepwiseRatio'))} versus ${pct(mean(random, 'stepwiseRatio'))} over ${SAMPLES} melodies each.`),
      check('Higher temperature adds variety and copies less from the training tunes', mean(high, 'uniqueTokens') > mean(low, 'uniqueTokens') && high.measurements.statistics.copied < low.measurements.statistics.copied,
        `Distinct tokens ${f2(mean(low, 'uniqueTokens'))} to ${f2(mean(high, 'uniqueTokens'))}; copied runs ${pct(low.measurements.statistics.copied)} to ${pct(high.measurements.statistics.copied)}.`),
      check('GPT-4o output was parsed and its validity reported', gpt.measurements.statistics.written === GPT_SAMPLES && gpt.measurements.statistics.samples >= 1, `${gpt.measurements.statistics.exactlyValid} of ${GPT_SAMPLES} followed the format exactly.`),
    ];
  },
};
