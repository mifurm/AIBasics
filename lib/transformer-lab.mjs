import { createTinyTransformer, trainTinyTransformer, inspectPrediction, generateTokens, tokenize, vocabulary } from './tiny-transformer.mjs';

export const transformerLab = {
  id: '00-tiny-transformer', title: 'How a tiny transformer predicts a token', minutes: 10,
  concept: 'A decoder-only transformer turns token IDs into vectors, mixes earlier context with causal attention, and predicts the next token. Training changes weights; prompting does not.',
  question: 'How can the same last word, "is", predict blue for a robot but green for a plant?',
  caveat: 'This 833-parameter teaching model memorizes two fictional sentences. It uses word tokens, one attention head, and one block, not GPT internals or useful general language understanding.',
  exercise: 'Compare the robot and plant distributions, inspect the causal mask, then follow each generated token. Change the corpus and retrain before expecting new knowledge.',
  diagram: 'transformer.svg',
  cases: [
    { label: 'Train weights, then compare two contexts', computation: true },
    { label: 'Test that future tokens cannot leak backward', computation: true },
    { label: 'Append one token and predict again', computation: true },
  ],
};

const architecture = model => ({
  family: 'decoder-only, pre-layer-normalization', blocks: 1, heads: 1,
  embeddingWidth: model.width, headWidth: model.width, feedForwardWidth: 16,
  contextLength: model.contextLength, vocabulary, parameters: model.parameters.length,
  positionEncoding: 'learned absolute position embeddings', activation: 'ReLU',
  sequence: [
    'word token IDs', 'token embedding + position embedding',
    'LayerNorm -> Q/K/V -> scaled dot products -> causal mask -> softmax -> weighted V -> output projection -> residual add',
    'LayerNorm -> linear 8-to-16 -> ReLU -> linear 16-to-8 -> residual add',
    'final LayerNorm -> linear vocabulary readout -> softmax',
  ],
});

export function runTransformerExperiment() {
  const model = createTinyTransformer();
  const start = performance.now();
  const before = inspectPrediction(model, '<bos> the robot is');
  const training = trainTinyTransformer(model);
  const robot = inspectPrediction(model, '<bos> the robot is');
  const plant = inspectPrediction(model, '<bos> the plant is');
  const trainingMs = Math.round(performance.now() - start);
  const inferenceFingerprint = model.fingerprint();
  const makeResult = (index, output, computationTrace, latencyMs) => ({
    label: transformerLab.cases[index].label, kind: 'computation',
    request: { messages: [{ role: 'user', content: transformerLab.cases[index].label }] },
    output, outputSource: 'computation', actualModel: 'tiny-transformer-1-block-1-head',
    finishReason: 'completed', latencyMs, usage: null, apiRequests: 0,
    computationTrace: { architecture: architecture(model), ...computationTrace },
  });
  const results = [makeResult(0,
    `A real ${model.parameters.length}-parameter transformer trained on two sentences for ${training.steps} updates.\n` +
    `Mean next-token cross-entropy: ${training.initialLoss.toFixed(4)} -> ${training.finalLoss.toFixed(4)}.\n` +
    `"the robot is" -> blue: ${(100 * robot.distribution.find(entry => entry.token === 'blue').probability).toFixed(2)}%.\n` +
    `"the plant is" -> green: ${(100 * plant.distribution.find(entry => entry.token === 'green').probability).toFixed(2)}%.\n` +
    'These probabilities describe the toy training set, not confidence about the real world.',
    { training, beforeTraining: before, probes: [robot, plant] }, trainingMs)];
  const maskStart = performance.now();
  const original = tokenize('<bos> the robot is blue .');
  const changed = tokenize('<bos> the robot is green .');
  const originalForward = model.forward(original, { inspect: true }).trace;
  const changedForward = model.forward(changed, { inspect: true }).trace;
  const unmaskedOriginal = model.forward(original, { causal: false, inspect: true }).trace;
  const unmaskedChanged = model.forward(changed, { causal: false, inspect: true }).trace;
  const maxDifference = (a, b) => Math.max(...a.slice(0, 4).flatMap((row, i) => row.map((entry, j) => Math.abs(entry - b[i][j]))));
  const maskedDifference = maxDifference(originalForward.probabilities, changedForward.probabilities);
  const unmaskedDifference = maxDifference(unmaskedOriginal.probabilities, unmaskedChanged.probabilities);
  results.push(makeResult(1,
    `Changed only the future color token at position 4 (zero-based).\n` +
    `Largest change to earlier positions 0-3 with the causal mask: ${maskedDifference}.\n` +
    `Without the mask (deliberately incorrect control): ${unmaskedDifference.toExponential(3)}.\n` +
    'The model cannot use a future answer token when predicting it.',
    { original: originalForward, changed: changedForward, changedPosition: 4, maskedDifference, unmaskedDifference },
    Math.round(performance.now() - maskStart)));
  const generationStart = performance.now();
  const generation = generateTokens(model, '<bos> the robot');
  const fingerprintAfterInference = model.fingerprint();
  results.push(makeResult(2,
    generation.steps.map(step => `${step.prefix} -> ${step.nextToken}`).join('\n') +
    `\nStop: ${generation.stopReason}. Weights unchanged during all inference: ${inferenceFingerprint === fingerprintAfterInference}.`,
    { generation, fingerprintBeforeInference: inferenceFingerprint, fingerprintAfterInference },
    Math.round(performance.now() - generationStart)));
  return results;
}

export function evaluateTransformer(results) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  if (results.length !== 3 || results.some(result => result.kind !== 'computation' || !result.computationTrace)) {
    return [{ name: 'Complete computation evidence', passed: false, detail: 'Three measured experiment variants are required.' }];
  }
  const training = results[0].computationTrace.training;
  const probes = results[0].computationTrace.probes;
  const mask = results[1].computationTrace;
  const generation = results[2].computationTrace;
  check('Training measurably reduces next-token loss', Number.isFinite(training.finalLoss) &&
    training.finalLoss < training.initialLoss * 0.5, `${training.initialLoss} -> ${training.finalLoss}`);
  check('Training really changes the weights', training.initialFingerprint !== training.finalFingerprint, 'SHA-256 before/after training differs.');
  check('Earlier context changes the next-token prediction', probes[0].distribution.find(entry => entry.token === 'blue').probability > 0.85 &&
    probes[1].distribution.find(entry => entry.token === 'green').probability > 0.85, 'P(blue | robot) and P(green | plant) both exceed 0.85.');
  check('All displayed probabilities are normalized', probes.every(probe => probe.probabilities.every(row =>
    row.every(value => Number.isFinite(value) && value >= 0 && value <= 1) &&
    Math.abs(row.reduce((total, value) => total + value, 0) - 1) < 1e-10)), 'Every displayed prediction distribution sums to 1.');
  check('Attention cannot look ahead', mask.original.attention.every((row, i) =>
    row.every((value, j) => j <= i || value === 0)) && mask.maskedDifference < 1e-12 && mask.unmaskedDifference > 1e-6,
  `Masked difference: ${mask.maskedDifference}; deliberately unmasked control: ${mask.unmaskedDifference}.`);
  check('Generation appends measured next-token predictions', generation.generation.tokens.join(' ') === '<bos> the robot is blue . <eos>' &&
    generation.generation.stopReason === 'eos' && generation.generation.steps.every((step, index, steps) =>
      step.distribution[0].token === step.nextToken &&
      (index === 0 || step.prefix === `${steps[index - 1].prefix} ${steps[index - 1].nextToken}`)),
  generation.generation.tokens.join(' '));
  check('Prompting and generation leave weights unchanged', generation.fingerprintBeforeInference === generation.fingerprintAfterInference,
    'SHA-256 before/after the masked/unmasked probes and generation is identical.');
  check('Toy computation is not reported as API usage', results.every(result => result.apiRequests === 0 && result.usage === null),
    'Zero model API requests; toy training tokens are separate from API billing tokens.');
  return checks;
}
