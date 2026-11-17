// A plain-number re-implementation of the tiny transformer's forward pass. It is written to read like the
// equations on the teaching page, and it is cross-checked against the model's own (autograd) forward pass.
export const EPSILON = 1e-5;

export const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
export const addVectors = (a, b) => a.map((value, index) => value + b[index]);
export const linear = (layer, x) => layer.weight.map((row, index) => dot(row, x) + layer.bias[index]);
export const argmax = values => values.reduce((best, value, index) => (value > values[best] ? index : best), 0);

export function normalize(layer, x) {
  const mean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const centered = x.map(value => value - mean);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / x.length;
  const spread = Math.sqrt(variance + EPSILON);
  const standardized = centered.map(value => value / spread);
  return {
    input: x, mean, variance, spread, centered, standardized, gain: layer.gain, offset: layer.bias,
    output: standardized.map((value, index) => value * layer.gain[index] + layer.bias[index]),
  };
}

export function softmax(scores) {
  const exps = scores.map(Math.exp);
  const total = exps.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error('Softmax needs scores small enough for exp() to stay finite.');
  return { exps, total, probabilities: exps.map(value => value / total) };
}

export function referenceForward(weights, ids) {
  const width = weights.tokenEmbedding[0].length;
  const embeddings = ids.map(id => weights.tokenEmbedding[id]);
  const positions = ids.map((_, index) => weights.positionEmbedding[index]);
  const input = embeddings.map((row, index) => addVectors(row, positions[index]));
  const norm1 = input.map(row => normalize(weights.norm1, row));
  const normalized = norm1.map(entry => entry.output);
  const queries = normalized.map(row => linear(weights.query, row));
  const keys = normalized.map(row => linear(weights.key, row));
  const values = normalized.map(row => linear(weights.value, row));
  const scale = Math.sqrt(width);
  const dots = queries.map((query, i) => keys.slice(0, i + 1).map(key => dot(query, key)));
  const scores = dots.map(row => row.map(value => value / scale));
  const attention = scores.map(softmax);
  const attentionMatrix = attention.map((entry, i) => ids.map((_, j) => (j <= i ? entry.probabilities[j] : 0)));
  const mixed = attention.map(entry => values[0].map((_, k) => entry.probabilities.reduce((sum, weight, j) => sum + weight * values[j][k], 0)));
  const attentionOutput = mixed.map(row => linear(weights.projection, row));
  const residual1 = input.map((row, index) => addVectors(row, attentionOutput[index]));
  const norm2 = residual1.map(row => normalize(weights.norm2, row));
  const ffNormalized = norm2.map(entry => entry.output);
  const ffPre = ffNormalized.map(row => linear(weights.expand, row));
  const ffHidden = ffPre.map(row => row.map(value => Math.max(0, value)));
  const ffOutput = ffHidden.map(row => linear(weights.contract, row));
  const residual2 = residual1.map((row, index) => addVectors(row, ffOutput[index]));
  const norm3 = residual2.map(row => normalize(weights.finalNorm, row));
  const finalNormalized = norm3.map(entry => entry.output);
  const logits = finalNormalized.map(row => linear(weights.readout, row));
  const output = logits.map(softmax);
  return {
    ids, width, scale, embeddings, positions, input, norm1, normalized, queries, keys, values, dots, scores, attention, attentionMatrix,
    mixed, attentionOutput, residual1, norm2, ffNormalized, ffPre, ffHidden, ffOutput, residual2, norm3, finalNormalized, logits, output,
    probabilities: output.map(entry => entry.probabilities),
  };
}

const flat = value => (Array.isArray(value) ? value.flatMap(flat) : [value]);

// The largest absolute difference between this implementation and the model's own recorded forward pass.
export function maxDifferenceFromTrace(reference, trace) {
  const pairs = [
    [reference.embeddings, trace.tokenEmbeddings], [reference.positions, trace.positionEmbeddings], [reference.input, trace.input],
    [reference.normalized, trace.normalized], [reference.queries, trace.queries], [reference.keys, trace.keys], [reference.values, trace.values],
    [reference.scores.map((row, i) => reference.scores.map((_, j) => (j <= i ? row[j] : null))), trace.scaledAttentionScores],
    [reference.attentionMatrix, trace.attention], [reference.mixed, trace.mixed], [reference.attentionOutput, trace.attentionOutput],
    [reference.residual1, trace.residual1], [reference.ffNormalized, trace.ffNormalized], [reference.ffHidden, trace.ffHidden],
    [reference.ffOutput, trace.ffOutput], [reference.residual2, trace.residual2], [reference.finalNormalized, trace.finalNormalized],
    [reference.logits, trace.logits], [reference.probabilities, trace.probabilities],
  ];
  let largest = 0;
  for (const [mine, theirs] of pairs) {
    const a = flat(mine);
    const b = flat(theirs);
    if (a.length !== b.length) throw new Error('Reference forward pass has a different shape from the model trace.');
    a.forEach((value, index) => {
      if (value === null || b[index] === null) {
        if (value !== b[index]) throw new Error('Reference forward pass masks different entries from the model trace.');
      } else largest = Math.max(largest, Math.abs(value - b[index]));
    });
  }
  return largest;
}
