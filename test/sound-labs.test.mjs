import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runGenaiLab } from '../lib/genai/runner.mjs';
import { genaiLabs } from '../lib/genai/index.mjs';
import { analyzeClip, speechText } from '../lib/genai/speech-lab.mjs';
import { scoreDiarization, speechIntervals, trimSilence, assembleConversation, renderTimeline, SAMPLE_RATE } from '../lib/genai/diarization-lab.mjs';
import { concatSamples, silence } from '../lib/media/wav.mjs';
import { decodePng } from '../lib/media/png.mjs';
import { canvasToPng } from '../lib/media/raster.mjs';
import { createFakeAzure, testConfig } from './helpers/fake-azure.mjs';

async function runWithFake(labId) {
  const directory = await mkdtemp(join(tmpdir(), 'genai-sound-'));
  const root = new URL(`${pathToFileURL(directory).href}/`);
  try {
    const lab = genaiLabs.find(entry => entry.id === labId);
    await runGenaiLab(lab, { azure: createFakeAzure(), config: testConfig, log: () => {} }, root);
    return { saved: JSON.parse(await readFile(new URL(`${labId}.json`, root), 'utf8')), files: await readdir(new URL(`media/${labId}/`, root)) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const tone = (hz, seconds, rate = SAMPLE_RATE) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => 0.6 * Math.sin((2 * Math.PI * hz * i) / rate));
const segment = (voice, start, end) => ({ voice, start, end });
const predicted = (speaker, start, end) => ({ speaker, start, end });

test('diarization scoring is invariant to arbitrary labels, and separates coverage from accuracy', () => {
  const truth = [segment('alloy', 0, 2), segment('onyx', 3, 5), segment('alloy', 6, 8)];
  const perfect = scoreDiarization(truth, [predicted('X', 0, 2), predicted('Y', 3, 5), predicted('X', 6, 8)]);
  assert.deepEqual([perfect.coverage, perfect.accuracyWhenCovered, perfect.attribution], [1, 1, 1]);
  assert.deepEqual(perfect.mapping, { X: 'alloy', Y: 'onyx' });
  const swapped = scoreDiarization(truth, [predicted('B', 0, 2), predicted('A', 3, 5), predicted('B', 6, 8)]);
  assert.equal(swapped.attribution, 1);
  const gaps = scoreDiarization(truth, [predicted('X', 0, 1), predicted('Y', 3, 5), predicted('X', 6, 7)]);
  assert.ok(Math.abs(gaps.coverage - 4 / 6) < 1e-9 && gaps.accuracyWhenCovered === 1);
  const oneWrong = scoreDiarization(truth, [predicted('X', 0, 2), predicted('Y', 3, 5), predicted('Y', 6, 8)]);
  assert.ok(Math.abs(oneWrong.accuracyWhenCovered - 4 / 6) < 1e-9 && oneWrong.coverage === 1);
});

test('diarization scoring exposes merged speakers and true overlap', () => {
  const truth = [segment('alloy', 0, 2), segment('onyx', 3, 5), segment('nova', 6, 8)];
  const merged = scoreDiarization(truth, [predicted('A', 0, 2), predicted('A', 3, 5), predicted('B', 6, 8)]);
  assert.deepEqual([merged.detectedSpeakers, merged.expectedSpeakers], [2, 3]);
  assert.ok(Math.abs(merged.attribution - 4 / 6) < 1e-9);
  const overlap = scoreDiarization([segment('alloy', 0, 3), segment('onyx', 2, 5)], [predicted('A', 0, 3), predicted('B', 3, 5)]);
  assert.equal(overlap.overlapSeconds, 1);
  assert.ok(overlap.attribution < 1 && overlap.attribution > 0.7);
  assert.equal(scoreDiarization([segment('alloy', 0, 1)], []).coverage, 0);
  assert.equal(scoreDiarization([segment('alloy', 0, 1)], []).meanStartErrorSeconds, null);
});

test('speech intervals ignore pauses, trimming keeps padding, and conversations are assembled with known timing', () => {
  const clip = concatSamples([silence(0.3, SAMPLE_RATE), tone(150, 1, SAMPLE_RATE), silence(0.6, SAMPLE_RATE), tone(150, 1, SAMPLE_RATE), silence(0.3, SAMPLE_RATE)]);
  const intervals = speechIntervals(clip, SAMPLE_RATE);
  assert.equal(intervals.length, 2);
  assert.ok(Math.abs(intervals[0].start - 0.3) < 0.04 && Math.abs(intervals[1].start - 1.9) < 0.04);
  assert.equal(speechIntervals(concatSamples([tone(150, 1), silence(0.1, SAMPLE_RATE), tone(150, 1)]), SAMPLE_RATE).length, 1);
  assert.equal(speechIntervals(new Float32Array(1000), SAMPLE_RATE).length, 0);
  const trimmed = trimSilence(clip, SAMPLE_RATE);
  assert.ok(Math.abs(trimmed.length / SAMPLE_RATE - (2.6 + 0.08)) < 0.06);
  assert.throws(() => trimSilence(new Float32Array(10), SAMPLE_RATE), /silent/);
  const clips = { a: { voice: 'alloy', text: 'x', samples: tone(150, 2) }, b: { voice: 'onyx', text: 'y', samples: tone(220, 2) } };
  const sequential = assembleConversation(clips, { turns: ['a', 'b'], overlapSeconds: 0 });
  assert.deepEqual(sequential.truth.map(turn => [turn.start, turn.end]), [[0, 2], [2.6, 4.6]]);
  const interrupted = assembleConversation(clips, { turns: ['a', 'b'], overlapSeconds: 1 });
  assert.deepEqual(interrupted.truth[1].start, 1);
  assert.ok(scoreDiarization(interrupted.speech, []).overlapSeconds > 0.9);
  assert.ok(Math.max(...interrupted.samples.map(Math.abs)) <= 0.9501);
  const timeline = decodePng(canvasToPng(renderTimeline(5, sequential.speech, [predicted('A', 0, 2), predicted('B', 2.6, 4.6)], { A: 'alloy', B: 'onyx' })));
  assert.ok(timeline.width > 500 && timeline.height > 100);
});

test('clip analysis reports measured level, duration, speaking rate and pitch', () => {
  const clip = analyzeClip(tone(150, 3, 24000), 24000, speechText);
  assert.equal(clip.durationSeconds, 3);
  assert.ok(Math.abs(clip.pitchHz - 150) < 3);
  assert.equal(clip.wordsPerSecond, 6);
  assert.ok(clip.rmsDbfs < -3 && clip.rmsDbfs > -9);
});

test('lab 34 runs six conditions, measuring speed, noise, errors and artifacts', async () => {
  const { saved, files } = await runWithFake('34-speech-roundtrip');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(files.length, 12);
  assert.ok(saved.results[1].measurements.clip.durationSeconds < saved.results[0].measurements.clip.durationSeconds);
  assert.equal(saved.results[0].measurements.errors.wer, 0);
  assert.ok(saved.results[5].measurements.errors.wer > 0.5);
  assert.equal(saved.results[3].apiCalls.length, 1);
  assert.equal(saved.results[0].apiCalls.length, 2);
});

test('lab 35 scores three conversations against known timelines and charges synthesis once', async () => {
  const { saved, files } = await runWithFake('35-diarization');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(files.length, 6);
  assert.deepEqual(saved.results.map(result => result.apiCalls.length), [7, 1, 1]);
  assert.ok(saved.results[0].measurements.score.attribution > 0.8);
  assert.ok(saved.results[2].measurements.score.overlapSeconds > 0.5);
  assert.equal(saved.results[1].measurements.score.detectedSpeakers, 3);
});
