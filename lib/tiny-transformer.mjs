import { createHash } from 'node:crypto';

export class Scalar {
  constructor(data, parents = []) {
    this.data = data;
    this.grad = 0;
    this.parents = parents;
    this.pullback = () => {};
  }
  add(other) {
    const b = other instanceof Scalar ? other : new Scalar(other);
    const out = new Scalar(this.data + b.data, [this, b]);
    out.pullback = () => { this.grad += out.grad; b.grad += out.grad; };
    return out;
  }
  mul(other) {
    const b = other instanceof Scalar ? other : new Scalar(other);
    const out = new Scalar(this.data * b.data, [this, b]);
    out.pullback = () => { this.grad += b.data * out.grad; b.grad += this.data * out.grad; };
    return out;
  }
  pow(power) {
    const out = new Scalar(this.data ** power, [this]);
    out.pullback = () => { this.grad += power * this.data ** (power - 1) * out.grad; };
    return out;
  }
  exp() {
    const out = new Scalar(Math.exp(this.data), [this]);
    out.pullback = () => { this.grad += out.data * out.grad; };
    return out;
  }
  log() {
    const out = new Scalar(Math.log(this.data), [this]);
    out.pullback = () => { this.grad += out.grad / this.data; };
    return out;
  }
  relu() {
    const out = new Scalar(Math.max(0, this.data), [this]);
    out.pullback = () => { this.grad += (this.data > 0 ? 1 : 0) * out.grad; };
    return out;
  }
  backward() {
    const ordered = [];
    const visited = new Set();
    const visit = node => {
      if (visited.has(node)) return;
      visited.add(node);
      for (const parent of node.parents) visit(parent);
      ordered.push(node);
    };
    visit(this);
    for (const node of ordered) node.grad = 0;
    this.grad = 1;
    for (let index = ordered.length - 1; index >= 0; index--) ordered[index].pullback();
  }
}

export const vocabulary = ['<bos>', 'the', 'robot', 'plant', 'is', 'blue', 'green', '.', '<eos>'];
export const trainingText = ['the robot is blue .', 'the plant is green .'];
const width = 8;
const contextLength = 8;
const sum = values => values.reduce((a, b) => a.add(b), new Scalar(0));
const dot = (a, b) => sum(a.map((value, index) => value.mul(b[index])));
const vectorAdd = (a, b) => a.map((value, index) => value.add(b[index]));
const data = rows => rows.map(row => row.map(value => value.data));
const softmax = values => {
  const maximum = Math.max(...values.map(value => value.data));
  const exponentials = values.map(value => value.add(-maximum).exp());
  const inverse = sum(exponentials).pow(-1);
  return exponentials.map(value => value.mul(inverse));
};

export function tokenize(text) {
  const words = text.trim().split(/\s+/);
  return words.map(word => {
    const id = vocabulary.indexOf(word);
    if (id < 0) throw new Error(`Unknown teaching token "${word}". Vocabulary is fixed; this is word-level tokenization.`);
    return id;
  });
}

export function createTinyTransformer(seed = 42) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const parameters = [];
  const scalar = value => {
    const parameter = new Scalar(value);
    parameters.push(parameter);
    return parameter;
  };
  const matrix = (rows, columns) => Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => scalar((random() - 0.5) * 0.4)));
  const linear = (inputs, outputs) => ({
    weight: matrix(outputs, inputs), bias: Array.from({ length: outputs }, () => scalar(0)),
  });
  const normalization = () => ({
    gain: Array.from({ length: width }, () => scalar(1)),
    bias: Array.from({ length: width }, () => scalar(0)),
  });
  const tokenEmbedding = matrix(vocabulary.length, width);
  const positionEmbedding = matrix(contextLength, width);
  const query = linear(width, width);
  const key = linear(width, width);
  const value = linear(width, width);
  const projection = linear(width, width);
  const expand = linear(width, 16);
  const contract = linear(16, width);
  const readout = linear(width, vocabulary.length);
  const norm1 = normalization();
  const norm2 = normalization();
  const finalNorm = normalization();
  const project = (x, layer) => layer.weight.map((row, index) => dot(x, row).add(layer.bias[index]));
  const normalize = (x, layer) => {
    const mean = sum(x).mul(1 / width);
    const centered = x.map(element => element.add(mean.mul(-1)));
    const inverseStd = sum(centered.map(element => element.pow(2))).mul(1 / width).add(1e-5).pow(-0.5);
    return centered.map((element, index) => element.mul(inverseStd).mul(layer.gain[index]).add(layer.bias[index]));
  };
  function forward(ids, { causal = true, inspect = false } = {}) {
    if (!Array.isArray(ids) || !ids.length || ids.length > contextLength ||
        ids.some(id => !Number.isInteger(id) || id < 0 || id >= vocabulary.length)) {
      throw new Error(`Supply 1-${contextLength} valid teaching token IDs.`);
    }
    const embeddings = ids.map(id => tokenEmbedding[id]);
    const positions = ids.map((_, index) => positionEmbedding[index]);
    const input = embeddings.map((row, index) => vectorAdd(row, positions[index]));
    const normalized = input.map(row => normalize(row, norm1));
    const queries = normalized.map(row => project(row, query));
    const keys = normalized.map(row => project(row, key));
    const values = normalized.map(row => project(row, value));
    const scores = queries.map((q, index) => keys.slice(0, causal ? index + 1 : ids.length)
      .map(k => dot(q, k).mul(1 / Math.sqrt(width))));
    const attention = scores.map(softmax);
    const mixed = attention.map(row => Array.from({ length: width }, (_, column) =>
      sum(row.map((weight, index) => weight.mul(values[index][column])))));
    const attentionOutput = mixed.map(row => project(row, projection));
    const residual1 = input.map((row, index) => vectorAdd(row, attentionOutput[index]));
    const ffNormalized = residual1.map(row => normalize(row, norm2));
    const ffHidden = ffNormalized.map(row => project(row, expand).map(element => element.relu()));
    const ffOutput = ffHidden.map(row => project(row, contract));
    const residual2 = residual1.map((row, index) => vectorAdd(row, ffOutput[index]));
    const final = residual2.map(row => normalize(row, finalNorm));
    const logits = final.map(row => project(row, readout));
    const probabilities = logits.map(softmax);
    return {
      logits, probabilities,
      ...(inspect ? { trace: {
        tokens: ids.map(id => vocabulary[id]), tokenIds: [...ids],
        tokenEmbeddings: data(embeddings), positionEmbeddings: data(positions), input: data(input),
        normalized: data(normalized), queries: data(queries), keys: data(keys), values: data(values),
        scaledAttentionScores: scores.map(row => Array.from({ length: ids.length }, (_, index) => row[index]?.data ?? null)),
        attention: attention.map(row => Array.from({ length: ids.length }, (_, index) => row[index]?.data ?? 0)),
        mixed: data(mixed), attentionOutput: data(attentionOutput), residual1: data(residual1),
        ffNormalized: data(ffNormalized), ffHidden: data(ffHidden), ffOutput: data(ffOutput),
        residual2: data(residual2), finalNormalized: data(final), logits: data(logits), probabilities: data(probabilities),
      } } : {}),
    };
  }
  function loss(ids) {
    if (ids.length < 2) throw new Error('Training requires an input token and a next-token target.');
    const prediction = forward(ids.slice(0, -1)).probabilities;
    return sum(prediction.map((row, index) => row[ids[index + 1]].log().mul(-1))).mul(1 / prediction.length);
  }
  const layers = {
    tokenEmbedding, positionEmbedding, norm1, query, key, value, projection, norm2, expand, contract, finalNorm, readout,
  };
  const linearData = layer => ({ weight: data(layer.weight), bias: layer.bias.map(element => element.data) });
  const normalizationData = layer => ({ gain: layer.gain.map(element => element.data), bias: layer.bias.map(element => element.data) });
  return {
    seed, parameters, forward, loss, width, contextLength, layers,
    // A plain-number copy of every learned table, for teaching code that recomputes the forward pass independently.
    weights: () => ({
      tokenEmbedding: data(tokenEmbedding), positionEmbedding: data(positionEmbedding),
      norm1: normalizationData(norm1), query: linearData(query), key: linearData(key), value: linearData(value), projection: linearData(projection),
      norm2: normalizationData(norm2), expand: linearData(expand), contract: linearData(contract),
      finalNorm: normalizationData(finalNorm), readout: linearData(readout),
    }),
    fingerprint: () => createHash('sha256').update(JSON.stringify(parameters.map(parameter => parameter.data))).digest('hex'),
  };
}

export function trainTinyTransformer(model, steps = 400) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 2000) throw new Error('Training steps must be an integer from 1 to 2000.');
  const sequences = trainingText.map(text => tokenize(`<bos> ${text} <eos>`));
  const averageLoss = () => sequences.reduce((total, ids) => total + model.loss(ids).data, 0) / sequences.length;
  const initialLoss = averageLoss();
  const initialFingerprint = model.fingerprint();
  const firstMoment = model.parameters.map(() => 0);
  const secondMoment = model.parameters.map(() => 0);
  const curve = [{ step: 0, loss: initialLoss }];
  for (let step = 1; step <= steps; step++) {
    const loss = model.loss(sequences[(step - 1) % sequences.length]);
    if (!Number.isFinite(loss.data)) throw new Error(`Training loss is not finite at step ${step}.`);
    for (const parameter of model.parameters) parameter.grad = 0;
    loss.backward();
    model.parameters.forEach((parameter, index) => {
      if (!Number.isFinite(parameter.grad)) throw new Error(`Training gradient is not finite at step ${step}.`);
      const gradient = Math.max(-1, Math.min(1, parameter.grad));
      firstMoment[index] = 0.9 * firstMoment[index] + 0.1 * gradient;
      secondMoment[index] = 0.999 * secondMoment[index] + 0.001 * gradient ** 2;
      parameter.data -= 0.02 * (firstMoment[index] / (1 - 0.9 ** step)) /
        (Math.sqrt(secondMoment[index] / (1 - 0.999 ** step)) + 1e-8);
      if (!Number.isFinite(parameter.data)) throw new Error(`Training produced an invalid parameter at step ${step}.`);
    });
    if (step % 100 === 0 || step === steps) curve.push({ step, loss: averageLoss() });
  }
  return {
    optimizer: 'Adam', learningRate: 0.02, gradientClip: 1, seed: model.seed, steps,
    corpus: trainingText, sequences: sequences.map(ids => ({ input: ids.slice(0, -1), targets: ids.slice(1) })),
    trainingTokens: steps * (sequences[0].length - 1),
    initialLoss, finalLoss: curve.at(-1).loss, curve, initialFingerprint, finalFingerprint: model.fingerprint(),
  };
}

export function inspectPrediction(model, text) {
  const ids = tokenize(text);
  const { trace } = model.forward(ids, { inspect: true });
  const probabilities = trace.probabilities.at(-1);
  return {
    prefix: text, ...trace,
    distribution: vocabulary.map((token, index) => ({ token, probability: probabilities[index] }))
      .sort((a, b) => b.probability - a.probability),
  };
}

export function generateTokens(model, prefix, maxNewTokens = 5) {
  const ids = tokenize(prefix);
  if (!Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > model.contextLength - ids.length) {
    throw new Error('Generation must fit inside the teaching context window.');
  }
  const steps = [];
  for (let index = 0; index < maxNewTokens; index++) {
    const prediction = inspectPrediction(model, ids.map(id => vocabulary[id]).join(' '));
    const selected = prediction.distribution[0];
    steps.push({ prefix: prediction.prefix, nextToken: selected.token, distribution: prediction.distribution });
    ids.push(vocabulary.indexOf(selected.token));
    if (selected.token === '<eos>') break;
  }
  return { strategy: 'greedy argmax (not sampling)', steps, tokens: ids.map(id => vocabulary[id]),
    stopReason: ids.at(-1) === vocabulary.indexOf('<eos>') ? 'eos' : 'token_limit' };
}
