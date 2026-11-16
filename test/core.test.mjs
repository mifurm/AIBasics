import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, complete, AzureRequestError } from '../lib/azure.mjs';
import { executeMultiply } from '../lib/tools.mjs';
import { evaluate } from '../lib/evaluate.mjs';

const config = { standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini' };
test('reasoning request keeps its budget and never sends unsupported sampling defaults', () => {
  const request = buildRequest({ model: 'reasoning', messages: [], parameters: { reasoning_effort: 'low' } }, config);
  assert.equal(request.max_completion_tokens, 1400);
  assert.equal(request.reasoning_effort, 'low');
  assert.ok(!('temperature' in request) && !('top_p' in request) && !('max_tokens' in request));
  assert.throws(() => buildRequest({ model: 'reasoning', messages: [], parameters: { temperature: 0 } }, config), /does not support/);
});
test('standard output cap is retained', () => {
  assert.equal(buildRequest({ messages: [], parameters: { max_tokens: 24 } }, config).max_tokens, 24);
});
test('tool calculates and rejects unknown tools, extra fields, invalid and out-of-range values', () => {
  assert.equal(executeMultiply('multiply', '{"quantity":17,"unitPrice":23}').total, 391);
  assert.throws(() => executeMultiply('shell', '{}'), /not allowed/);
  for (const args of ['{"quantity":1,"unitPrice":2,"command":"x"}', '{"quantity":-1,"unitPrice":2}', '{"quantity":1.5,"unitPrice":2}', '{"quantity":"1","unitPrice":2}', '{"quantity":10001,"unitPrice":2}', 'null', '[]']) {
    assert.throws(() => executeMultiply('multiply', args));
  }
});
test('structured extraction checks meaning and exact shape, not just parseable JSON', () => {
  assert.equal(evaluate('08-structured-output', [{ output: '{"item":"notebooks","quantity":3}' }])[0].passed, true);
  for (const output of ['{"item":"notebooks","quantity":"3"}', '{"item":"pens","quantity":3}', '{"item":"notebooks","quantity":3,"extra":true}']) {
    assert.equal(evaluate('08-structured-output', [{ output }])[0].passed, false);
  }
});
test('token lab checks measured cap and truncation rather than word count', () => {
  const result = (tokens, finishReason) => ({ usage: { completion_tokens: tokens }, finishReason });
  assert.ok(evaluate('06-token-budget', [result(24, 'length'), result(180, 'stop')]).every(check => check.passed));
  assert.equal(evaluate('06-token-budget', [result(25, 'stop'), result(281, 'length')]).filter(check => !check.passed).length, 3);
});
test('Azure content-filter failures remain explicit errors, never completion-shaped fallbacks', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify({ error: { code: 'content_filter', message: 'Request blocked by Azure.' } }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  ));
  await assert.rejects(
    complete({ model: 'gpt-4o', messages: [] }, { endpoint: 'https://example.invalid/' }, 'test-token'),
    error => error instanceof AzureRequestError && error.status === 400 && error.azureCode === 'content_filter',
  );
});
