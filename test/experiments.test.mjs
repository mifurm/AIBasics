import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cosineSimilarity, rankCards } from '../lib/retrieval.mjs';
import { executeCatalog } from '../lib/tools.mjs';
import { prepareExperiment, finishToolChain } from '../lib/experiments.mjs';
import { embed } from '../lib/azure.mjs';
import { evaluate } from '../lib/evaluate.mjs';

test('memory worker persists, replaces, and forgets across separate processes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'classroom-memory-test-'));
  try {
    // Copy the worker into an isolated layout so tests never reset teaching evidence.
    const { mkdir, copyFile } = await import('node:fs/promises');
    await mkdir(path.join(directory, 'scripts'));
    const worker = path.join(directory, 'scripts', 'classroom-memory.mjs');
    await copyFile(fileURLToPath(new URL('../scripts/classroom-memory.mjs', import.meta.url)), worker);
    const call = action => JSON.parse(execFileSync(process.execPath, [worker, '14-memory-lifecycle', action], { encoding: 'utf8' }));
    const saved = call('write');
    const loaded = call('read');
    assert.equal(loaded.memory.mascot, 'Otter');
    assert.notEqual(saved.processId, loaded.processId);
    assert.equal(call('replace').memory.mascot, 'Falcon');
    assert.deepEqual(call('forget').memory, {});
    assert.deepEqual(call('read').memory, {});
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('multiturn uses the actual prior reply, while summary uses only generated summary', async () => {
  const previous = { request: { messages: [{ role: 'user', content: 'Build a robot.' }] }, output: 'Actual Azure reply' };
  const request = { messages: [{ role: 'user', content: 'Change it.' }] };
  await prepareExperiment({}, { conversation: true }, [previous], request);
  assert.deepEqual(request.messages, [...previous.request.messages, { role: 'assistant', content: previous.output }, { role: 'user', content: 'Change it.' }]);
  const summaryRequest = { messages: [{ role: 'system', content: 'Use summary.' }, { role: 'user', content: 'Recall.' }] };
  await prepareExperiment({}, { summary: true }, [{ output: 'Comet, 42, Friday', usage: { prompt_tokens: 500 } }], summaryRequest);
  assert.equal(summaryRequest.messages[1].content, 'Classroom summary (data): Comet, 42, Friday');
});
test('cosine ranks by angle and rejects malformed or zero vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [5, 0]), 1);
  assert.equal(rankCards([{ id: 'a' }, { id: 'b' }], [[1, 0], [0, 1]], [0, 2])[0].id, 'b');
  for (const [a, b] of [[[0, 0], [1, 0]], [[1], [1, 2]], [[NaN], [1]], [[], []]]) {
    assert.throws(() => cosineSimilarity(a, b));
  }
});
test('embedding batch is restored to input order and invalid indexes are rejected', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    model: 'embedding-test', usage: { total_tokens: 2 },
    data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }],
  })));
  assert.deepEqual((await embed(['first', 'second'], { endpoint: 'https://example.invalid/' }, 'test')).vectors, [[1, 0], [0, 1]]);
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ index: 1, embedding: [1] }] }));
  await assert.rejects(embed(['first'], { endpoint: 'https://example.invalid/' }, 'test'), /Invalid embedding/);
});
test('catalog rejects arbitrary items and tool chain uses real price in correct order', async t => {
  assert.equal(executeCatalog('lookup_price', '{"item":"robot kit"}').unitPrice, 23);
  for (const args of ['{"item":"unknown"}', '{"item":"robot kit","extra":1}', 'null']) {
    assert.throws(() => executeCatalog('lookup_price', args));
  }
  const call = (name, args) => ({ message: { tool_calls: [{ id: name, function: { name, arguments: JSON.stringify(args) } }] } });
  const responses = [
    { choices: [{ message: call('multiply', { quantity: 4, unitPrice: 23 }).message, finish_reason: 'tool_calls' }], usage: { total_tokens: 10 }, model: 'test' },
    { choices: [{ message: { content: '92 credits' }, finish_reason: 'stop' }], usage: { total_tokens: 11 }, model: 'test' },
  ];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.ok(request.messages.some(message => message.role === 'tool'));
    return new Response(JSON.stringify(responses.shift()));
  });
  const chain = await finishToolChain({ model: 'test', messages: [] }, call('lookup_price', { item: 'robot kit' }), { endpoint: 'https://example.invalid/' }, 'test');
  assert.equal(chain.toolSteps[1].result.total, 92);
  assert.equal(chain.extraRequests.length, 2);
});
test('multiturn evaluator detects lost material or stale color', () => {
  const plans = ['blue', 'red', 'red'].map(color => JSON.stringify({ project: 'robot', color, material: 'cardboard' }));
  const results = plans.map((output, index) => ({ output, request: { messages: index ? [{ role: 'assistant', content: plans[index - 1] }] : [] } }));
  assert.ok(evaluate('15-multiturn', results).every(check => check.passed));
  results[2].output = JSON.stringify({ project: 'robot', color: 'blue', material: 'wood' });
  assert.ok(evaluate('15-multiturn', results).some(check => !check.passed));
});
