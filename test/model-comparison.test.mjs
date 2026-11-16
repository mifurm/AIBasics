import test from 'node:test';
import assert from 'node:assert/strict';
import { assessComparisonOutput, evaluateModelComparison, modelComparisonLab } from '../lib/model-comparison.mjs';
import { buildRequest } from '../lib/azure.mjs';

const config = { standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini' };
const outputs = {
  explanation: '- A language model predicts small pieces of text called tokens.\n- It uses the context you supply to choose what comes next.',
  extraction: '{"item":"notebooks","quantity":3}',
  constraints: '1: plant\n2: robot\n3: art',
};
const records = () => modelComparisonLab.cases.map(testCase => ({
  label: testCase.label, request: buildRequest(testCase, config), output: outputs[testCase.comparison.taskId],
  actualModel: `${testCase.model}-version`, finishReason: 'stop', latencyMs: 100,
  usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
  comparison: { ...testCase.comparison, targetChecks: assessComparisonOutput(testCase.comparison.taskId, outputs[testCase.comparison.taskId]) },
}));

test('model pairs share exact prompts while respecting model-specific API controls', () => {
  for (let index = 0; index < modelComparisonLab.cases.length; index += 2) {
    const [left, right] = modelComparisonLab.cases.slice(index, index + 2).map(testCase => buildRequest(testCase, config));
    assert.deepEqual(left.messages, right.messages);
    assert.notEqual(left.model, right.model);
    assert.equal(left.max_tokens, 320);
    assert.equal(right.max_completion_tokens, 1400);
    assert.equal(right.reasoning_effort, 'low');
    assert.ok(!('temperature' in right) && !('top_p' in right) && !('max_tokens' in right));
  }
});

test('target checks distinguish exact data, constrained schedules and explanations from plausible wrong shapes', () => {
  for (const [task, output] of Object.entries(outputs)) {
    assert.ok(assessComparisonOutput(task, output).every(check => check.passed));
  }
  for (const output of ['Bring three notebooks.', '{"item":"notebooks","quantity":"3"}', '{"item":"notebooks","quantity":3,"extra":1}', '{"item":"pens","quantity":3}']) {
    assert.equal(assessComparisonOutput('extraction', output)[0].passed, false);
  }
  assert.equal(assessComparisonOutput('constraints', '1: robot\n2: plant\n3: art')[0].passed, false);
  assert.equal(assessComparisonOutput('explanation', 'A long unstructured explanation.')[0].passed, false);
});

test('honest negative format results remain successful experiments, and identical outputs are allowed', () => {
  const results = records();
  results[4].output = 'Bring 3 notebooks.';
  results[4].comparison.targetChecks = assessComparisonOutput('extraction', results[4].output);
  assert.equal(results[4].comparison.targetChecks[0].passed, false);
  assert.ok(evaluateModelComparison(results).every(check => check.passed));
});

test('experiment validation rejects changed prompts, missing responses, truncated answers and forged target scores', () => {
  const changedPrompt = records();
  changedPrompt[1].request.messages = [{ role: 'user', content: 'Different question' }];
  assert.ok(evaluateModelComparison(changedPrompt).some(check => !check.passed));
  assert.ok(evaluateModelComparison(records().slice(0, -1)).some(check => !check.passed));
  const truncated = records();
  truncated[0].finishReason = 'length';
  assert.ok(evaluateModelComparison(truncated).some(check => !check.passed));
  const forged = records();
  forged[4].output = 'Wrong shape';
  assert.ok(evaluateModelComparison(forged).some(check => !check.passed));
});
