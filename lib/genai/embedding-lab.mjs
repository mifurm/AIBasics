import { cosine, pca2d } from '../media/linear-algebra.mjs';
import { experimentResult, table, image, text } from './contract.mjs';

export const topicColors = { animals: '#d27818', cooking: '#19777b', space: '#3b4ea8', sports: '#b03a48' };
export const sentencePairs = [
  { topic: 'animals', short: 'dog', en: 'The dog barked at the cat in the garden.', pl: 'Pies szczekał na kota w ogrodzie.' },
  { topic: 'animals', short: 'lion', en: 'A hungry lion hunted a zebra on the savanna.', pl: 'Głodny lew polował na zebrę na sawannie.' },
  { topic: 'animals', short: 'parrot', en: 'The parrot learned to repeat human words.', pl: 'Papuga nauczyła się powtarzać ludzkie słowa.' },
  { topic: 'cooking', short: 'soup', en: 'She stirred the soup and added a pinch of salt.', pl: 'Zamieszała zupę i dodała szczyptę soli.' },
  { topic: 'cooking', short: 'bread', en: 'Bake the bread for forty minutes until golden.', pl: 'Piecz chleb przez czterdzieści minut, aż się zarumieni.' },
  { topic: 'cooking', short: 'onion', en: 'He chopped onions and garlic for the sauce.', pl: 'Pokroił cebulę i czosnek na sos.' },
  { topic: 'space', short: 'rocket', en: 'The rocket left the launch pad at sunrise.', pl: 'Rakieta opuściła wyrzutnię o wschodzie słońca.' },
  { topic: 'space', short: 'galaxy', en: 'Astronomers photographed a distant galaxy.', pl: 'Astronomowie sfotografowali odległą galaktykę.' },
  { topic: 'space', short: 'probe', en: 'The probe orbited the red planet for a year.', pl: 'Sonda krążyła wokół czerwonej planety przez rok.' },
  { topic: 'sports', short: 'striker', en: 'The striker scored in the final minute of the match.', pl: 'Napastnik strzelił gola w ostatniej minucie meczu.' },
  { topic: 'sports', short: 'marathon', en: 'She won the marathon in under three hours.', pl: 'Wygrała maraton w czasie poniżej trzech godzin.' },
  { topic: 'sports', short: 'drill', en: 'The team practiced passing drills before the game.', pl: 'Drużyna ćwiczyła podania przed meczem.' },
];
export const bankProbe = {
  query: 'I need to open a bank account.',
  candidates: [
    { id: 'trap', kind: 'Shares the word "bank", different meaning', text: 'He fished from the muddy river bank.' },
    { id: 'paraphrase', kind: 'Shares no key words, same meaning', text: 'I would like to set up a savings account with a lender.' },
    { id: 'both', kind: 'Shares the word and the meaning', text: 'She deposited her paycheck at the bank.' },
  ],
};
const COUNT = sentencePairs.length;
export const embeddingInputs = [...sentencePairs.map(pair => pair.en), ...sentencePairs.map(pair => pair.pl), bankProbe.query, ...bankProbe.candidates.map(candidate => candidate.text)];

const items = [...sentencePairs.map((pair, index) => ({ ...pair, language: 'English', pair: index })), ...sentencePairs.map((pair, index) => ({ ...pair, language: 'Polish', pair: index }))];
const mean = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const norm = vector => Math.hypot(...vector);

export function analyzeVectors(vectors) {
  const sentenceVectors = vectors.slice(0, 2 * COUNT);
  let nearestCorrect = 0;
  const within = [];
  const between = [];
  items.forEach((item, i) => {
    let best = -2;
    let bestTopic;
    items.forEach((other, j) => {
      if (i === j || other.pair === item.pair) return;
      const similarity = cosine(sentenceVectors[i], sentenceVectors[j]);
      if (j > i) (other.topic === item.topic ? within : between).push(similarity);
      if (similarity > best) { best = similarity; bestTopic = other.topic; }
    });
    if (bestTopic === item.topic) nearestCorrect++;
  });
  const groups = { sameLanguageSameTopic: [], sameLanguageOtherTopic: [], otherLanguageSameTopic: [], otherLanguageOtherTopic: [] };
  items.forEach((a, i) => items.forEach((b, j) => {
    if (j <= i || a.pair === b.pair) return;
    const key = `${a.language === b.language ? 'sameLanguage' : 'otherLanguage'}${a.topic === b.topic ? 'SameTopic' : 'OtherTopic'}`;
    groups[key].push(cosine(sentenceVectors[i], sentenceVectors[j]));
  }));
  const retrieve = (from, to) => Array.from({ length: COUNT }, (_, i) => {
    const similarities = Array.from({ length: COUNT }, (_, j) => cosine(sentenceVectors[from * COUNT + i], sentenceVectors[to * COUNT + j]));
    const rank = 1 + similarities.filter(value => value > similarities[i]).length;
    return { pair: i, similarity: similarities[i], rank };
  });
  const toPolish = retrieve(0, 1);
  const toEnglish = retrieve(1, 0);
  return {
    sentences: items.length, topicNeighborAccuracy: nearestCorrect / items.length,
    withinTopicMean: mean(within), betweenTopicMean: mean(between),
    languageTopicMeans: Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, mean(values)])),
    englishToPolishTop1: toPolish.filter(entry => entry.rank === 1).length / COUNT,
    polishToEnglishTop1: toEnglish.filter(entry => entry.rank === 1).length / COUNT,
    translations: toPolish.map(entry => ({ ...entry, short: sentencePairs[entry.pair].short })),
    translationMean: mean(toPolish.map(entry => entry.similarity)),
    bank: bankProbe.candidates.map((candidate, index) => ({ ...candidate, similarity: cosine(vectors[2 * COUNT], vectors[2 * COUNT + 1 + index]) })),
  };
}

export function similarityAgreement(a, b) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { xs.push(cosine(a[i], a[j])); ys.push(cosine(b[i], b[j])); }
  const mx = mean(xs);
  const my = mean(ys);
  const covariance = xs.reduce((sum, x, k) => sum + (x - mx) * (ys[k] - my), 0);
  return covariance / Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0) * ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
}

const escapeXml = value => value.replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

export function scatterSvg(coordinates, explained) {
  const width = 760;
  const height = 480;
  const pad = 46;
  const xs = coordinates.map(point => point[0]);
  const ys = coordinates.map(point => point[1]);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const place = point => [pad + ((point[0] - Math.min(...xs)) / spanX) * (width - 2 * pad - 130), pad + ((point[1] - Math.min(...ys)) / spanY) * (height - 2 * pad)];
  const placed = coordinates.map(place);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d">`,
    '<title id="t">Two-dimensional map of sentence embeddings</title>',
    `<desc id="d">Twenty-four sentences in four topics, English as circles and Polish translations as squares, projected from the embedding space to two principal components explaining ${(100 * (explained[0] + explained[1])).toFixed(1)} percent of variance.</desc>`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`];
  for (let i = 0; i < COUNT; i++) parts.push(`<line x1="${placed[i][0].toFixed(1)}" y1="${placed[i][1].toFixed(1)}" x2="${placed[COUNT + i][0].toFixed(1)}" y2="${placed[COUNT + i][1].toFixed(1)}" stroke="#9fb0bd" stroke-width="1" stroke-dasharray="3 3"/>`);
  items.forEach((item, index) => {
    const [x, y] = placed[index];
    const color = topicColors[item.topic];
    parts.push(item.language === 'English' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${color}"/>` : `<rect x="${(x - 5.5).toFixed(1)}" y="${(y - 5.5).toFixed(1)}" width="11" height="11" fill="${color}"/>`);
    parts.push(`<text x="${(x + 9).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-family="sans-serif" font-size="11" fill="#152c40">${escapeXml(item.short)}</text>`);
  });
  Object.entries(topicColors).forEach(([topic, color], index) => {
    parts.push(`<rect x="${width - 120}" y="${50 + index * 22}" width="12" height="12" fill="${color}"/><text x="${width - 102}" y="${61 + index * 22}" font-family="sans-serif" font-size="13" fill="#152c40">${topic}</text>`);
  });
  parts.push(`<circle cx="${width - 114}" cy="160" r="6" fill="#526c7e"/><text x="${width - 102}" y="165" font-family="sans-serif" font-size="12" fill="#152c40">English</text>`,
    `<rect x="${width - 120}" y="178" width="11" height="11" fill="#526c7e"/><text x="${width - 102}" y="188" font-family="sans-serif" font-size="12" fill="#152c40">Polish</text>`,
    `<text x="${pad}" y="${height - 14}" font-family="sans-serif" font-size="12" fill="#526c7e">PC1 ${(100 * explained[0]).toFixed(1)}% and PC2 ${(100 * explained[1]).toFixed(1)}% of variance. Dashed lines join translations.</text></svg>`);
  return parts.join('\n');
}

const labels = [
  'Embed 24 sentences and draw the map',
  'Translations land next to each other',
  'Shared words versus shared meaning',
  'Shorter vectors: 256 dimensions instead of 1536',
];
const fixed = (value, digits = 3) => Number(value.toFixed(digits));
const pct = value => `${(100 * value).toFixed(0)}%`;

export const embeddingLab = {
  id: '31-embedding-space', title: 'Meaning as geometry', minutes: 10, series: 'genai',
  concept: 'An embedding turns text into a point in a high-dimensional space where similar meanings are close. That geometry is what retrieval, clustering, and cross-language search measure.',
  question: 'Why can a Polish sentence be closest to its English translation even though they share almost no words?',
  caveat: 'The 2D map is a projection that discards most of the information, so distances in it are only hints. Cosine similarity values are model-specific and are not probabilities. These are twelve hand-written sentences, not a benchmark.',
  exercise: 'Replace one topic with your own and write translations in a language you know. Predict which sentences will sit between topics before you redeploy.',
  cases: labels.map(label => ({ label, experiment: true })),
  async run(ctx) {
    let started = performance.now();
    const full = await ctx.azure.embed(embeddingInputs);
    const analysis = analyzeVectors(full.vectors);
    const projection = pca2d(full.vectors.slice(0, 2 * COUNT));
    const svg = ctx.artifacts.add({ id: 'sentence-map', extension: 'svg', data: Buffer.from(scatterSvg(projection.coordinates, projection.explainedVariance)), description: 'Two-dimensional PCA map of 24 sentences: four topics, English circles and Polish squares.' });
    const dimension = full.vectors[0].length;
    const norms = full.vectors.map(norm);
    ctx.addResult(experimentResult({
      label: labels[0], startedAt: started, calls: [full.call], artifacts: [svg],
      summary: `Embed 12 English sentences, their 12 Polish translations, and 4 probe sentences in one request to the embedding deployment. Each becomes a ${dimension}-number vector. Compare vectors with cosine similarity and project to 2D with PCA.`,
      output: `${dimension}-dimensional vectors, 28 inputs.\nFor ${pct(analysis.topicNeighborAccuracy)} of the 24 sentences, the nearest other sentence (not counting its own translation) shares its topic.\nMean cosine within a topic ${fixed(analysis.withinTopicMean)} versus between topics ${fixed(analysis.betweenTopicMean)}.\nThe map's two axes keep ${(100 * (projection.explainedVariance[0] + projection.explainedVariance[1])).toFixed(1)}% of the variance.`,
      measurements: { dimension, inputs: embeddingInputs.length, normRange: [Math.min(...norms), Math.max(...norms)], analysis, explainedVariance: projection.explainedVariance, coordinates: projection.coordinates },
      display: [
        image(svg, 'Each dot is one sentence. Colors are topics, circles are English and squares are Polish. Dashed lines join translations.', 'Scatter plot of sentence embeddings grouped by topic'),
        table('How well does the geometry separate topics?', ['Measurement', 'Value'], [
          ['Vector length', dimension], ['Nearest neighbour (excluding itself and its translation) has the same topic', pct(analysis.topicNeighborAccuracy)],
          ['Mean cosine, same topic', fixed(analysis.withinTopicMean)], ['Mean cosine, different topic', fixed(analysis.betweenTopicMean)],
          ['Variance kept by the two map axes', `${(100 * (projection.explainedVariance[0] + projection.explainedVariance[1])).toFixed(1)}%`],
        ]),
        table('Embeddings carry language as well as meaning (mean cosine)', ['Sentence pair', 'Mean cosine'], [
          ['Same language, same topic', fixed(analysis.languageTopicMeans.sameLanguageSameTopic)], ['Same language, different topic', fixed(analysis.languageTopicMeans.sameLanguageOtherTopic)],
          ['Different language, same topic', fixed(analysis.languageTopicMeans.otherLanguageSameTopic)], ['Different language, different topic', fixed(analysis.languageTopicMeans.otherLanguageOtherTopic)],
        ]),
        text('Chance would make a sentence\'s nearest neighbour share its topic about 18% of the time. Misses are often reasonable: a sentence can sit between topics because embeddings capture scenes, verbs, and language, not only a topic label.'),
      ],
    }));
    started = performance.now();
    ctx.addResult(experimentResult({
      label: labels[1], startedAt: started,
      summary: 'No new API request: reuse the vectors from the first variant. For each English sentence, rank its Polish translation among all twelve Polish sentences by cosine similarity.',
      output: `English to Polish: the true translation is the closest Polish sentence for ${pct(analysis.englishToPolishTop1)} of sentences. Polish to English: ${pct(analysis.polishToEnglishTop1)}.\nMean translation cosine ${fixed(analysis.translationMean)}.`,
      measurements: { englishToPolishTop1: analysis.englishToPolishTop1, polishToEnglishTop1: analysis.polishToEnglishTop1, translations: analysis.translations },
      display: [table('Is the translation the nearest Polish sentence?', ['English', 'Polish translation', 'Cosine similarity', 'Rank among 12 Polish sentences'],
        analysis.translations.map(entry => [sentencePairs[entry.pair].en, sentencePairs[entry.pair].pl, fixed(entry.similarity), entry.rank]))],
    }));
    started = performance.now();
    const ranked = [...analysis.bank].sort((a, b) => b.similarity - a.similarity);
    ctx.addResult(experimentResult({
      label: labels[2], startedAt: started,
      summary: `No new API request. Compare "${bankProbe.query}" with a sentence that shares the word but not the meaning, one that shares the meaning but no key words, and one that shares both.`,
      output: ranked.map((entry, index) => `${index + 1}. ${fixed(entry.similarity)}  ${entry.kind}: "${entry.text}"`).join('\n'),
      measurements: { query: bankProbe.query, candidates: analysis.bank },
      display: [table(`Closest to "${bankProbe.query}"`, ['Rank', 'Candidate', 'What it shares', 'Cosine similarity'],
        ranked.map((entry, index) => [index + 1, entry.text, entry.kind, fixed(entry.similarity)]))],
    }));
    started = performance.now();
    const reduced = await ctx.azure.embed(embeddingInputs, { dimensions: 256 });
    const small = analyzeVectors(reduced.vectors);
    const agreement = similarityAgreement(full.vectors, reduced.vectors);
    ctx.addResult(experimentResult({
      label: labels[3], startedAt: started, calls: [reduced.call],
      summary: 'Request the same 28 inputs with dimensions=256. The model returns shorter vectors that are 6 times smaller to store and compare. Measure how much of the geometry survives.',
      output: `256 numbers instead of ${dimension}. Topic neighbours ${pct(small.topicNeighborAccuracy)} (full ${pct(analysis.topicNeighborAccuracy)}); translation retrieval ${pct(small.englishToPolishTop1)} (full ${pct(analysis.englishToPolishTop1)}).\nCorrelation between full and short similarity scores: ${fixed(agreement)}.`,
      measurements: { dimension: reduced.vectors[0].length, normRange: [Math.min(...reduced.vectors.map(norm)), Math.max(...reduced.vectors.map(norm))], analysis: small, agreement },
      display: [table('Full versus shortened vectors', ['Measurement', `${dimension} dimensions`, '256 dimensions'], [
        ['Topic neighbour accuracy', pct(analysis.topicNeighborAccuracy), pct(small.topicNeighborAccuracy)],
        ['English to Polish retrieval', pct(analysis.englishToPolishTop1), pct(small.englishToPolishTop1)],
        ['Mean cosine, same topic', fixed(analysis.withinTopicMean), fixed(small.withinTopicMean)],
        ['Mean cosine, different topic', fixed(analysis.betweenTopicMean), fixed(small.betweenTopicMean)],
        ['Correlation of all pairwise similarities', '1', fixed(agreement)],
      ])],
    }));
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [map, translations, bank, short] = results;
    const finite = result => result.measurements.normRange.every(Number.isFinite);
    return [
      check('Vectors are complete and unit length', map.measurements.inputs === 28 && map.measurements.dimension >= 1000 && short.measurements.dimension === 256 &&
        [map, short].every(result => result.measurements.normRange.every(value => Math.abs(value - 1) < 0.02)) && finite(map) && finite(short),
      `${map.measurements.dimension} and ${short.measurements.dimension} dimensions; norms ${map.measurements.normRange.map(value => value.toFixed(3)).join('-')}.`),
      check('The sentence map is a real two-component projection', map.measurements.coordinates.length === 24 && map.measurements.coordinates.every(point => point.length === 2 && point.every(Number.isFinite)) &&
        map.measurements.explainedVariance.every(value => value > 0 && value < 1), `Variance kept: ${map.measurements.explainedVariance.map(value => value.toFixed(3)).join(', ')}.`),
      check('Same-topic sentences are closer than different-topic sentences', map.measurements.analysis.withinTopicMean > map.measurements.analysis.betweenTopicMean && map.measurements.analysis.topicNeighborAccuracy >= 0.5,
        `${map.measurements.analysis.withinTopicMean.toFixed(3)} > ${map.measurements.analysis.betweenTopicMean.toFixed(3)}; neighbours ${pct(map.measurements.analysis.topicNeighborAccuracy)}.`),
      check('Language leaves a measurable signature alongside topic', (() => {
        const means = map.measurements.analysis.languageTopicMeans;
        return means.sameLanguageSameTopic > means.otherLanguageOtherTopic && means.sameLanguageOtherTopic > means.otherLanguageOtherTopic && means.otherLanguageSameTopic > means.otherLanguageOtherTopic;
      })(), JSON.stringify(Object.fromEntries(Object.entries(map.measurements.analysis.languageTopicMeans).map(([key, value]) => [key, Number(value.toFixed(3))])))),
      check('Translations are retrieved across languages', translations.measurements.englishToPolishTop1 >= 0.75 && translations.measurements.polishToEnglishTop1 >= 0.75,
        `${pct(translations.measurements.englishToPolishTop1)} and ${pct(translations.measurements.polishToEnglishTop1)}.`),
      check('Shared meaning outranks a shared word', (() => {
        const byId = Object.fromEntries(bank.measurements.candidates.map(entry => [entry.id, entry.similarity]));
        return byId.paraphrase > byId.trap && byId.both > byId.trap;
      })(), bank.measurements.candidates.map(entry => `${entry.id} ${entry.similarity.toFixed(3)}`).join(', ')),
      check('Shorter vectors keep most of the similarity structure', short.measurements.agreement > 0.9 && short.measurements.analysis.topicNeighborAccuracy >= 0.5, `Correlation ${short.measurements.agreement.toFixed(3)}.`),
    ];
  },
};
