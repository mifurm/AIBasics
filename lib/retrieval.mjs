export function cosineSimilarity(a, b) {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) {
    throw new Error('Embedding vectors must be finite, nonempty, and equally sized.');
  }
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  if (!normA || !normB) throw new Error('Cannot compare zero-length embedding vectors.');
  return dot / Math.sqrt(normA * normB);
}

export function rankCards(cards, vectors, queryVector) {
  if (cards.length !== vectors.length) throw new Error('Each memory card needs exactly one embedding.');
  return cards.map((card, index) => ({ ...card, similarity: cosineSimilarity(vectors[index], queryVector) }))
    .sort((a, b) => b.similarity - a.similarity);
}
