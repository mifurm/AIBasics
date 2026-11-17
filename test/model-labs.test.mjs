import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runGenaiLab } from '../lib/genai/runner.mjs';
import { genaiLabs } from '../lib/genai/index.mjs';
import {
  parseEvents, extractTokens, fitToBar, totalSlots, melodyFeatures, randomMelody, trainBigram, sampleBigram, synthesizeMelody, verifyRender,
  renderPianoRoll, copiedShare, tokenOf, frequencyOf, TOTAL_SLOTS,
} from '../lib/media/music.mjs';
import { corpusPhrases } from '../lib/genai/music-lab.mjs';
import { kendallScore, buildClips } from '../lib/genai/video-lab.mjs';
import { summarizeJudge, summarizeForced, tasks, truthPairs, equalPairs, truthChecks } from '../lib/genai/judge-lab.mjs';
import { decodePng } from '../lib/media/png.mjs';
import { canvasToPng } from '../lib/media/raster.mjs';
import { createFakeAzure, testConfig } from './helpers/fake-azure.mjs';

async function runWithFake(labId) {
  const directory = await mkdtemp(join(tmpdir(), 'genai-model-'));
  const root = new URL(`${pathToFileURL(directory).href}/`);
  try {
    const lab = genaiLabs.find(entry => entry.id === labId);
    await runGenaiLab(lab, { azure: createFakeAzure(), config: testConfig, log: () => {} }, root);
    return { saved: JSON.parse(await readFile(new URL(`${labId}.json`, root), 'utf8')), files: await readdir(new URL(`media/${labId}/`, root)).catch(() => []) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('melody tokens are parsed strictly, and invalid ones are reported rather than silently fixed', () => {
  assert.deepEqual(extractTokens('Here: C4:2, D4:2 x E4:4.'), ['C4:2', 'D4:2', 'E4:4']);
  const { events, rejected } = parseEvents(['C4:2', 'H9:2', 'D4:7', 'R:3', 'C5:1']);
  assert.deepEqual(events.map(tokenOf), ['C4:2', 'R:3', 'C5:1']);
  assert.deepEqual(rejected, ['H9:2', 'D4:7']);
  assert.ok(Math.abs(frequencyOf('A4') - 440) < 1e-9 && Math.abs(frequencyOf('C5') - 523.2511) < 1e-3);
});

test('fitting trims overlong melodies and pads short ones with rests, always to exactly 32 slots', () => {
  const long = Array.from({ length: 12 }, () => ({ pitch: 'C4', duration: 4 }));
  const cut = fitToBar(long);
  assert.equal(totalSlots(cut), TOTAL_SLOTS);
  assert.equal(cut.length, 8);
  const padded = fitToBar([{ pitch: 'C4', duration: 3 }]);
  assert.equal(totalSlots(padded), TOTAL_SLOTS);
  assert.ok(padded.slice(1).every(event => event.pitch === 'R' && event.duration <= 4));
  assert.equal(totalSlots(fitToBar([])), TOTAL_SLOTS);
});

test('melody features measure motion, range, repetition and the ending', () => {
  const steps = parseEvents(['C4:2', 'D4:2', 'E4:2', 'D4:2', 'C4:4'].concat(Array(5).fill('R:4'))).events;
  const features = melodyFeatures(steps);
  assert.equal(features.stepwiseRatio, 1);
  assert.equal(features.rangeSteps, 2);
  assert.equal(features.endsOnTonic, true);
  assert.ok(features.restShare > 0.5);
  const leaps = melodyFeatures(parseEvents(['C4:2', 'C5:2', 'C4:2', 'C5:2']).events);
  assert.deepEqual([leaps.leapRatio, leaps.stepwiseRatio, leaps.repetition > 0], [1, 0, true]);
});

test('seeded composers are reproducible, and the trained bigram model prefers stepwise motion over random notes', () => {
  assert.deepEqual(randomMelody(5), randomMelody(5));
  assert.notDeepEqual(randomMelody(5), randomMelody(6));
  const model = trainBigram(corpusPhrases);
  assert.deepEqual(sampleBigram(model, 0.7, 1), sampleBigram(model, 0.7, 1));
  assert.throws(() => sampleBigram(model, 0, 1));
  const mean = make => Array.from({ length: 40 }, (_, i) => melodyFeatures(make(i)).stepwiseRatio).reduce((a, b) => a + b, 0) / 40;
  assert.ok(mean(i => sampleBigram(model, 0.7, i)) > mean(i => randomMelody(i)) + 0.3);
  for (let seed = 0; seed < 20; seed++) assert.equal(totalSlots(sampleBigram(model, 1.6, seed)), TOTAL_SLOTS);
  assert.ok(corpusPhrases.every(phrase => totalSlots(phrase) === TOTAL_SLOTS));
});

test('copying from the training tunes is measured, and lower temperature copies more', () => {
  assert.equal(copiedShare(corpusPhrases[0], corpusPhrases), 1);
  assert.equal(copiedShare(randomMelody(3), corpusPhrases), 0);
  const model = trainBigram(corpusPhrases);
  const share = temperature => Array.from({ length: 40 }, (_, i) => copiedShare(sampleBigram(model, temperature, 900 + i), corpusPhrases)).reduce((a, b) => a + b, 0) / 40;
  assert.ok(share(0.5) > share(2.5));
});

test('synthesized audio is verified against the written notes, and a wrong note would be caught', () => {
  const events = parseEvents(['C4:2', 'E4:2', 'G4:4', 'R:2', 'C5:4', 'A4:1', 'B4:1', 'D4:2'].concat(Array(3).fill('R:4'))).events;
  const samples = synthesizeMelody(events);
  assert.equal(samples.length, totalSlots(events) * 4000);
  const good = verifyRender(samples, events);
  assert.equal(good.verified, good.checked);
  assert.ok(good.worstCents < 5);
  const wrong = verifyRender(samples, events.map(event => (event.pitch === 'E4' ? { ...event, pitch: 'F4' } : event)));
  assert.ok(wrong.verified < wrong.checked);
  assert.ok(decodePng(canvasToPng(renderPianoRoll(events))).width > 500);
});

test('lab 36 renders four melodies, verifies audio, and reports GPT-4o validity honestly', async () => {
  const { saved, files } = await runWithFake('36-music-tokens');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(files.length, 8);
  const gpt = saved.results[3].measurements;
  assert.equal(gpt.statistics.written, 5);
  assert.equal(gpt.statistics.exactlyValid, 3);
  assert.ok(gpt.attempts[2].rejected.includes('H9:2'));
  assert.equal(saved.results[0].apiCalls.length, 0);
  assert.equal(saved.results[3].apiCalls.length, 1);
});

test('frame ordering scores concordant pairs, and clips are deterministic', () => {
  assert.equal(kendallScore('ABCDEF', 'ABCDEF'), 1);
  assert.equal(kendallScore('FEDCBA', 'ABCDEF'), 0);
  assert.equal(kendallScore('BACDEF', 'ABCDEF'), 14 / 15);
  const a = buildClips();
  const b = buildClips();
  assert.ok(Object.keys(a).every(key => a[key].sheet.equals(b[key].sheet) && a[key].sheetPixelSha256 === b[key].sheetPixelSha256 && /^[a-f0-9]{64}$/.test(a[key].sheetPixelSha256)));
  assert.equal(a.shuffled.truth.order.length, 6);
  assert.notEqual(a.shuffled.truth.order, 'ABCDEF');
  assert.equal(a.twelve.frames.length, 12);
  assert.equal(a['wheel-sparse'].truth.apparent, 'counterclockwise');
});

test('lab 37 sends frames as separate images, scores both models, and shows token growth', async () => {
  const { saved, files } = await runWithFake('37-video-frames');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(files.length, 5);
  const [six, twelve, shuffled] = saved.results;
  assert.deepEqual(six.measurements.answers.map(entry => entry.correct), [1, 2]);
  assert.ok(twelve.measurements.tokenGrowth[0].twelve > twelve.measurements.tokenGrowth[0].six);
  assert.equal(shuffled.measurements.answers[1].rows[0].correct, true);
  assert.equal(shuffled.measurements.answers[0].rows[0].correct, false);
});

test('judge ground truth is independently verified, and every pair is balanced across positions', () => {
  for (const pair of truthPairs) {
    const check = truthChecks[pair.id];
    assert.ok(check.verify(), `${pair.id} arithmetic`);
    assert.ok(pair.correct.includes(check.marker) && !pair.wrong.includes(check.marker), `${pair.id} marker`);
    assert.ok(pair.longer === 'wrong' ? pair.wrong.length > pair.correct.length : pair.correct.length > pair.wrong.length, `${pair.id} length claim`);
  }
  assert.equal(truthPairs.filter(pair => pair.longer === 'wrong').length, 3);
  const list = tasks();
  assert.equal(list.length, 20);
  assert.equal(list.filter(task => task.slots[0] === 'correct').length, 6);
  for (const pair of [...truthPairs, ...equalPairs]) assert.equal(list.filter(task => task.pair === pair.id).length, 2);
  assert.equal(equalPairs.length, 4);
});

test('judge scorecards measure accuracy, verbosity bias, ties, and position bias', () => {
  const judgment = (pair, kind, winnerSlot, winnerContent, longer = null) => ({ pair, kind, winnerSlot, winnerContent, longer });
  const summary = summarizeJudge([
    judgment('a', 'truth', '1', 'correct', 'wrong'), judgment('a', 'truth', '1', 'wrong', 'wrong'),
    judgment('b', 'truth', '2', 'correct', 'correct'), judgment('b', 'truth', '1', 'correct', 'correct'),
    judgment('e', 'equal', 'tie', 'tie'), judgment('e', 'equal', 'tie', 'tie'),
  ]);
  assert.equal(summary.accuracy, 0.75);
  assert.equal(summary.truthConsistency, 0.5);
  assert.equal(summary.foolishWhenWrongIsLonger, 0.5);
  assert.equal(summary.accuracyWhenCorrectIsLonger, 1);
  assert.deepEqual([summary.equalTieRate, summary.equalFirstSlotShare, summary.equalConsistency], [1, null, 1]);
  const forced = summarizeForced([
    { pair: 'p', winnerSlot: '1', winnerContent: 'a' }, { pair: 'p', winnerSlot: '1', winnerContent: 'b' },
    { pair: 'q', winnerSlot: '1', winnerContent: 'a' }, { pair: 'q', winnerSlot: '2', winnerContent: 'a' },
  ]);
  assert.deepEqual([forced.firstSlotShare, forced.consistency, forced.sameSlotBothOrders], [0.75, 0.5, 0.5]);
});

test('lab 38 runs every judgment in both orders and records position bias under forced choice', async () => {
  const { saved } = await runWithFake('38-llm-judge');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(saved.results.length, 4);
  assert.deepEqual(saved.results.map(result => result.apiCalls.length), [20, 20, 16, 0]);
  assert.ok(saved.results[0].measurements.summary.foolishWhenWrongIsLonger > 0);
  assert.equal(saved.results[1].measurements.summary.accuracy, 1);
  assert.equal(saved.results[2].measurements.summaries['GPT-4o'].firstSlotShare, 1);
});
