import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runGenaiLab } from '../lib/genai/runner.mjs';
import { createArtifactStore, sha256 } from '../lib/genai/artifacts.mjs';
import { assertExperimentResult, experimentResult, image, bars, table, text } from '../lib/genai/contract.mjs';
import { genaiLabs } from '../lib/genai/index.mjs';
import { trainBpe, segmentWord, bpeCorpus } from '../lib/genai/tokenization-lab.mjs';
import { applyTemperature, distributionFromLogprobs, distanceToPrediction, empiricalFrequencies } from '../lib/genai/logprobs-lab.mjs';
import { createFakeAzure, testConfig } from './helpers/fake-azure.mjs';
import { encodePng, decodePng } from '../lib/media/png.mjs';
import { createCanvas, fillCircle, fillRect, canvasToPng, colors } from '../lib/media/raster.mjs';
import { mulberry32 } from '../lib/media/random.mjs';
import { analyzeColorLayout, layoutChecks, c2paLabels } from '../lib/media/color-layout.mjs';
import { galleryCopy, STORE_LIMIT_BYTES } from '../lib/genai/image-generation-lab.mjs';
import { buildScenes } from '../lib/genai/vision-lab.mjs';
import { ballPositions, crossingFrame, apparentWheelMotion } from '../lib/media/scenes.mjs';
import { createAzureClient, send } from '../lib/genai/azure-client.mjs';
import { AzureRequestError } from '../lib/azure.mjs';
import { selectLabs } from '../lib/selection.mjs';

async function runWithFake(labId, azure = createFakeAzure()) {
  const directory = await mkdtemp(join(tmpdir(), 'genai-lab-'));
  const root = new URL(`${pathToFileURL(directory).href}/`);
  try {
    const lab = genaiLabs.find(entry => entry.id === labId);
    const record = await runGenaiLab(lab, { azure, config: testConfig, log: () => {} }, root);
    const saved = JSON.parse(await readFile(new URL(`${labId}.json`, root), 'utf8'));
    const files = await readdir(new URL(`media/${labId}/`, root)).catch(() => []);
    return { record, saved, files, root };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('artifact store validates identifiers, signatures, descriptions and size, and hashes bytes', () => {
  const store = createArtifactStore('99-test');
  const png = encodePng({ width: 1, height: 1, data: Uint8Array.of(1, 2, 3, 255), channels: 4 });
  const ref = store.add({ id: 'one', extension: 'png', data: png, description: 'A pixel' });
  assert.equal(ref.file, 'one.png');
  assert.equal(ref.bytes, png.length);
  assert.match(ref.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => store.add({ id: 'one', extension: 'png', data: png, description: 'dup' }), /Duplicate/);
  assert.throws(() => store.add({ id: 'Bad_Id', extension: 'png', data: png, description: 'x' }), /Invalid artifact id/);
  assert.throws(() => store.add({ id: 'fake', extension: 'png', data: Buffer.from('not a png'), description: 'x' }), /not a valid PNG/);
  assert.throws(() => store.add({ id: 'exe', extension: 'exe', data: png, description: 'x' }), /Unsupported/);
  assert.throws(() => store.add({ id: 'nodesc', extension: 'png', data: png, description: ' ' }), /description/);
  assert.throws(() => store.add({ id: 'svg', extension: 'svg', data: Buffer.from('<html></html>'), description: 'x' }), /not a valid SVG/);
});

test('result contract rejects unreferenced artifacts, wrong media types, ragged tables and call-count lies', () => {
  const store = createArtifactStore('99-test');
  const png = store.add({ id: 'pic', extension: 'png', data: encodePng({ width: 1, height: 1, data: Uint8Array.of(1, 2, 3, 255), channels: 4 }), description: 'pic' });
  const base = () => experimentResult({ label: 'ok', summary: 's', output: 'o', startedAt: performance.now(), artifacts: [png], display: [image(png, 'c'), table('t', ['a'], [[1]]), bars('b', [{ label: 'x', value: 1, max: 2 }]), text('t')] });
  assert.doesNotThrow(() => assertExperimentResult(base(), store));
  assert.throws(() => assertExperimentResult({ ...base(), display: [{ type: 'audio', artifact: 'pic' }] }, store), /image\/png/);
  assert.throws(() => assertExperimentResult({ ...base(), display: [{ type: 'image', artifact: 'missing' }] }, store), /unknown artifact/);
  assert.throws(() => assertExperimentResult({ ...base(), display: [table('t', ['a', 'b'], [[1]])] }, store), /table rows/);
  assert.throws(() => assertExperimentResult({ ...base(), apiRequests: 3 }, store), /apiRequests/);
  assert.throws(() => assertExperimentResult({ ...base(), output: '  ' }, store), /output/);
  assert.throws(() => assertExperimentResult({ ...base(), display: [{ type: 'script', text: 'x' }] }, store), /unknown display block/);
  assert.throws(() => assertExperimentResult({ ...base(), artifacts: [{ ...png, sha256: '0'.repeat(64) }] }, store), /hash mismatch/);
});

test('Azure client retries a rate limit using Retry-After, then surfaces a persistent failure', async t => {
  const waits = [];
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    attempts++;
    return attempts < 3 ? new Response('{}', { status: 429, headers: { 'Retry-After': '8' } }) : new Response('{"ok":true}', { status: 200 });
  });
  const { response, attempts: used, waitedMs } = await send('https://example.invalid/', { method: 'POST' }, { wait: async ms => waits.push(ms) });
  assert.equal(response.status, 200);
  assert.deepEqual([used, waits, waitedMs], [3, [9000, 9000], 18000]);
  attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => new Response('{"error":{"code":"RateLimitReached","message":"slow down"}}', { status: 429, headers: { 'Retry-After': '1' } }));
  const client = createAzureClient({ endpoint: 'https://example.invalid/', standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini' }, 'token', { attempts: 2, wait: async () => {} });
  await assert.rejects(client.speech({ input: 'x', voice: 'alloy' }), error => error.status === 429 && error.azureCode === 'RateLimitReached');
});

test('Azure client builds the real request shapes and validates what comes back', async t => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push({ url: String(url), method: init.method, body: init.body });
    const path = new URL(url).pathname;
    if (path.endsWith('/images/generations')) return new Response(JSON.stringify({ data: [{ b64_json: encodePng({ width: 1, height: 1, data: Uint8Array.of(1, 2, 3, 255), channels: 4 }).toString('base64') }], usage: { total_tokens: 5 } }), { status: 200 });
    if (path.endsWith('/audio/speech')) return new Response(Buffer.from('RIFF'), { status: 200, headers: { 'Content-Type': 'audio/wav' } });
    if (path.endsWith('/audio/transcriptions')) return new Response(JSON.stringify({ text: 'hello', duration: 1.5, segments: [] }), { status: 200 });
    if (path.endsWith('/embeddings')) return new Response(JSON.stringify({ data: [{ index: 1, embedding: [2] }, { index: 0, embedding: [1] }], usage: { prompt_tokens: 2, total_tokens: 2 }, model: 'm' }), { status: 200 });
    return new Response('{}', { status: 404 });
  });
  const client = createAzureClient({ endpoint: 'https://example.invalid/', standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini' }, 'token');
  const generated = await client.image({ prompt: 'p' });
  assert.equal(generated.png.subarray(1, 4).toString(), 'PNG');
  assert.match(seen[0].url, /deployments\/gpt-image-1\.5\/images\/generations\?api-version=2025-04-01-preview/);
  assert.equal(JSON.parse(seen[0].body).output_format, 'png');
  assert.equal((await client.speech({ input: 'hi', voice: 'alloy', speed: 1.5 })).audio.toString(), 'RIFF');
  assert.match(seen[1].url, /\/openai\/v1\/audio\/speech$/);
  assert.deepEqual([JSON.parse(seen[1].body).model, JSON.parse(seen[1].body).speed], ['tts', 1.5]);
  const transcript = await client.transcribe({ audio: { data: Buffer.from('x') } });
  assert.equal(transcript.text, 'hello');
  assert.match(seen[2].url, /whisper\/audio\/transcriptions\?api-version=2024-10-21/);
  assert.equal(seen[2].body.get('response_format'), 'verbose_json');
  assert.deepEqual((await client.embed(['a', 'b'])).vectors, [[1], [2]]);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [1] }] }), { status: 200 }));
  await assert.rejects(client.embed(['a', 'b']), /incomplete/);
});

test('byte-pair encoding is deterministic, merges most frequent pairs first, and reconstructs words', () => {
  const trained = trainBpe(bpeCorpus, 18);
  assert.equal(trained.merges.length, 18);
  assert.deepEqual(trainBpe(bpeCorpus, 18).merges, trained.merges);
  assert.ok(trained.merges.every((merge, index) => index === 0 || merge.count <= trained.merges[index - 1].count));
  for (const word of Object.keys(bpeCorpus)) assert.equal(segmentWord(word, trained.merges).join(''), `${word}</w>`);
  assert.ok(segmentWord('robots', trained.merges).length < 'robots'.length + 1);
  assert.equal(segmentWord('zzz', trained.merges).join(''), 'zzz</w>');
  assert.deepEqual(trainBpe({ aa: 1 }, 5).merges.map(merge => merge.symbol), ['a</w>', 'aa</w>']);
});

test('temperature mathematics: power-law reshaping, normalization, and prediction-versus-sample distance', () => {
  const probabilities = [0.6, 0.3, 0.1];
  const sharp = applyTemperature(probabilities, 0.5);
  assert.ok(Math.abs(sharp.reduce((a, b) => a + b, 0) - 1) < 1e-12 && sharp[0] > 0.6);
  assert.deepEqual(applyTemperature(probabilities, 1).map(value => Number(value.toFixed(12))), probabilities);
  assert.ok(applyTemperature(probabilities, 3)[0] < 0.6);
  assert.throws(() => applyTemperature(probabilities, 0));
  const distribution = distributionFromLogprobs([{ token: 'b', logprob: Math.log(0.25) }, { token: 'a', logprob: Math.log(0.5) }]);
  assert.equal(distribution.tokens[0].token, 'a');
  assert.ok(Math.abs(distribution.coveredMass - 0.75) < 1e-12);
  const empirical = empiricalFrequencies(['a', 'a', 'b', 'z'], ['a', 'b']);
  assert.deepEqual([empirical.frequencies, empirical.outside], [[0.5, 0.25], 0.25]);
  assert.equal(distanceToPrediction([0.5, 0.25], empirical), 0.125);
});

test('lab 29 measures calibrated token counts and survives a full run with persisted records', async () => {
  const { record, saved, files } = await runWithFake('29-tokenization');
  assert.equal(record.results.length, 4);
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.equal(saved.results[1].measurements.overheadTokens, 7);
  assert.equal(saved.results[3].measurements.overheadTokens, 9);
  assert.ok(saved.results[1].apiCalls.length === 9 && saved.results[3].apiCalls.length === 9);
  assert.equal(files.length, 0);
});

test('lab 30 predicts then samples temperature effects, and records the reasoning-model refusal', async () => {
  const { saved } = await runWithFake('30-logprobs');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  const sweep = saved.results[1].measurements.sweep;
  assert.deepEqual(sweep.map(row => row.samples), [100, 100, 100]);
  assert.ok(sweep[1].distance < 0.25, `T=1 sampled distribution should match raw probabilities (${sweep[1].distance})`);
  assert.equal(saved.results[2].measurements.outcome.accepted, false);
  assert.equal(saved.results[2].measurements.outcome.code, 'unsupported_parameter');
});

test('lab 30 records only Azure\'s documented logprobs refusal; throttling and other failures fail the run', async () => {
  const lab = genaiLabs.find(entry => entry.id === '30-logprobs');
  for (const [status, code] of [[429, 'RateLimitReached'], [401, 'PermissionDenied'], [400, 'content_filter']]) {
    const azure = createFakeAzure();
    const original = azure.chat;
    azure.chat = async request => {
      if (request.model === 'gpt-5-mini') throw new AzureRequestError(status, { code, message: 'simulated' });
      return original(request);
    };
    const directory = await mkdtemp(join(tmpdir(), 'genai-refusal-'));
    const root = new URL(`${pathToFileURL(directory).href}/`);
    try {
      await assert.rejects(runGenaiLab(lab, { azure, config: testConfig, log: () => {} }, root), error => error.status === status && error.azureCode === code);
      const saved = JSON.parse(await readFile(new URL(`${lab.id}.json`, root), 'utf8'));
      assert.equal(saved.status, 'failed');
      assert.equal(saved.results.length, 2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('lab 30 checks fail when samples do not follow temperature or the refusal is not the documented one', async () => {
  const { saved } = await runWithFake('30-logprobs');
  const lab = genaiLabs.find(entry => entry.id === '30-logprobs');
  const failed = results => lab.evaluate(results).filter(check => !check.passed).map(check => check.name);
  assert.deepEqual(failed(saved.results), []);
  const flat = structuredClone(saved.results);
  flat[1].measurements.sweep[0].empirical = flat[1].measurements.sweep[2].empirical;
  assert.deepEqual(failed(flat), ['Real samples are more concentrated at low temperature than at high temperature']);
  const offTarget = structuredClone(saved.results);
  offTarget[1].measurements.sweep[1].distance = 0.6;
  assert.deepEqual(failed(offTarget), ['Samples at temperature 1 match the reported probabilities']);
  const throttled = structuredClone(saved.results);
  throttled[2].measurements.outcome = { accepted: false, status: 429, code: 'RateLimitReached', message: 'slow down' };
  assert.deepEqual(failed(throttled), ['The reasoning-model outcome is a real acceptance or Azure\'s documented refusal, not an unrelated failure']);
});

test('lab 31 writes a valid SVG map and finds topic, translation and meaning structure', async () => {
  const { saved, files } = await runWithFake('31-embedding-space');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.deepEqual(files, ['sentence-map.svg']);
  assert.equal(saved.artifacts[0].mime, 'image/svg+xml');
  assert.equal(saved.results[0].measurements.dimension, 1536);
  assert.equal(saved.results[3].measurements.dimension, 256);
});

test('lab 32 measures what generated images contain, compares samples, and stores each artifact', async () => {
  const { saved, files } = await runWithFake('32-image-generation');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.deepEqual(files.sort(), ['specific-sample-one.png', 'specific-sample-two.png', 'vague-sample.png']);
  assert.ok(saved.results[0].measurements.checks.every(item => item.passed));
  assert.ok(saved.results[1].measurements.comparison.differingPixels > 0 && saved.results[1].measurements.comparison.identicalBytes === false);
  assert.equal(saved.results[2].measurements.checks.length, 0);
  assert.equal(saved.results[0].measurements.provenance, null);
  assert.ok(saved.results[0].display.some(block => block.type === 'image'));
});

test('image layout analysis catches a wrongly placed shape, and oversized images get a smaller gallery copy', () => {
  const swapped = createCanvas(256, 256);
  fillCircle(swapped, 190, 128, 40, colors.red);
  fillRect(swapped, 30, 90, 80, 80, colors.blue);
  const checks = layoutChecks(analyzeColorLayout(decodePng(canvasToPng(swapped))));
  assert.deepEqual(checks.map(item => item.passed), [true, true, false, false, true, true]);
  const random = mulberry32(5);
  const noisy = encodePng({ width: 1024, height: 1024, data: Uint8Array.from({ length: 1024 * 1024 * 3 }, () => Math.floor(random() * 256)), channels: 3 });
  assert.ok(noisy.length > STORE_LIMIT_BYTES);
  const copy = galleryCopy(noisy, decodePng(noisy));
  assert.equal(copy.downscaled, true);
  assert.equal(decodePng(copy.data).width, 512);
  const small = canvasToPng(swapped);
  assert.deepEqual([galleryCopy(small, decodePng(small)).downscaled, galleryCopy(small, decodePng(small)).data.equals(small)], [false, true]);
  assert.deepEqual(c2paLabels(Buffer.from('xxurn:c2pa:4cecbff0-50e6-4d7c-85c7-f8c1de49b0b7yy c2pa.assertions c2pa.actions.v2')), ['urn:c2pa:4cecbff0-50e6-4d7c-85c7-f8c1de49b0b7', 'c2pa.assertions', 'c2pa.actions.v2']);
});

test('lab 33 scores each field against exactly regenerated ground truth and measures image cost', async () => {
  const { saved, files } = await runWithFake('33-vision');
  assert.ok(saved.observations.every(check => check.passed), JSON.stringify(saved.observations.filter(check => !check.passed)));
  assert.deepEqual(files.sort(), ['bar-chart.png', 'shapes-scene.png', 'text-sample.png']);
  const shapes = saved.results[0].measurements.answers[0];
  assert.deepEqual(shapes.rows.map(row => row.correct), [false, true, true]);
  const low = saved.results[2].measurements.answers[0];
  const high = saved.results[3].measurements.answers[0];
  assert.deepEqual([low.rows[1].correct, high.rows[1].correct], [false, true]);
  assert.ok(low.promptTokens < high.promptTokens);
  assert.equal(saved.results[2].artifacts[0].id, saved.results[3].artifacts[0].id);
});

test('scene ground truth is deterministic and visible in the rendered pixels', () => {
  const first = buildScenes();
  const second = buildScenes();
  assert.ok(first.shapes.png.equals(second.shapes.png) && first.text.png.equals(second.text.png));
  assert.ok(Object.keys(first).every(key => first[key].pixelSha256 === second[key].pixelSha256 && first[key].pixelSha256 === sha256(Buffer.from(decodePng(first[key].png).data))));
  assert.deepEqual(first.shapes.truth, { red_circles: 6, blue_squares: 4, green_triangles: 4 });
  assert.equal(first.chart.truth.tallest_bar, 'B');
  const decoded = decodePng(first.shapes.png);
  assert.deepEqual([decoded.width, decoded.height], [512, 512]);
  assert.deepEqual([crossingFrame(ballPositions(6, 'right_to_left'), 'right_to_left'), crossingFrame(ballPositions(6, 'left_to_right'), 'left_to_right')], [4, 4]);
  assert.deepEqual([20, 60, 100, 120].map(degrees => apparentWheelMotion(degrees).direction), ['clockwise', 'ambiguous', 'counterclockwise', 'stationary']);
});

test('ground-truth integrity checks compare drawn pixels, so a different zlib build cannot fail them', async () => {
  for (const [labId, pngHash, pixelHash] of [['33-vision', 'imageSha256', 'pixelSha256'], ['37-video-frames', 'sheetSha256', 'sheetPixelSha256']]) {
    const { saved } = await runWithFake(labId);
    const lab = genaiLabs.find(entry => entry.id === labId);
    const integrity = results => lab.evaluate(results)[0];
    assert.equal(integrity(saved.results).passed, true);
    const otherCompression = saved.results.map(result => ({ ...result, measurements: { ...result.measurements, [pngHash]: 'f'.repeat(64) } }));
    assert.equal(integrity(otherCompression).passed, true);
    const wrongPixels = structuredClone(saved.results);
    wrongPixels[0].measurements[pixelHash] = '0'.repeat(64);
    assert.equal(integrity(wrongPixels).passed, false);
  }
});

test('lab selection accepts a group, one lab, or an ordered comma-separated list without repeats', () => {
  assert.deepEqual(selectLabs('33-vision,30-logprobs').map(lab => lab.id), ['33-vision', '30-logprobs']);
  assert.deepEqual(selectLabs('37-video-frames').map(lab => lab.id), ['37-video-frames']);
  assert.equal(selectLabs('genai').length, 10);
  assert.throws(() => selectLabs('30-logprobs,30-logprobs'), /only once/);
  assert.throws(() => selectLabs('30-logprobs,99-nothing'), /Unknown lab "99-nothing"/);
});

test('a failing lab step still saves partial evidence with a failed status', async () => {
  const lab = genaiLabs[0];
  const failing = createFakeAzure({ chat: () => { throw new Error('unused'); } });
  const original = failing.chat;
  let count = 0;
  failing.chat = async request => {
    if (++count > 3) throw new Error('simulated outage');
    return original(request);
  };
  const directory = await mkdtemp(join(tmpdir(), 'genai-fail-'));
  const root = new URL(`${pathToFileURL(directory).href}/`);
  try {
    await assert.rejects(runGenaiLab(lab, { azure: failing, config: testConfig, log: () => {} }, root), /simulated outage/);
    const saved = JSON.parse(await readFile(new URL(`${lab.id}.json`, root), 'utf8'));
    assert.equal(saved.status, 'failed');
    assert.equal(saved.results.length, 1);
    assert.match(saved.error, /simulated outage/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
