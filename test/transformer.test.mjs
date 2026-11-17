import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTinyTransformer, trainTinyTransformer, tokenize, vocabulary, generateTokens } from '../lib/tiny-transformer.mjs';
import { runTransformerExperiment, evaluateTransformer } from '../lib/transformer-lab.mjs';
import { referenceForward, maxDifferenceFromTrace } from '../lib/transformer-reference.mjs';
import { FORWARD_STEPS, LEARNING_STEPS } from '../lib/transformer-walkthrough.mjs';
import { validateWalkthrough, renderWalkthroughText } from '../lib/transformer-walkthrough-check.mjs';
import { labs } from '../lib/labs.mjs';

let cached;
const experiment = () => (cached ??= runTransformerExperiment());
const walkthroughs = () => {
  const results = structuredClone(experiment());
  return { results, forward: results[1].computationTrace.walkthrough, learning: results[2].computationTrace.walkthrough };
};
const stepOf = (walkthrough, id) => walkthrough.steps.find(step => step.id === id).data;

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
  const results = experiment();
  assert.ok(evaluateTransformer(results).every(check => check.passed));
  const training = results[0].computationTrace.training;
  assert.ok(training.finalLoss < 0.2);
  assert.ok(training.initialLoss > 1);
  const damaged = structuredClone(results);
  damaged[0].computationTrace.training.finalLoss = training.initialLoss;
  damaged[3].computationTrace.maskedDifference = 0.01;
  damaged[4].computationTrace.fingerprintAfterInference = 'changed';
  assert.equal(evaluateTransformer(damaged).filter(check => !check.passed).length, 3);
  assert.equal(labs[0].id, '00-tiny-transformer');
  assert.equal(labs[0].cases.length, results.length);
  assert.equal(labs[1].id, '01-specificity');
});

test('the plain-number forward pass equals the model for every legal sentence length, trained or not', () => {
  const model = createTinyTransformer();
  const sentence = tokenize('<bos> the robot is blue . <eos>');
  for (const label of ['untrained', 'trained']) {
    if (label === 'trained') trainTinyTransformer(model);
    const weights = model.weights();
    for (let length = 1; length <= sentence.length; length++) {
      const ids = sentence.slice(0, length);
      const difference = maxDifferenceFromTrace(referenceForward(weights, ids), model.forward(ids, { inspect: true }).trace);
      assert.ok(difference < 1e-9, `${label}, ${length} words: ${difference}`);
    }
  }
  const count = value => (Array.isArray(value) ? value.reduce((total, item) => total + count(item), 0) : typeof value === 'number' ? 1 : Object.values(value).reduce((total, item) => total + count(item), 0));
  assert.equal(count(model.weights()), model.parameters.length);
});

test('the walkthrough has every step with an equation, plain words and real numbers, and its claims follow from the data', () => {
  const { forward, learning } = walkthroughs();
  assert.deepEqual(forward.steps.map(step => step.id), FORWARD_STEPS);
  assert.deepEqual(learning.steps.map(step => step.id), LEARNING_STEPS);
  for (const step of [...forward.steps, ...learning.steps]) {
    assert.ok(step.equations.length > 0 && step.plain.length > 60 && step.display.length > 0, `step ${step.id}`);
    assert.doesNotMatch(JSON.stringify([step.plain, step.display, step.notice]), /NaN|undefined|Infinity/, `step ${step.id}`);
  }
  assert.equal(validateWalkthrough(forward).failures.length, 0);
  assert.equal(validateWalkthrough(learning).failures.length, 0);
  const attention = stepOf(forward, 'softmax1');
  const top = attention.weights.indexOf(Math.max(...attention.weights));
  assert.equal(attention.words[top], 'robot');
  assert.match(forward.steps.find(step => step.id === 'softmax1').notice, new RegExp(`${(100 * attention.weights[top]).toFixed(2)}% of its attention to "robot"`));
  const wrap = forward.wrapUp.data;
  assert.deepEqual([wrap.differences.x, wrap.differences.q], [0, 0]);
  assert.ok(wrap.differences.m > 0.1 && wrap.chosen.join() === 'blue,green');
  const update = stepOf(learning, 'update');
  assert.ok(Math.abs(Math.abs(update.step) - update.eta) < 1e-6 && update.lossAfter < update.lossBefore);
  assert.ok(Math.abs(stepOf(learning, 'slope').backpropSlope - stepOf(learning, 'slope').numericSlope) < 1e-6);
});

test('tampering with any recorded number or relation is caught by the walkthrough checks', () => {
  const edits = [
    ['an attention weight', ({ forward }) => { stepOf(forward, 'softmax1').weights[0] += 0.001; }],
    ['a score that no longer equals q · k ÷ √8', ({ forward }) => { stepOf(forward, 'scores').scores[2] += 0.01; }],
    ['a residual sum', ({ forward }) => { stepOf(forward, 'shortcut1').residual[3] += 0.01; }],
    ['a ReLU output', ({ forward }) => { stepOf(forward, 'expand').hidden[0] = -1; }],
    ['a layer-normalization output', ({ forward }) => { stepOf(forward, 'norm2').output[1] += 0.01; }],
    ['a masked score that is not hidden', ({ forward }) => { stepOf(forward, 'mask').matrix[0][1] = 0.5; }],
    ['a score that is not a weighted sum', ({ forward }) => { stepOf(forward, 'readout').logits[5] += 0.5; }],
    ['the chosen word', ({ forward }) => { stepOf(forward, 'choose').chosen = 'green'; }],
    ['the first update of a learned number', ({ learning }) => { stepOf(learning, 'update').after += 1e-6; }],
    ['a loss penalty', ({ learning }) => { stepOf(learning, 'loss').penalties[0] += 0.01; }],
    ['a step description left empty', ({ forward }) => { forward.steps[4].equations = []; }],
  ];
  for (const [name, edit] of edits) {
    const copy = walkthroughs();
    edit(copy);
    const failures = [validateWalkthrough(copy.forward), validateWalkthrough(copy.learning)].flatMap(result => result.failures);
    assert.ok(failures.length > 0, `${name} was not detected`);
    assert.ok(evaluateTransformer(copy.results).some(check => !check.passed), `${name} passed the lab evaluation`);
  }
  const missing = structuredClone(experiment());
  delete missing[1].computationTrace.walkthrough;
  assert.equal(evaluateTransformer(missing)[0].passed, false);
});

test('the console text lists every step with its equation and numbers, in order', () => {
  const { forward, learning } = walkthroughs();
  const text = renderWalkthroughText(forward);
  let position = -1;
  for (const step of forward.steps) {
    const heading = text.indexOf(`STEP ${step.number} of ${forward.steps.length}: ${step.title}`);
    assert.ok(heading > position, `step ${step.number} is missing or out of order`);
    position = heading;
    for (const equation of step.equations) assert.ok(text.includes(equation), `equation of step ${step.number}`);
  }
  assert.match(text, /Word looked at\s+Score s\s+exp\(s\)\s+Share = exp\(s\) ÷ total/);
  assert.match(text, /robot\s+2\.929\s+18\.704\s+93\.00%/);
  assert.match(text, /WHY "ROBOT IS" GIVES "BLUE" BUT "PLANT IS" GIVES "GREEN"/);
  assert.match(renderWalkthroughText(learning), /slope = ∂L\/∂w ≈ \(L\(w \+ δ\) − L\(w − δ\)\) \/ \(2δ\)/);
  assert.ok(text.split('\n').every(line => line.length <= 140));
});

test('the poster explains the word IDs with the model\'s real dictionary and its real example', async () => {
  const svg = await readFile(new URL('../web/transformer.svg', import.meta.url), 'utf8');
  const plain = value => value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  const entries = [...svg.matchAll(/<text class="entry"[^>]*><tspan class="idnum">(\d+)<\/tspan>\s*([^<]+)<\/text>/g)].map(match => [Number(match[1]), plain(match[2]).trim()]);
  assert.deepEqual(entries.sort((a, b) => a[0] - b[0]), vocabulary.map((word, id) => [id, word]));
  const text = plain(svg);
  const sentence = '<bos> the robot is';
  assert.ok(text.includes(sentence) && text.includes(`IDs: ${tokenize(sentence).join(', ')}`));
});

test('token and context boundaries fail explicitly rather than substituting unknown IDs', () => {
  const model = createTinyTransformer();
  assert.throws(() => tokenize('unknown'), /Unknown teaching token/);
  for (const ids of [[], [-1], [vocabulary.length], [1.5], Array(9).fill(1)]) {
    assert.throws(() => model.forward(ids), /valid teaching token IDs/);
  }
  assert.throws(() => generateTokens(model, '<bos> the robot', 6), /context window/);
});
