import { parseWav, encodeWav, addNoiseAtSnr, estimatePitch, rms, peakAmplitude, silenceRatio, spectrogramCanvas } from '../media/wav.mjs';
import { canvasToPng } from '../media/raster.mjs';
import { wordErrorRate, normalizeWords } from '../media/text-metrics.mjs';
import { mulberry32 } from '../media/random.mjs';
import { experimentResult, table, image, audio, text, bars } from './contract.mjs';

export const speechText = 'The robot club meets on Tuesday at four in the afternoon. Please bring three notebooks and a pencil.';
export const speechVariants = [
  { id: 'alloy-normal', label: 'Voice alloy, normal speed', voice: 'alloy', speed: 1 },
  { id: 'alloy-fast', label: 'Voice alloy, 1.5 times faster', voice: 'alloy', speed: 1.5 },
  { id: 'onyx-normal', label: 'Voice onyx, normal speed', voice: 'onyx', speed: 1 },
  { id: 'noise-10', label: 'Alloy with noise at 10 dB signal-to-noise', snr: 10 },
  { id: 'noise-0', label: 'Alloy with noise at 0 dB signal-to-noise', snr: 0 },
  { id: 'noise-minus-10', label: 'Alloy with noise at -10 dB signal-to-noise', snr: -10 },
];

const fixed = (value, digits = 2) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
const pct = value => `${(100 * value).toFixed(0)}%`;

export function analyzeClip(samples, sampleRate, reference) {
  const level = rms(samples);
  const pitch = estimatePitch(samples, sampleRate, { minHz: 70, maxHz: 350 });
  const durationSeconds = samples.length / sampleRate;
  return {
    sampleRate, samples: samples.length, durationSeconds: fixed(durationSeconds, 3), peak: fixed(peakAmplitude(samples), 3),
    rmsDbfs: fixed(20 * Math.log10(level || 1e-9), 1), silenceRatio: fixed(silenceRatio(samples, sampleRate), 3),
    wordsPerSecond: fixed(normalizeWords(reference).length / durationSeconds, 2),
    pitchHz: fixed(pitch.medianHz, 1), voicedFrames: pitch.voicedFrames,
  };
}

function spectrogramFor(ctx, id, samples, sampleRate, description) {
  const canvas = spectrogramCanvas(samples, sampleRate, { windowSize: 512, hop: 256, maxHz: 8000 });
  return ctx.artifacts.add({ id, extension: 'png', data: canvasToPng(canvas), description });
}

export const speechLab = {
  id: '34-speech-roundtrip', title: 'Sound is samples: speech out, speech in', minutes: 12, series: 'genai',
  concept: 'Sound is a long list of numbers: amplitude samples taken many thousand times per second. A text-to-speech model generates them, a speech-recognition model turns them back into words, and the round trip lets us measure how much survives.',
  question: 'What happened to the transcript as the noise grew louder, and what does that say about trusting speech recognition on a noisy recording?',
  caveat: 'The speech is synthetic, one sentence, one run per condition. White noise is a simplified model of real noise; real recordings add accents, music, echo, and overlapping talkers. Pitch and speaking-rate numbers are rough signal measurements.',
  exercise: 'Change speechText in lib/genai/speech-lab.mjs to a sentence with a rare name or number, redeploy, and see which words the recognizer gets wrong.',
  cases: speechVariants.map(variant => ({ label: variant.label, experiment: true })),
  async run(ctx) {
    let cleanSamples;
    let cleanRate;
    for (const variant of speechVariants) {
      const started = performance.now();
      const calls = [];
      let wav;
      let samples;
      let sampleRate;
      let noise = null;
      if (variant.voice) {
        const speech = await ctx.azure.speech({ input: speechText, voice: variant.voice, speed: variant.speed, format: 'wav' });
        calls.push(speech.call);
        const parsed = parseWav(speech.audio);
        if (parsed.channels !== 1 || parsed.durationSeconds < 1) throw new Error('Unexpected speech audio format.');
        ({ samples, sampleRate } = parsed);
        wav = encodeWav(samples, sampleRate);
        if (variant.id === 'alloy-normal') [cleanSamples, cleanRate] = [samples, sampleRate];
      } else {
        const noisy = addNoiseAtSnr(cleanSamples, variant.snr, mulberry32(7000 + variant.snr + 20));
        samples = noisy.samples;
        sampleRate = cleanRate;
        noise = { targetSnrDb: variant.snr, measuredSnrDb: fixed(noisy.measuredSnrDb, 2) };
        wav = encodeWav(samples, sampleRate);
      }
      const clip = analyzeClip(samples, sampleRate, speechText);
      const heard = await ctx.azure.transcribe({ audio: { data: wav, mime: 'audio/wav', filename: `${variant.id}.wav` }, language: 'en' });
      calls.push(heard.call);
      const errors = wordErrorRate(speechText, heard.text);
      const confidence = {
        segments: heard.segments.length,
        meanAvgLogprob: heard.segments.length ? fixed(heard.segments.reduce((sum, segment) => sum + segment.avg_logprob, 0) / heard.segments.length, 3) : null,
        maxNoSpeechProbability: heard.segments.length ? fixed(Math.max(...heard.segments.map(segment => segment.no_speech_prob)), 3) : null,
      };
      const wavArtifact = ctx.artifacts.add({ id: `${variant.id}-audio`, extension: 'wav', data: wav, description: `${variant.label}: ${clip.durationSeconds} seconds of ${sampleRate} Hz mono 16-bit audio.` });
      const spectrogram = spectrogramFor(ctx, `${variant.id}-spectrogram`, samples, sampleRate, `Spectrogram of ${variant.label}: time runs left to right, frequency from 0 to 8 kHz bottom to top, brighter means more energy.`);
      ctx.addResult(experimentResult({
        label: variant.label, startedAt: started, calls, artifacts: [wavArtifact, spectrogram],
        summary: variant.voice ? `Synthesize "${speechText}" with the ${variant.voice} voice at speed ${variant.speed}, then transcribe the audio with Whisper (language hint: English).` :
          `Take the clean alloy recording, add seeded white noise so the signal is ${variant.snr} dB above the noise, then transcribe the noisy audio with Whisper (language hint: English).`,
        parameters: variant.voice ? { voice: variant.voice, speed: variant.speed, format: 'wav' } : { snrDb: variant.snr },
        output: `${clip.durationSeconds} s of audio, ${clip.wordsPerSecond} words/s.${noise ? ` Measured signal-to-noise ratio ${noise.measuredSnrDb} dB.` : ''}\nHeard: "${heard.text.trim()}"\nWord error rate ${pct(errors.wer)} (${errors.substitutions} substituted, ${errors.deletions} missed, ${errors.insertions} extra of ${errors.referenceWords} words).`,
        measurements: { clip, noise, transcript: heard.text, errors, confidence, whisperDuration: heard.duration ?? null, reference: speechText },
        display: [
          audio(wavArtifact, `${variant.label}. Press play to hear exactly what Whisper received.`),
          image(spectrogram, 'Spectrogram: time left to right, frequency 0 to 8 kHz bottom to top, brighter means more energy. Speech shows as bursts; noise fills the background.', `Spectrogram of ${variant.label}`),
          bars('Word error rate (lower is better)', [{ label: 'Whisper transcript', value: Number((100 * errors.wer).toFixed(1)), max: 100, detail: pct(errors.wer) }]),
          table('Measurements from the samples', ['Measurement', 'Value'], [
            ['Sample rate (Hz)', clip.sampleRate], ['Duration (s)', clip.durationSeconds], ['Words per second', clip.wordsPerSecond],
            ['Peak amplitude (0 to 1)', clip.peak], ['Average level (dBFS)', clip.rmsDbfs], ['Share of near-silent time', clip.silenceRatio],
            ['Median pitch (Hz), voiced frames', clip.pitchHz === null ? 'not detected' : `${clip.pitchHz} (${clip.voicedFrames} frames)`],
            ...(noise ? [['Requested / measured signal-to-noise (dB)', `${noise.targetSnrDb} / ${noise.measuredSnrDb}`]] : []),
          ]),
          table('What Whisper heard', ['Reference sentence', 'Transcript', 'Substituted', 'Missed', 'Extra'], [[speechText, heard.text.trim() || '(empty transcript)', errors.substitutions, errors.deletions, errors.insertions]]),
          text(`Whisper's own confidence signals: ${confidence.segments} segment(s), mean average log probability ${confidence.meanAvgLogprob ?? 'n/a'}, highest no-speech probability ${confidence.maxNoSpeechProbability ?? 'n/a'}. These are model-reported hints, not guarantees.`),
        ],
      }));
    }
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const byId = Object.fromEntries(speechVariants.map((variant, index) => [variant.id, results[index]]));
    const clean = ['alloy-normal', 'alloy-fast', 'onyx-normal'].map(id => byId[id]);
    const noisy = ['noise-10', 'noise-0', 'noise-minus-10'].map(id => byId[id]);
    const ratio = byId['alloy-fast'].measurements.clip.durationSeconds / byId['alloy-normal'].measurements.clip.durationSeconds;
    return [
      check('Six recordings were measured and transcribed', results.length === 6 && results.every(result => typeof result.measurements.transcript === 'string' && result.artifacts.length === 2), '6 audio files, 6 spectrograms, 6 transcripts.'),
      check('Synthesized audio is real mono 16-bit speech of plausible length', clean.every(result => result.measurements.clip.sampleRate >= 16000 && result.measurements.clip.durationSeconds > 2 && result.measurements.clip.durationSeconds < 20 && result.measurements.clip.peak > 0.05),
        clean.map(result => `${result.measurements.clip.durationSeconds}s at ${result.measurements.clip.sampleRate} Hz`).join(', ')),
      check('Asking for 1.5 times speed shortens the audio by roughly that factor', ratio > 0.55 && ratio < 0.8, `Duration ratio ${ratio.toFixed(2)} (ideal 0.67).`),
      check('Clean speech is recognized almost perfectly', clean.every(result => result.measurements.errors.wer <= 0.25), clean.map(result => pct(result.measurements.errors.wer)).join(', ')),
      check('Noise was added at the requested signal-to-noise ratios', noisy.every(result => Math.abs(result.measurements.noise.measuredSnrDb - result.measurements.noise.targetSnrDb) < 0.5), noisy.map(result => `${result.measurements.noise.targetSnrDb} dB -> ${result.measurements.noise.measuredSnrDb} dB`).join(', ')),
      check('Noisy-speech error rates are reported, not assumed', noisy.every(result => Number.isFinite(result.measurements.errors.wer)), noisy.map(result => `${result.measurements.noise.targetSnrDb} dB: ${pct(result.measurements.errors.wer)}`).join(', ')),
      check('Pitch is measured for both voices', ['alloy-normal', 'onyx-normal'].every(id => Number.isFinite(byId[id].measurements.clip.pitchHz)), `alloy ${byId['alloy-normal'].measurements.clip.pitchHz} Hz, onyx ${byId['onyx-normal'].measurements.clip.pitchHz} Hz`),
    ];
  },
};
