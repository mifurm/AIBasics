import { createTinyTransformer, trainTinyTransformer, inspectPrediction, generateTokens, tokenize, vocabulary } from './tiny-transformer.mjs';
import { buildForwardWalkthrough, buildLearningWalkthrough, num, pct, stepNumber } from './transformer-walkthrough.mjs';
import { validateWalkthrough } from './transformer-walkthrough-check.mjs';
import { argmax } from './transformer-reference.mjs';

export const transformerLab = {
  id: '00-tiny-transformer', title: 'How a tiny transformer predicts a token', minutes: 15,
  concept: 'A decoder-only transformer turns token IDs into vectors, mixes earlier context with causal attention, and predicts the next token. Training changes weights; prompting does not. Pick "Follow one prediction through every step" to see each equation, what it does in plain words, and the real numbers.',
  question: 'How can the same last word, "is", predict blue for a robot but green for a plant?',
  caveat: 'This 833-parameter teaching model memorizes two fictional sentences. It uses word tokens, one attention head, and one block, not GPT internals or useful general language understanding.',
  exercise: 'Follow one prediction through every step and check an equation with a calculator, see how one training update works, then inspect the causal mask and each generated token. Change the corpus and retrain before expecting new knowledge.',
  diagram: 'transformer.svg',
  cases: [
    { label: 'Train weights, then compare two contexts', computation: true },
    { label: 'Follow one prediction through every step (equations and plain words)', computation: true },
    { label: 'See one training update (equations and plain words)', computation: true },
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

const stepData = (walkthrough, id) => walkthrough?.steps?.find(step => step.id === id)?.data;

function describeForward(walkthrough, validation) {
  const attention = stepData(walkthrough, 'softmax1');
  const probabilities = stepData(walkthrough, 'probabilities');
  const wrap = walkthrough.wrapUp.data;
  const top = argmax(attention.weights);
  const ranked = probabilities.probabilities.map((probability, index) => [probabilities.words[index], probability]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  return [
    `Followed "${walkthrough.sentence}" through ${walkthrough.steps.length} steps of the trained model. Every step shows its equation, what it does in plain words, and this run's numbers.`,
    `Step ${stepNumber('softmax1')}: "${attention.word}" gives ${pct(attention.weights[top])} of its attention to "${attention.words[top]}".`,
    `Step ${stepNumber('probabilities')}: next-word probabilities: ${ranked.map(([word, probability]) => `${word} ${pct(probability)}`).join(', ')}, and so on.`,
    `Step ${stepNumber('choose')}: the greedy choice is "${stepData(walkthrough, 'choose').chosen}".`,
    `The same steps on "${wrap.sentences[1]}" end with "${wrap.chosen[1]}" (${pct(wrap.probabilities[1][vocabulary.indexOf(wrap.chosen[1])])}).`,
    `Every equation was recomputed with plain numbers: the largest difference from the model's own forward pass is ${walkthrough.maxDifferenceFromModel.toExponential(1)}, and ${validation.failures.length ? `${validation.failures.length} relations FAILED` : `${validation.checked} relations hold on the recorded numbers`}.`,
  ].join('\n');
}

function describeLearning(walkthrough, validation) {
  const loss = stepData(walkthrough, 'loss');
  const slope = stepData(walkthrough, 'slope');
  const update = stepData(walkthrough, 'update');
  const repeat = stepData(walkthrough, 'repeat');
  return [
    `One real training update of the untrained model on "${loss.sentence}".`,
    `Loss L = ${num(loss.mean, 4)} for this sentence; a model that guessed uniformly would score ${num(Math.log(vocabulary.length))}.`,
    `Slope of L for the offset of "blue": ${num(slope.backpropSlope, 6)} by backpropagation, ${num(slope.numericSlope, 6)} by nudging the number up and down.`,
    `One update moves that number from ${num(update.before, 4)} to ${num(update.after, 4)}, and the average loss over both training sentences falls from ${num(update.lossBefore, 4)} to ${num(update.lossAfter, 4)}.`,
    `After ${repeat.updates} updates the average loss is ${num(repeat.curve.at(-1).loss, 4)}.`,
    validation.failures.length ? `${validation.failures.length} relations FAILED.` : `${validation.checked} relations were re-derived from the recorded numbers.`,
  ].join('\n');
}

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
  const forwardStart = performance.now();
  const forward = buildForwardWalkthrough(model, '<bos> the robot is', '<bos> the plant is');
  results.push(makeResult(1, describeForward(forward, validateWalkthrough(forward)), { walkthrough: forward }, Math.round(performance.now() - forwardStart)));
  const learningStart = performance.now();
  const learning = buildLearningWalkthrough({ seed: model.seed, training });
  results.push(makeResult(2, describeLearning(learning, validateWalkthrough(learning)), { walkthrough: learning }, Math.round(performance.now() - learningStart)));
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
  results.push(makeResult(3,
    `Changed only the future color token at position 4 (zero-based).\n` +
    `Largest change to earlier positions 0-3 with the causal mask: ${maskedDifference}.\n` +
    `Without the mask (deliberately incorrect control): ${unmaskedDifference.toExponential(3)}.\n` +
    'The model cannot use a future answer token when predicting it.',
    { original: originalForward, changed: changedForward, changedPosition: 4, maskedDifference, unmaskedDifference },
    Math.round(performance.now() - maskStart)));
  const generationStart = performance.now();
  const generation = generateTokens(model, '<bos> the robot');
  const fingerprintAfterInference = model.fingerprint();
  results.push(makeResult(4,
    generation.steps.map(step => `${step.prefix} -> ${step.nextToken}`).join('\n') +
    `\nStop: ${generation.stopReason}. Weights unchanged during all inference: ${inferenceFingerprint === fingerprintAfterInference}.`,
    { generation, fingerprintBeforeInference: inferenceFingerprint, fingerprintAfterInference },
    Math.round(performance.now() - generationStart)));
  return results;
}

export function evaluateTransformer(results) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  if (results.length !== 5 || results.some(result => result.kind !== 'computation' || !result.computationTrace)) {
    return [{ name: 'Complete computation evidence', passed: false, detail: 'Five measured experiment variants are required.' }];
  }
  const training = results[0].computationTrace.training;
  const probes = results[0].computationTrace.probes;
  const forward = results[1].computationTrace.walkthrough;
  const learning = results[2].computationTrace.walkthrough;
  const mask = results[3].computationTrace;
  const generation = results[4].computationTrace;
  if (!forward || !learning) return [{ name: 'Complete computation evidence', passed: false, detail: 'The step-by-step walkthroughs are missing.' }];
  check('Training measurably reduces next-token loss', Number.isFinite(training.finalLoss) &&
    training.finalLoss < training.initialLoss * 0.5, `${training.initialLoss} -> ${training.finalLoss}`);
  check('Training really changes the weights', training.initialFingerprint !== training.finalFingerprint, 'SHA-256 before/after training differs.');
  check('Earlier context changes the next-token prediction', probes[0].distribution.find(entry => entry.token === 'blue').probability > 0.85 &&
    probes[1].distribution.find(entry => entry.token === 'green').probability > 0.85, 'P(blue | robot) and P(green | plant) both exceed 0.85.');
  check('All displayed probabilities are normalized', probes.every(probe => probe.probabilities.every(row =>
    row.every(value => Number.isFinite(value) && value >= 0 && value <= 1) &&
    Math.abs(row.reduce((total, value) => total + value, 0) - 1) < 1e-10)), 'Every displayed prediction distribution sums to 1.');
  const forwardValidation = validateWalkthrough(forward);
  check('The step-by-step walkthrough shows plain words, an equation and real numbers for every step, and each equation reproduces the recorded numbers',
    forward?.kind === 'forward' && forwardValidation.failures.length === 0,
    forwardValidation.failures.length ? forwardValidation.failures.slice(0, 3).join('; ') : `${forwardValidation.checked} relations re-derived from the recorded numbers; largest error ${forwardValidation.maxError.toExponential(2)}.`);
  check('The plain-number walkthrough matches the transformer\'s own forward pass', forward.maxDifferenceFromModel < 1e-9,
    `Largest difference across every vector, score and probability: ${Number(forward.maxDifferenceFromModel).toExponential(2)}.`);
  check('The walkthrough follows the same trained model as the first experiment',
    forward.words?.join(' ') === probes[0].tokens.join(' ') && stepData(forward, 'probabilities')?.probabilities?.every((value, index) => Math.abs(value - probes[0].probabilities.at(-1)[index]) < 1e-9),
    'Its final probabilities equal the recorded robot-context prediction.');
  const learningValidation = validateWalkthrough(learning);
  check('The training-update walkthrough agrees with the real training: the slope matches a nudge test, one update lowers the loss, and the loss curve is the recorded one',
    learning.kind === 'learning' && learningValidation.failures.length === 0 && JSON.stringify(stepData(learning, 'repeat')?.curve) === JSON.stringify(training.curve),
    learningValidation.failures.length ? learningValidation.failures.slice(0, 3).join('; ') : `${learningValidation.checked} relations re-derived from the recorded numbers.`);
  check('Attention cannot look ahead', mask.original.attention.every((row, i) =>
    row.every((value, j) => j <= i || value === 0)) && mask.maskedDifference < 1e-12 && mask.unmaskedDifference > 1e-6,
  `Masked difference: ${mask.maskedDifference}; deliberately unmasked control: ${mask.unmaskedDifference}.`);
  check('Generation appends measured next-token predictions', generation.generation.tokens.join(' ') === '<bos> the robot is blue . <eos>' &&
    generation.generation.stopReason === 'eos' && generation.generation.steps.every((step, index, steps) =>
      step.distribution[0].token === step.nextToken &&
      (index === 0 || step.prefix === `${steps[index - 1].prefix} ${steps[index - 1].nextToken}`)),
  generation.generation.tokens.join(' '));
  check('Prompting and generation leave weights unchanged', generation.fingerprintBeforeInference === generation.fingerprintAfterInference,
    'SHA-256 before/after the walkthrough, the masked/unmasked probes and generation is identical.');
  check('Toy computation is not reported as API usage', results.every(result => result.apiRequests === 0 && result.usage === null),
    'Zero model API requests; toy training tokens are separate from API billing tokens.');
  return checks;
}
