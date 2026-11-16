import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentState, executeAgentTool, runAgent } from '../lib/agent.mjs';
import { evaluate } from '../lib/evaluate.mjs';
import { managedToken } from '../lib/cloud.mjs';
import { encodeRecord, decodeRecords, persistRecord } from '../lib/azure-records.mjs';

const execute = (state, name, args, options) => executeAgentTool(state, name, JSON.stringify(args), options);
const call = (name, args) => ({
  model: 'azure-test', finishReason: 'tool_calls', usage: { total_tokens: 10 }, latencyMs: 1,
  message: { role: 'assistant', content: null, tool_calls: [{ id: `${name}-1`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] },
});
const answer = content => ({
  model: 'azure-test', finishReason: 'stop', usage: { total_tokens: 12 }, latencyMs: 1,
  message: { role: 'assistant', content },
});
const config = { standardDeployment: 'gpt-4o' };

test('tool boundary rejects unknown tools, malformed arguments, extra keys and invalid quantities', () => {
  const state = createAgentState();
  for (const [name, raw] of [
    ['shell', '{}'], ['lookup_item', 'not json'], ['lookup_item', 'null'],
    ['lookup_item', '{"item":"robot kit","extra":1}'], ['lookup_item', '{"item":"constructor"}'],
    ['reserve_draft', '{"item":"robot kit","quantity":0}'],
    ['reserve_draft', '{"item":"robot kit","quantity":1.5}'],
    ['reserve_draft', '{"item":"robot kit","quantity":"2"}'],
  ]) assert.equal(executeAgentTool(state, name, raw).ok, false);
  assert.deepEqual(state.reservations, []);
});

test('arithmetic requires observed prices and a clarified quantity; basket checks budget and stock', () => {
  const state = createAgentState({ quantity: null });
  assert.equal(execute(state, 'calculate_total', { quantity: 2, unitPrice: 23 }).error.code, 'quantity_mismatch');
  assert.equal(execute(state, 'ask_user', { question: 'How many?' }, { classroomReply: 2 }).quantity, 2);
  assert.equal(execute(state, 'calculate_total', { quantity: 2, unitPrice: 23 }).error.code, 'price_not_observed');
  execute(state, 'lookup_item', { item: 'robot kit' });
  assert.equal(execute(state, 'calculate_total', { quantity: 2, unitPrice: 23 }).total, 46);
  assert.equal(execute(state, 'check_basket', { item: 'robot kit', quantity: 2 }, { unavailableRobot: true }).error.code, 'unavailable');
  state.quantity = 3;
  assert.equal(execute(state, 'check_basket', { item: 'robot kit', quantity: 3 }).error.code, 'over_budget');
  assert.equal(execute(state, 'check_basket', { item: 'paper kit', quantity: 3 }).total, 36);
});

test('permissions and exact-action approval prevent writes; approved drafts cannot be duplicated', () => {
  const args = { item: 'paper kit', quantity: 2 };
  const approval = { ...args, decision: 'approve' };
  const state = createAgentState();
  assert.equal(execute(state, 'reserve_draft', args, { denyWrite: true, approval }).error.code, 'permission_denied');
  assert.equal(execute(state, 'reserve_draft', args, { approval: { ...approval, quantity: 3 } }).error.code, 'approval_required');
  assert.equal(execute(state, 'reserve_draft', args, { approval: { ...approval, decision: 'reject' } }).error.code, 'approval_rejected');
  assert.deepEqual(state.reservations, []);
  assert.equal(execute(state, 'reserve_draft', args, { approval }).ok, true);
  assert.equal(execute(state, 'reserve_draft', args, { approval }).error.code, 'already_reserved');
  assert.deepEqual(state.reservations, [args]);
});

test('a tool observation feeds the next real request, and the runner blocks over-limit execution', async () => {
  let index = 0;
  const responses = [call('lookup_item', { item: 'robot kit' }), call('calculate_total', { quantity: 2, unitPrice: 23 })];
  const result = await runAgent({ prompt: 'Total?', maxToolCalls: 1 }, config, 'test', undefined, async request => {
    if (index === 1) {
      assert.equal(JSON.parse(request.messages.at(-1).content).unitPrice, 23);
      assert.equal(request.messages.at(-2).tool_calls[0].function.name, 'lookup_item');
    }
    return responses[index++];
  });
  assert.equal(result.agentTrace.stopReason, 'tool_limit');
  assert.equal(result.agentTrace.toolExecutionCount, 1);
  assert.equal(result.agentTrace.events.at(-1).executed, false);
  assert.equal(result.agentTrace.state.total, null);
  assert.equal(result.extraRequests.length, 1);
  assert.equal(result.outputSource, 'application');
});

test('unchanged permanent errors stop; one temporary failure can recover', async () => {
  const unknown = call('lookup_item', { item: 'glitter kit' });
  let responses = [unknown, unknown];
  const failed = await runAgent({ prompt: 'Price?' }, config, 'test', undefined, async () => responses.shift());
  assert.equal(failed.agentTrace.stopReason, 'repeated_error');
  responses = [call('lookup_item', { item: 'robot kit' }), call('lookup_item', { item: 'robot kit' }), answer('23 credits')];
  const recovered = await runAgent({ prompt: 'Price?', temporaryFailure: true }, config, 'test', undefined, async () => responses.shift());
  assert.equal(recovered.agentTrace.stopReason, 'completed');
  assert.equal(recovered.agentTrace.events[0].result.error.code, 'temporarily_unavailable');
  assert.equal(recovered.agentTrace.events[1].result.unitPrice, 23);
});

test('state revisions invalidate stale totals and preserve the actual previous conversation', async () => {
  let responses = [call('check_basket', { item: 'paper kit', quantity: 2 }), answer('24 credits')];
  const first = await runAgent({ prompt: 'Choose a basket', requireBasket: true }, config, 'test', undefined, async () => responses.shift());
  responses = [call('check_basket', { item: 'paper kit', quantity: 3 }), answer('36 credits')];
  const second = await runAgent({ prompt: 'Change quantity to 3', revisedQuantity: 3, requireBasket: true }, config, 'test', first, async request => {
    assert.ok(request.messages.some(message => message.content === '24 credits'));
    return responses.shift();
  });
  assert.equal(second.agentTrace.initialState.total, null);
  assert.equal(second.agentTrace.initialState.checked, false);
  assert.ok(evaluate('22-agent-state', [first, second]).every(check => check.passed));
  second.agentTrace.state.total = 24;
  assert.ok(evaluate('22-agent-state', [first, second]).some(check => !check.passed));
});

test('Azure errors propagate, and truncated or unverified completions never count as completed', async () => {
  await assert.rejects(runAgent({ prompt: 'Hi' }, config, 'test', undefined, async () => { throw new Error('Azure unavailable'); }), /Azure unavailable/);
  const unverified = await runAgent({ prompt: 'Choose', requireBasket: true }, config, 'test', undefined, async () => answer('Done'));
  assert.equal(unverified.agentTrace.stopReason, 'unverified');
  const truncated = await runAgent({ prompt: 'Hi' }, config, 'test', undefined, async () => ({ ...answer('Partial'), finishReason: 'length' }));
  assert.equal(truncated.agentTrace.stopReason, 'output_limit');
});

test('impossibility requires catalog observations rather than a model assertion', () => {
  const state = createAgentState({ quantity: 1, budget: 1 });
  assert.equal(execute(state, 'report_impossible', { reason: 'Too expensive' }).error.code, 'not_established');
  execute(state, 'lookup_item', { item: 'robot kit' });
  assert.equal(execute(state, 'report_impossible', { reason: 'Too expensive' }).error.code, 'not_established');
  execute(state, 'lookup_item', { item: 'paper kit' });
  assert.equal(execute(state, 'report_impossible', { reason: 'Both prices exceed 1 credit' }).status, 'impossible');
});

test('trace evaluation detects a denied write attempt even when the final total is correct', async () => {
  const base = [
    call('lookup_item', { item: 'robot kit' }),
    call('calculate_total', { quantity: 2, unitPrice: 23 }),
  ];
  let responses = [...base, answer('46 credits')];
  const readOnly = await runAgent({ prompt: 'Total?' }, config, 'test', undefined, async () => responses.shift());
  responses = [...base, call('reserve_draft', { item: 'robot kit', quantity: 2 }), answer('46 credits; reservation denied.')];
  const denied = await runAgent({ prompt: 'Total and reserve', denyWrite: true }, config, 'test', undefined, async () => responses.shift());
  assert.ok(evaluate('28-agent-trace', [readOnly, denied]).every(check => check.passed));
  assert.equal(denied.agentTrace.rubric.answerCorrect, true);
  assert.equal(denied.agentTrace.rubric.pathPassed, false);
  assert.deepEqual(denied.agentTrace.state.reservations, []);
});

test('managed identity uses the selected identity and never hides authentication failures', async t => {
  const environment = { IDENTITY_ENDPOINT: 'http://localhost:1234/token', IDENTITY_HEADER: 'test-header', AZURE_CLIENT_ID: 'test-client' };
  const previous = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const previousEndpoint = process.env.INGESTION_ENDPOINT;
  const previousRule = process.env.INGESTION_RULE_ID;
  process.env.INGESTION_ENDPOINT = 'https://ingestion.example.invalid';
  process.env.INGESTION_RULE_ID = 'dcr-test';
  t.after(() => {
    if (previousEndpoint === undefined) delete process.env.INGESTION_ENDPOINT;
    else process.env.INGESTION_ENDPOINT = previousEndpoint;
    if (previousRule === undefined) delete process.env.INGESTION_RULE_ID;
    else process.env.INGESTION_RULE_ID = previousRule;
  });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.searchParams.get('client_id'), 'test-client');
    assert.equal(url.searchParams.get('resource'), 'https://storage.azure.com/');
    assert.equal(options.headers['X-IDENTITY-HEADER'], 'test-header');
    return Response.json({ access_token: 'test-token' });
  });
  assert.equal(await managedToken('https://storage.azure.com/'), 'test-token');
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('http://localhost')) return Response.json({ access_token: 'test-token' });
    assert.equal(url.pathname, '/dataCollectionRules/dcr-test/streams/Custom-AIBasicsResults');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(options.body)[0].RunId, 'test-run');
    return new Response(null, { status: 204 });
  };
  await persistRecord('test-run', 'manifest', { status: 'completed' });
  globalThis.fetch = async url => String(url).startsWith('http://localhost') ?
    Response.json({ access_token: 'test-token' }) : new Response('Rejected', { status: 403 });
  await assert.rejects(persistRecord('test-run', 'manifest', {}), /HTTP 403/);
  globalThis.fetch = async () => new Response('Denied', { status: 403 });
  await assert.rejects(managedToken('https://storage.azure.com/'), /HTTP 403/);
});

test('durable Azure records tolerate log reordering/duplicates but reject conflicts and incomplete evidence', () => {
  const record = { output: 'hello', trace: Array.from({ length: 4000 }, (_, index) => ({ index, value: index * 137 })) };
  const lines = encodeRecord('test-run', '19-workflow-agent', record);
  assert.ok(lines.length > 1);
  assert.deepEqual(decodeRecords('test-run', [...lines].reverse().concat(lines)).get('19-workflow-agent'), record);
  assert.equal(decodeRecords('test-run', lines.slice(1)).size, 0);
  assert.equal(decodeRecords('other-run', lines).size, 0);
  const corrupted = lines[0].slice(0, -4) + 'AAAA';
  assert.throws(() => decodeRecords('test-run', [lines[0], corrupted]), /Conflicting/);
});
