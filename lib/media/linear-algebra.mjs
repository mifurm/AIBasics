export const dot = (a, b) => {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i] * b[i];
  return total;
};

export function cosine(a, b) {
  if (a.length !== b.length || !a.length) throw new Error('Vectors must be nonempty and equally sized.');
  const denominator = Math.sqrt(dot(a, a) * dot(b, b));
  if (!denominator || !Number.isFinite(denominator)) throw new Error('Cannot compare zero or non-finite vectors.');
  return dot(a, b) / denominator;
}

// Two principal components of the vectors via power iteration on the n-by-n Gram matrix.
export function pca2d(vectors) {
  const n = vectors.length;
  if (n < 3) throw new Error('PCA needs at least three vectors.');
  const dimension = vectors[0].length;
  const mean = new Float64Array(dimension);
  for (const vector of vectors) for (let j = 0; j < dimension; j++) mean[j] += vector[j] / n;
  const centered = vectors.map(vector => Float64Array.from(vector, (value, j) => value - mean[j]));
  const gram = centered.map(a => Float64Array.from(centered, b => dot(a, b)));
  const trace = gram.reduce((sum, row, i) => sum + row[i], 0);
  const components = [];
  for (let component = 0; component < 2; component++) {
    let vector = Float64Array.from({ length: n }, (_, i) => 1 + ((i * 7 + component * 3) % 11) / 11);
    let eigenvalue = 0;
    for (let iteration = 0; iteration < 600; iteration++) {
      const next = Float64Array.from(gram, row => dot(row, vector));
      const length = Math.hypot(...next);
      if (!length) break;
      vector = next.map(value => value / length);
      eigenvalue = length;
    }
    const anchor = vector.reduce((best, value, i) => (Math.abs(value) > Math.abs(vector[best]) ? i : best), 0);
    if (vector[anchor] < 0) vector = vector.map(value => -value);
    components.push({ vector, eigenvalue });
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) gram[i][j] -= eigenvalue * vector[i] * vector[j];
  }
  return {
    coordinates: Array.from({ length: n }, (_, i) => components.map(({ vector, eigenvalue }) => Math.sqrt(Math.max(0, eigenvalue)) * vector[i])),
    explainedVariance: components.map(({ eigenvalue }) => eigenvalue / trace),
  };
}

export function entropyBits(probabilities) {
  return probabilities.reduce((sum, p) => (p > 0 ? sum - p * Math.log2(p) : sum), 0);
}

export function totalVariationDistance(a, b) {
  if (a.length !== b.length) throw new Error('Distributions must have the same support.');
  return 0.5 * a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);
}
