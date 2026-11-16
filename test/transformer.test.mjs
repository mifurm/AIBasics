import test from 'node:test';
import assert from 'node:assert/strict';
import { createTinyTransformer, tokenize, vocabulary, generateTokens } from '../lib/tiny-transformer.mjs';
import { runTransformerExperiment, evaluateTransformer } from '../lib/transformer-lab.mjs';
import { labs } from '../lib/labs.mjs';

test('backpropagation through attention, normalization and feed-forward layers matches numerical gradients', () => {
  const model = createTinyTransformer();
  const ids = tokenize('<bos> the robot is blue . <eos>');
  const loss = model.loss(ids);
  loss.backward();
  const indices = [0, 140, 212, 284, 356, 428, 572, 708, 790];
  const gradients = indices.map(index => model.parameters[index].grad);
  assert.ok(gradients.filter(gradient => Math.abs(gradient) > 1e-8).length >= 6);
  indices.forEach((index, i) => {
    const parameter = model.parameters[index];
    const original = parameter.data;
    const epsilon = 1e-5;
    parameter.data = original + epsilon;
    const plus = model.loss(ids).data;
    parameter.data = original - epsilon;
    const minus = model.loss(ids).data;
    parameter.data = original;
    const numeric = (plus - minus) / (2 * epsilon);
    assert.ok(Math.abs(numeric - gradients[i]) < 1e-5, `Parameter ${index}: analytic ${gradients[i]}, numeric ${numeric}`);
  });
});

test('causal masking blocks future attention and future influence, with a non-causal control', () => {
  const model = createTinyTransformer();
  const original = tokenize('<bos> the robot is blue .');
  const changed = tokenize('<bos> the robot is green .');
  const a = model.forward(original, { inspect: true }).trace;
  const b = model.forward(changed, { inspect: true }).trace;
  assert.deepEqual(a.probabilities.slice(0, 4), b.probabilities.slice(0, 4));
  assert.ok(a.attention.every((row, i) => row.every((value, j) => j <= i || value === 0)));
  assert.ok(a.scaledAttentionScores.every((row, i) => row.every((value, j) => j <= i || value === null)));
  assert.ok(a.attention.every(row => Math.abs(row.reduce((total, value) => total + value, 0) - 1) < 1e-12));
  const unmaskedA = model.forward(original, { causal: false }).probabilities[3].map(value => value.data);
  const unmaskedB = model.forward(changed, { causal: false }).probabilities[3].map(value => value.data);
  assert.ok(unmaskedA.some((value, i) => Math.abs(value - unmaskedB[i]) > 1e-6));
});

test('actual training learns different contexts, generation preserves weights, and failed learning cannot pass', () => {
  const results = runTransformerExperiment();
  assert.ok(evaluateTransformer(results).every(check => check.passed));
  const training = results[0].computationTrace.training;
  assert.ok(training.finalLoss < 0.2);
  assert.ok(training.initialLoss > 1);
  const damaged = structuredClone(results);
  damaged[0].computationTrace.training.finalLoss = training.initialLoss;
  damaged[1].computationTrace.maskedDifference = 0.01;
  damaged[2].computationTrace.fingerprintAfterInference = 'changed';
  assert.equal(evaluateTransformer(damaged).filter(check => !check.passed).length, 3);
  assert.equal(labs[0].id, '00-tiny-transformer');
  assert.equal(labs[1].id, '01-specificity');
});

test('token and context boundaries fail explicitly rather than substituting unknown IDs', () => {
  const model = createTinyTransformer();
  assert.throws(() => tokenize('unknown'), /Unknown teaching token/);
  for (const ids of [[], [-1], [vocabulary.length], [1.5], Array(9).fill(1)]) {
    assert.throws(() => model.forward(ids), /valid teaching token IDs/);
  }
  assert.throws(() => generateTokens(model, '<bos> the robot', 6), /context window/);
});
