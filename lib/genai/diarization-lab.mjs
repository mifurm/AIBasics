import { parseWav, encodeWav, resampleLinear, peakAmplitude, rms } from '../media/wav.mjs';
import { createCanvas, fillRect, drawText, canvasToPng, colors } from '../media/raster.mjs';
import { wordErrorRate } from '../media/text-metrics.mjs';
import { experimentResult, table, image, audio, text, bars } from './contract.mjs';

export const SAMPLE_RATE = 16000;
export const voiceColors = { alloy: colors.orange, onyx: colors.blue, nova: colors.green };
export const utterances = [
  { id: 'u1', voice: 'alloy', text: 'Welcome to the robot club. Today we will build a small rover.' },
  { id: 'u2', voice: 'onyx', text: 'Great, I brought the battery packs and the wheels.' },
  { id: 'u3', voice: 'nova', text: 'I will handle the sensors and the wiring diagram.' },
  { id: 'u4', voice: 'alloy', text: 'Perfect. Let us start with the chassis, then test the motors.' },
  { id: 'u5', voice: 'onyx', text: 'Should we label each cable before we connect them?' },
  { id: 'u6', voice: 'nova', text: 'Yes, labels will save us a lot of time later.' },
];
export const scenarios = [
  { id: 'two-speakers', label: 'Two speakers take turns', turns: ['u1', 'u2', 'u4', 'u5'], overlapSeconds: 0 },
  { id: 'three-speakers', label: 'Three speakers take turns', turns: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], overlapSeconds: 0 },
  { id: 'interruption', label: 'Two speakers, and one interrupts', turns: ['u1', 'u2', 'u4', 'u5'], overlapSeconds: 2 },
];
export const GAP_SECONDS = 0.6;

export function trimSilence(samples, sampleRate, { thresholdRatio = 0.03, padSeconds = 0.04 } = {}) {
  const peak = peakAmplitude(samples);
  if (!peak) throw new Error('Cannot trim silent audio.');
  const threshold = peak * thresholdRatio;
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < threshold) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < threshold) last--;
  const pad = Math.round(padSeconds * sampleRate);
  return samples.slice(Math.max(0, first - pad), Math.min(samples.length, last + 1 + pad));
}

export function speechIntervals(samples, sampleRate, { windowSeconds = 0.02, thresholdRatio = 0.04, minGapSeconds = 0.25, minSpeechSeconds = 0.12 } = {}) {
  const window = Math.round(windowSeconds * sampleRate);
  const peak = peakAmplitude(samples);
  if (!peak) return [];
  const runs = [];
  for (let start = 0; start + window <= samples.length; start += window) {
    if (rms(samples.subarray(start, start + window)) < thresholdRatio * peak) continue;
    const begin = start / sampleRate;
    const end = (start + window) / sampleRate;
    const previous = runs.at(-1);
    if (previous && begin - previous.end < minGapSeconds) previous.end = end;
    else runs.push({ start: begin, end });
  }
  return runs.filter(run => run.end - run.start >= minSpeechSeconds);
}

export function assembleConversation(clips, scenario) {
  const turns = [];
  let previousEnd = 0;
  scenario.turns.forEach((turnId, index) => {
    const clip = clips[turnId];
    const start = index === 0 ? 0 : index === 1 && scenario.overlapSeconds > 0 ? Math.max(0, previousEnd - scenario.overlapSeconds) : previousEnd + GAP_SECONDS;
    const offset = Math.round(start * SAMPLE_RATE);
    const end = (offset + clip.samples.length) / SAMPLE_RATE;
    turns.push({ turn: turnId, voice: clip.voice, start: offset / SAMPLE_RATE, end, text: clip.text, offset });
    previousEnd = end;
  });
  const mix = new Float32Array(Math.ceil((previousEnd + 0.4) * SAMPLE_RATE));
  for (const turn of turns) {
    const { samples } = clips[turn.turn];
    for (let i = 0; i < samples.length; i++) mix[turn.offset + i] += samples[i];
  }
  const peak = peakAmplitude(mix);
  if (peak > 0.95) for (let i = 0; i < mix.length; i++) mix[i] *= 0.95 / peak;
  const speech = turns.flatMap(turn => speechIntervals(clips[turn.turn].samples, SAMPLE_RATE)
    .map(interval => ({ turn: turn.turn, voice: turn.voice, start: turn.start + interval.start, end: turn.start + interval.end })));
  return { samples: mix, truth: turns.map(({ offset, ...turn }) => turn), speech };
}

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

export function scoreDiarization(speech, predicted) {
  const voices = [...new Set(speech.map(segment => segment.voice))];
  const labels = [...new Set(predicted.map(segment => segment.speaker))];
  const matrix = labels.map(label => voices.map(voice => predicted.filter(p => p.speaker === label)
    .reduce((sum, p) => sum + speech.filter(t => t.voice === voice).reduce((inner, t) => inner + overlap(p, t), 0), 0)));
  const mapping = Object.fromEntries(labels.map((label, row) => {
    const best = matrix[row].reduce((index, value, column) => (value > matrix[row][index] ? column : index), 0);
    return [label, matrix[row][best] > 0 ? voices[best] : null];
  }));
  let total = 0;
  let covered = 0;
  let correct = 0;
  for (const segment of speech) {
    const duration = segment.end - segment.start;
    total += duration;
    covered += Math.min(duration, predicted.reduce((sum, p) => sum + overlap(p, segment), 0));
    correct += Math.min(duration, predicted.filter(p => mapping[p.speaker] === segment.voice).reduce((sum, p) => sum + overlap(p, segment), 0));
  }
  const firstStarts = [...new Set(speech.map(segment => segment.turn))].map(turn => speech.find(segment => segment.turn === turn).start);
  const startErrors = firstStarts.map(start => Math.min(...predicted.map(p => Math.abs(p.start - start))));
  return {
    mapping, coverage: total ? covered / total : 0, accuracyWhenCovered: covered ? correct / covered : 0, attribution: total ? correct / total : 0,
    detectedSpeakers: labels.length, expectedSpeakers: voices.length, predictedSegments: predicted.length, speechIntervals: speech.length,
    meanStartErrorSeconds: startErrors.length && predicted.length ? startErrors.reduce((a, b) => a + b, 0) / startErrors.length : null,
    overlapSeconds: speech.reduce((sum, a, i) => sum + speech.slice(i + 1).reduce((inner, b) => inner + (a.voice === b.voice ? 0 : overlap(a, b)), 0), 0),
    speechSeconds: total,
  };
}

export function renderTimeline(duration, truth, predicted, mapping) {
  const left = 84;
  const width = 820;
  const rowHeight = 24;
  const voices = [...new Set(truth.map(segment => segment.voice))];
  const labels = [...new Set(predicted.map(segment => segment.speaker))];
  const rows = voices.length + labels.length;
  const canvas = createCanvas(width, 36 + rows * rowHeight + 30, colors.white);
  const x = seconds => left + Math.round((seconds / duration) * (width - left - 12));
  drawText(canvas, 'TRUTH', 8, 6, 2, colors.gray);
  voices.forEach((voice, row) => {
    drawText(canvas, voice, 8, 30 + row * rowHeight + 4, 2, colors.black);
    for (const segment of truth.filter(entry => entry.voice === voice)) fillRect(canvas, x(segment.start), 30 + row * rowHeight, Math.max(2, x(segment.end) - x(segment.start)), rowHeight - 4, voiceColors[voice] ?? colors.gray);
  });
  const base = 30 + voices.length * rowHeight + 18;
  drawText(canvas, 'MODEL', 8, base - 16, 2, colors.gray);
  labels.forEach((label, row) => {
    drawText(canvas, `${label}`, 8, base + row * rowHeight + 4, 2, colors.black);
    for (const segment of predicted.filter(entry => entry.speaker === label)) fillRect(canvas, x(segment.start), base + row * rowHeight, Math.max(2, x(segment.end) - x(segment.start)), rowHeight - 4, voiceColors[mapping[label]] ?? colors.gray);
  });
  const axis = base + labels.length * rowHeight + 4;
  fillRect(canvas, left, axis, width - left - 12, 1, colors.black);
  for (let tick = 0; tick <= duration; tick += 2) {
    fillRect(canvas, x(tick), axis, 1, 5, colors.black);
    drawText(canvas, `${tick}`, x(tick) - 2, axis + 9, 1, colors.black);
  }
  drawText(canvas, 'SEC', width - 30, axis + 9, 1, colors.gray);
  return canvas;
}

const pct = value => `${(100 * value).toFixed(0)}%`;
const second = value => Number(value.toFixed(2));

export const diarizationLab = {
  id: '35-diarization', title: 'Who spoke when', minutes: 12, series: 'genai',
  concept: 'Speech recognition says what was said. Diarization adds who said it and when, by grouping stretches of audio that sound like the same voice. Because we build the conversation ourselves, we know the right answer and can score the model.',
  question: 'When did the model attribute speech to the wrong person, and why is an interruption harder than taking turns?',
  caveat: 'Voices come from a synthetic speech model, there are only three, and each scenario was run once. Speaker labels such as A and B are arbitrary, so we match them to voices by overlap in time. Real meetings have background noise, similar voices, and more speakers.',
  exercise: 'Change the interruption overlap in scenarios (lib/genai/diarization-lab.mjs) from 2 seconds to 4 seconds and predict what happens to the attribution score.',
  cases: scenarios.map(scenario => ({ label: scenario.label, experiment: true })),
  async run(ctx) {
    const clips = {};
    const speechCalls = {};
    for (const utterance of utterances) {
      const speech = await ctx.azure.speech({ input: utterance.text, voice: utterance.voice, format: 'wav' });
      const parsed = parseWav(speech.audio);
      clips[utterance.id] = { voice: utterance.voice, text: utterance.text, samples: resampleLinear(trimSilence(parsed.samples, parsed.sampleRate), parsed.sampleRate, SAMPLE_RATE) };
      speechCalls[utterance.id] = speech.call;
    }
    let charged = false;
    for (const scenario of scenarios) {
      const started = performance.now();
      const { samples, truth, speech } = assembleConversation(clips, scenario);
      const wav = encodeWav(samples, SAMPLE_RATE);
      const duration = samples.length / SAMPLE_RATE;
      const diarized = await ctx.azure.diarize({ audio: { data: wav, mime: 'audio/wav', filename: `${scenario.id}.wav` } });
      const predicted = diarized.segments.filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end) && typeof segment.speaker === 'string')
        .map(segment => ({ speaker: segment.speaker, start: segment.start, end: segment.end, text: (segment.text ?? '').trim() }));
      const score = scoreDiarization(speech, predicted);
      const reference = truth.map(segment => segment.text).join(' ');
      const errors = wordErrorRate(reference, diarized.text ?? predicted.map(segment => segment.text).join(' '));
      const mixture = ctx.artifacts.add({ id: `${scenario.id}-audio`, extension: 'wav', data: wav, description: `${scenario.label}: ${second(duration)} seconds of 16 kHz mono audio assembled from synthetic speech turns.` });
      const timeline = ctx.artifacts.add({ id: `${scenario.id}-timeline`, extension: 'png', data: canvasToPng(renderTimeline(duration, speech, predicted, score.mapping)), description: `${scenario.label}: true speech by voice above, the model's diarization below, colored by the voice each label was matched to.` });
      const turnVoices = scenario.turns.map(turn => clips[turn]);
      // The one-time speech synthesis requests are charged to the first scenario so the totals stay honest.
      const calls = [...(charged ? [] : Object.values(speechCalls)), diarized.call];
      charged = true;
      ctx.addResult(experimentResult({
        label: scenario.label, startedAt: started, calls, artifacts: [mixture, timeline],
        summary: `Assemble ${scenario.turns.length} synthetic speech turns (${[...new Set(turnVoices.map(clip => clip.voice))].join(', ')}) into one recording${scenario.overlapSeconds ? `, with the second speaker starting ${scenario.overlapSeconds} seconds before the first finishes` : ''}. Find the stretches where each voice is really speaking, send only the audio to the diarization model, and compare its speaker timeline with ours.`,
        parameters: { turns: scenario.turns, overlapSeconds: scenario.overlapSeconds, gapSeconds: GAP_SECONDS, sampleRate: SAMPLE_RATE },
        output: `${score.expectedSpeakers} real speakers; the model found ${score.detectedSpeakers}.\nIt covered ${pct(score.coverage)} of the true speaking time, and ${pct(score.accuracyWhenCovered)} of that covered time went to the correct speaker (${pct(score.attribution)} of all speech correctly attributed).\nMean error in where each turn starts: ${score.meanStartErrorSeconds === null ? 'n/a' : `${score.meanStartErrorSeconds.toFixed(2)} s`}.\nTranscript word error rate: ${pct(errors.wer)}.`,
        measurements: { durationSeconds: second(duration), truth: truth.map(segment => ({ ...segment, start: second(segment.start), end: second(segment.end) })), speech: speech.map(segment => ({ ...segment, start: second(segment.start), end: second(segment.end) })), predicted: predicted.map(segment => ({ ...segment, start: second(segment.start), end: second(segment.end) })), score, errors, text: diarized.text ?? null },
        display: [
          audio(mixture, `${scenario.label} (${second(duration)} seconds). Listen for who is talking.`),
          image(timeline, 'Top rows: when each real voice is speaking. Bottom rows: the model. Colors show which real voice each model label was matched to.', `Speaker timeline for ${scenario.label}`),
          bars('Speech correctly attributed (higher is better)', [
            { label: 'Covered by any speaker', value: Number((100 * score.coverage).toFixed(1)), max: 100, detail: pct(score.coverage) },
            { label: 'Right speaker, when covered', value: Number((100 * score.accuracyWhenCovered).toFixed(1)), max: 100, detail: pct(score.accuracyWhenCovered) },
            { label: 'Overall correctly attributed', value: Number((100 * score.attribution).toFixed(1)), max: 100, detail: pct(score.attribution) },
          ]),
          table('Scores', ['Measurement', 'Value'], [
            ['Real speakers / speakers found', `${score.expectedSpeakers} / ${score.detectedSpeakers}`], ['True speaking time covered by the model', pct(score.coverage)],
            ['Right speaker, among covered time', pct(score.accuracyWhenCovered)], ['Overall correctly attributed', pct(score.attribution)],
            ['Mean error of turn start (s)', score.meanStartErrorSeconds === null ? 'n/a' : score.meanStartErrorSeconds.toFixed(2)],
            ['True overlap between different speakers (s)', score.overlapSeconds.toFixed(2)], ['Transcript word error rate', pct(errors.wer)],
            ['Label to voice matching', Object.entries(score.mapping).map(([label, voice]) => `${label} = ${voice ?? 'none'}`).join(', ')],
          ]),
          text('Truth is speech only: the pauses inside a turn are not counted, because the model also leaves them out. Labels such as A and B are arbitrary, so each is matched to the voice it overlaps most.'),
          table('The true turns', ['Voice', 'Start (s)', 'End (s)', 'Said'], truth.map(segment => [segment.voice, second(segment.start), second(segment.end), segment.text])),
          table('What the model returned', ['Label', 'Start (s)', 'End (s)', 'Heard'], predicted.map(segment => [segment.speaker, second(segment.start), second(segment.end), segment.text])),
        ],
      }));
    }
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [two, three, interruption] = results;
    const proportions = result => ['coverage', 'accuracyWhenCovered', 'attribution'].every(key => result.measurements.score[key] >= 0 && result.measurements.score[key] <= 1);
    return [
      check('Three conversations were assembled with known ground truth', results.length === 3 && results.every(result => result.measurements.truth.length >= 4 && result.measurements.speech.length >= result.measurements.truth.length && result.measurements.durationSeconds >= 8),
        results.map(result => `${result.measurements.truth.length} turns in ${result.measurements.speech.length} speech stretches, ${result.measurements.durationSeconds}s`).join('; ')),
      check('Only the interruption scenario contains true overlapping speech', two.measurements.score.overlapSeconds === 0 && three.measurements.score.overlapSeconds === 0 && interruption.measurements.score.overlapSeconds > 0.5,
        results.map(result => `${result.measurements.score.overlapSeconds.toFixed(2)}s overlap`).join(', ')),
      check('The model returned timed, labelled segments for every scenario', results.every(result => result.measurements.predicted.length >= 1 && result.measurements.predicted.every(segment => segment.end > segment.start)), results.map(result => `${result.measurements.predicted.length} segments`).join(', ')),
      check('Scores are valid proportions', results.every(result => proportions(result) && Number.isFinite(result.measurements.errors.wer)), results.map(result => `${pct(result.measurements.score.attribution)} overall`).join(', ')),
      check('The easy two-speaker case confirms the timeline alignment works', two.measurements.score.attribution >= 0.6, `Overall ${pct(two.measurements.score.attribution)} (a value near 50% would suggest misaligned time).`),
      check('Speaker counts are reported against the truth', results.every(result => result.measurements.score.detectedSpeakers >= 1), results.map(result => `${result.measurements.score.detectedSpeakers} of ${result.measurements.score.expectedSpeakers}`).join(', ')),
    ];
  },
};
