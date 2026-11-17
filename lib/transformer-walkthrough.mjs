import { vocabulary, tokenize, trainingText, createTinyTransformer, trainTinyTransformer } from './tiny-transformer.mjs';
import { argmax, normalize, referenceForward, maxDifferenceFromTrace, EPSILON } from './transformer-reference.mjs';
import { text, table, bars, code } from './genai/contract.mjs';

// The order of the steps. Text that refers to "step 8" is built from this list, so references cannot drift.
export const FORWARD_STEPS = ['tokens', 'embed', 'position', 'norm1', 'qkv', 'scores', 'mask', 'softmax1', 'blend', 'shortcut1', 'norm2', 'expand', 'shortcut2', 'norm3', 'readout', 'probabilities', 'choose'];
export const LEARNING_STEPS = ['loss', 'slope', 'update', 'repeat'];
const stepNumber = id => FORWARD_STEPS.indexOf(id) + 1;
export { stepNumber };

const details = (title, blocks) => ({ type: 'details', title, blocks });
const quote = word => `"${word}"`;
const columns = count => Array.from({ length: count }, (_, k) => `#${k + 1}`);
export const num = (value, digits = 3) => {
  const fixed = Math.abs(value) >= 1000 ? value.toFixed(1) : value.toFixed(digits);
  return /^-0\.0*$/.test(fixed) ? fixed.slice(1) : fixed;
};
export const pct = value => `${(100 * value).toFixed(value < 0.001 ? 4 : 2)}%`;
const paren = value => (value.startsWith('-') ? `(${value})` : value);
const products = (a, b) => a.map((value, k) => `${paren(num(value))}×${paren(num(b[k]))}`);
const worked = (label, a, b, bias, result) => `${label} = ${products(a, b).join(' + ')} + ${paren(num(bias))} = ${num(result)}`;
const vectorTable = (title, first, rows) => table(title, [first, ...columns(rows[0][1].length)], rows.map(([label, vector]) => [label, ...vector.map(value => num(value))]));
const average = values => values.reduce((a, b) => a + b, 0) / values.length;
const maxAbsDifference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const shares = (title, labels, probabilities) => bars(title, labels.map((label, index) => ({ label, value: Number((100 * probabilities[index]).toFixed(4)), max: 100, detail: pct(probabilities[index]) })));

function analyse(model, weights, sentence) {
  const ids = tokenize(sentence);
  const ref = referenceForward(weights, ids);
  const difference = maxDifferenceFromTrace(ref, model.forward(ids, { inspect: true }).trace);
  if (!(difference < 1e-9)) throw new Error(`The plain-number walkthrough of "${sentence}" differs from the model by ${difference}.`);
  return { sentence, ids, words: ids.map(id => vocabulary[id]), ref, difference, last: ids.length - 1 };
}

const glossary = [
  ['Vector', 'a list of numbers. In this lab every word is described by a list of 8 numbers.'],
  ['Learned table (weights)', 'numbers that started out random and were nudged, during training, until the predictions improved. This model has 833 of them in total.'],
  ['Dot product', 'multiply two lists number by number, then add up the products. The result is large when the two lists "point the same way".'],
  ['Softmax', 'a recipe that turns any list of scores into shares that are positive and add up to 100%.'],
  ['Residual (shortcut)', 'adding a step\'s input back onto its output, so that the step only has to add what is new.'],
  ['ReLU', 'keeps a number if it is positive and turns it into 0 if it is negative.'],
  ['Logit', 'a raw score for a word, before it is turned into a probability.'],
];

function normalizationStep({ id, part, number, title, technical, plain, symbols, entry, asking, explainResult = false }) {
  const { input: inputSymbol, output: outputSymbol } = symbols;
  const standardizedMean = average(entry.standardized);
  const standardizedVariance = average(entry.standardized.map(value => (value - standardizedMean) ** 2));
  return {
    id, part, number, title, technical, plain,
    headline: `${outputSymbol}[k] = g[k] · (${inputSymbol}[k] − μ) / √(σ² + ε) + β[k]`,
    equations: [
      `μ = (${inputSymbol}[1] + ${inputSymbol}[2] + … + ${inputSymbol}[8]) / 8`,
      `σ² = ((${inputSymbol}[1] − μ)² + (${inputSymbol}[2] − μ)² + … + (${inputSymbol}[8] − μ)²) / 8`,
      `${outputSymbol}[k] = g[k] · (${inputSymbol}[k] − μ) / √(σ² + ε) + β[k]`,
    ],
    where: [
      ['μ', 'the average of the 8 numbers'], ['σ²', 'how spread out the 8 numbers are (the variance)'],
      ['ε', 'a tiny number, 0.00001, that only stops a division by zero'],
      ['g[k], β[k]', 'a learned stretch and a learned shift for the k-th number (this step has its own pair)'],
    ],
    ...(explainResult ? { notice: `After the first part of the recipe (before g and β) the 8 numbers have average ${num(standardizedMean)} and variance ${num(standardizedVariance)}: every word is brought to the same "volume".` } : {}),
    display: [
      text(`For ${quote(asking)}: average μ = ${num(entry.mean)}, variance σ² = ${num(entry.variance, 4)}, so √(σ² + ε) = ${num(entry.spread, 4)}.`),
      table(`The recipe applied to each of the 8 numbers`, ['k', `${inputSymbol}[k]`, `${inputSymbol}[k] − μ`, '÷ √(σ² + ε)', 'g[k]', 'β[k]', `${outputSymbol}[k]`],
        entry.input.map((value, k) => [k + 1, num(value), num(entry.centered[k]), num(entry.standardized[k]), num(entry.gain[k]), num(entry.offset[k]), num(entry.output[k])])),
    ],
    data: { word: asking, input: entry.input, mean: entry.mean, variance: entry.variance, epsilon: EPSILON, gain: entry.gain, offset: entry.offset, output: entry.output },
  };
}

// Builds the forward-pass walkthrough for the last word of `sentence`, using plain numbers that are
// cross-checked against the model's own forward pass, and compares it with `otherSentence`.
export function buildForwardWalkthrough(model, sentence, otherSentence) {
  const weights = model.weights();
  const main = analyse(model, weights, sentence);
  const other = analyse(model, weights, otherSentence);
  const { words, ids, ref, last } = main;
  const asking = words[last];
  const width = ref.width;
  const n = stepNumber;
  const steps = [];
  const add = definition => steps.push(definition);

  add({
    id: 'tokens', part: 'prepare', number: n('tokens'), title: 'Turn the words into ID numbers', technical: 'Tokenization',
    plain: `A computer cannot read words, only numbers. This toy model knows exactly ${vocabulary.length} words, kept in a numbered dictionary, and every word has an ID: its place in that dictionary, counting from 0. So "${words.join(' ')}" becomes the IDs ${ids.join(', ')}. An ID is only a label, like a locker number: ${vocabulary.indexOf('is')} is not "bigger" or "more important" than ${vocabulary.indexOf('robot')}. The word "<bos>" is a special marker meaning "beginning of sentence".`,
    headline: 'id_i = index(word_i)', equations: ['id_i = index(word_i)'],
    where: [['word_i', 'the i-th word of the sentence'], ['index(…)', 'the place of a word in the dictionary, counting from 0'], ['id_i', 'the ID number that stands for word i']],
    display: [
      table('The dictionary: the only words this model knows', ['Word', ...vocabulary], [['ID', ...vocabulary.map((_, id) => id)]]),
      table('Your sentence', ['Place', 'Word', 'ID'], words.map((word, i) => [i + 1, word, ids[i]])),
    ],
    data: { words, ids, dictionary: [...vocabulary] },
  });

  add({
    id: 'embed', part: 'prepare', number: n('embed'), title: 'Look up each word\'s vector', technical: 'Token embedding',
    plain: `Each ID picks out one row of a big table called E. That row is a list of ${width} numbers, the word's "vector". Nobody typed these numbers in: they started out random, and training nudged them until they helped to predict the next word.`,
    headline: 'e_i = E[id_i]', equations: ['e_i = E[id_i]'],
    where: [['E', `a learned table with one row of ${width} numbers for each of the ${vocabulary.length} dictionary words`], ['e_i', `the row picked for word i: a list of ${width} numbers`]],
    display: [vectorTable('The vector e of each word (the row of E picked by its ID)', 'Word (ID)', words.map((word, i) => [`${word} (${ids[i]})`, ref.embeddings[i]]))],
    data: { words, ids, rows: ref.embeddings },
  });

  add({
    id: 'position', part: 'prepare', number: n('position'), title: 'Add the word\'s place in the sentence', technical: 'Position embedding',
    plain: `Word order matters: "robot is blue" does not mean the same as "blue is robot". So each place in the sentence (first word, second word, ...) also has its own list of ${width} numbers, taken from a second learned table called P. We add the place list to the word list, number by number. The result, x, describes the word in its place.`,
    headline: 'x_i = e_i + p_i', equations: ['x_i = e_i + p_i', 'x_i[k] = e_i[k] + p_i[k]'],
    where: [['p_i', `the row of the table P for place i (place ${last + 1} for ${quote(asking)})`], ['x_i', 'the starting vector of word i, in its place'], ['k', `which of the ${width} numbers, from 1 to ${width}`]],
    display: [
      vectorTable(`Adding for ${quote(asking)}, word ${last + 1} of ${words.length}`, 'Vector', [['e: its word vector', ref.embeddings[last]], [`p: place ${last + 1}`, ref.positions[last]], ['x = e + p', ref.input[last]]]),
      vectorTable('The starting vector x of every word', 'Word', words.map((word, i) => [word, ref.input[i]])),
    ],
    data: { words, tokenRows: ref.embeddings, positionRows: ref.positions, sums: ref.input },
  });

  add(normalizationStep({
    id: 'norm1', part: 'attend', number: n('norm1'), title: 'Rescale the numbers (like setting the volume)', technical: 'Layer normalization',
    plain: `The ${width} numbers in x can be big or small, which makes learning unstable. So they are rescaled: subtract their average (so they centre on 0), divide by their typical spread (so a normal size is about 1), then apply a learned stretch g and a learned shift β to each number. It is like setting every word to the same volume before it speaks. ε is a tiny number that only prevents dividing by zero.`,
    symbols: { input: 'x', output: 'n' }, entry: ref.norm1[last], asking, explainResult: true,
  }));

  const qkvExamples = [['q', weights.query, ref.queries[last]], ['k', weights.key, ref.keys[last]], ['v', weights.value, ref.values[last]]]
    .map(([symbol, layer, result]) => ({ symbol, row: layer.weight[0], bias: layer.bias[0], result: result[0] }));
  add({
    id: 'qkv', part: 'attend', number: n('qkv'), title: 'Make a Query, a Key and a Value for every word', technical: 'Linear projections',
    plain: `Now every word makes three new lists of ${width} numbers from n, each with its own learned table. Think of a library. The Query is the question a word asks: "what am I looking for?". The Key is the label on a book's spine: "what do I contain?". The Value is the content of the book: "what I will hand over if you pick me". Each new number is a weighted sum of the ${width} numbers in n, plus an offset.`,
    headline: 'q_i = W_Q · n_i + b_Q',
    equations: ['q_i = W_Q · n_i + b_Q', 'k_i = W_K · n_i + b_K', 'v_i = W_V · n_i + b_V', 'q_i[j] = W_Q[j,1]·n_i[1] + W_Q[j,2]·n_i[2] + … + W_Q[j,8]·n_i[8] + b_Q[j]'],
    where: [['W_Q, W_K, W_V', `three learned tables, each with ${width} rows of ${width} numbers`], ['b_Q, b_K, b_V', 'learned offsets, 8 numbers each'], ['W_Q[j,k]', 'the number in row j, column k of W_Q'], ['q_i[j]', 'the j-th number of the Query of word i']],
    display: [
      code(`Worked example: the first number of each vector for ${quote(asking)}`, qkvExamples.map(entry => worked(`${entry.symbol}[1]`, entry.row, ref.normalized[last], entry.bias, entry.result)).join('\n')),
      details('The Query, Key and Value of every word', [
        vectorTable('Queries q: what each word is looking for', 'Word', words.map((word, i) => [word, ref.queries[i]])),
        vectorTable('Keys k: what each word contains', 'Word', words.map((word, i) => [word, ref.keys[i]])),
        vectorTable('Values v: what each word hands over', 'Word', words.map((word, i) => [word, ref.values[i]])),
      ]),
    ],
    data: { word: asking, normalized: ref.normalized[last], examples: qkvExamples, queries: ref.queries, keys: ref.keys, values: ref.values },
  });

  const dots = ref.dots[last];
  const scores = ref.scores[last];
  const bestScore = argmax(scores);
  add({
    id: 'scores', part: 'attend', number: n('scores'), title: 'Compare the question with every label', technical: 'Attention scores',
    plain: `Now ${quote(asking)} asks: which of the words so far matter for me? Its Query is compared with the Key of every word it may look at, including itself. "Compared" means a dot product: multiply the two lists number by number and add up the results. A big positive result means a good match. Dividing by √${width} ≈ ${num(ref.scale, 2)} keeps the scores from growing too large.`,
    headline: `s_ij = (q_i · k_j) / √${width}`,
    equations: [`s_ij = (q_i · k_j) / √${width}`, 'q_i · k_j = q_i[1]·k_j[1] + q_i[2]·k_j[2] + … + q_i[8]·k_j[8]'],
    where: [['i', `the word that is asking: here ${quote(asking)}`], ['j', 'a word being looked at'], ['s_ij', 'the score of word j for word i: how well i\'s question matches j\'s label'], [`√${width}`, `${num(ref.scale, 3)}, the square root of the vector length`]],
    notice: `The best match for ${quote(asking)} is ${quote(words[bestScore])}, with score ${num(scores[bestScore])}.`,
    display: [
      code(`Worked example: ${quote(asking)} compared with ${quote(words[bestScore])}`, `q·k = ${products(ref.queries[last], ref.keys[bestScore]).join(' + ')} = ${num(dots[bestScore])}\nscore = ${num(dots[bestScore])} ÷ ${num(ref.scale)} = ${num(scores[bestScore])}`),
      table(`How well ${quote(asking)}'s Query matches each Key`, ['Word looked at', `q · k (sum of ${width} products)`, `÷ √${width} = score s`], words.map((word, j) => [word, num(dots[j]), num(scores[j])])),
    ],
    data: { word: asking, words: words.slice(0, last + 1), query: ref.queries[last], keys: ref.keys.slice(0, last + 1), dots, scale: ref.scale, scores },
  });

  const maskMatrix = ref.scores.map((row, i) => words.map((_, j) => (j <= i ? row[j] : null)));
  add({
    id: 'mask', part: 'attend', number: n('mask'), title: 'Hide the future', technical: 'Causal mask',
    plain: 'While it learns to predict the next word, a word must never see the words that come after it, or it could simply copy the answer. So every score for a later word is replaced by −∞ ("impossible"). The next step turns that into exactly 0% attention. Read each row of the table as: this word looks at these words.',
    headline: 's_ij = −∞  whenever j > i', equations: ['s_ij = −∞  whenever j > i'],
    where: [['j > i', 'word j comes after word i in the sentence'], ['−∞', 'minus infinity: so small that exp(−∞) = 0']],
    notice: `The last word can see all ${words.length} words, but ${quote(words[0])} can see only itself. Another experiment in this lab changes a future word and shows that nothing before it changes.`,
    display: [table('Scores s for every pair of words', ['Asking word ↓ / looked at →', ...words], maskMatrix.map((row, i) => [words[i], ...row.map(value => (value === null ? '−∞ (hidden)' : num(value)))]))],
    data: { words, matrix: maskMatrix },
  });

  const attention = ref.attention[last];
  const topAttention = argmax(attention.probabilities);
  add({
    id: 'softmax1', part: 'attend', number: n('softmax1'), title: 'Turn the scores into attention percentages', technical: 'Softmax',
    plain: 'Scores can be any size, even negative. Softmax turns a list of scores into shares that are all positive and add up to 100%. First each score s becomes exp(s), which means e (about 2.718) raised to the power s: always positive, and it rewards big scores. Then each result is divided by the total of all of them. A hidden word has exp(−∞) = 0, so its share is exactly 0%. These shares are called attention weights.',
    headline: 'α_ij = exp(s_ij) / (exp(s_i1) + exp(s_i2) + … + exp(s_ii))',
    equations: ['α_ij = exp(s_ij) / (exp(s_i1) + exp(s_i2) + … + exp(s_ii))'],
    where: [['α_ij', 'the attention weight: the share of word i\'s attention that goes to word j'], ['exp(s)', 'e (about 2.718) raised to the power s']],
    notice: `${quote(asking)} gives ${pct(attention.probabilities[topAttention])} of its attention to ${quote(words[topAttention])}.`,
    display: [
      table(`Attention of ${quote(asking)}`, ['Word looked at', 'Score s', 'exp(s)', 'Share = exp(s) ÷ total'],
        [...words.map((word, j) => [word, num(scores[j]), num(attention.exps[j]), pct(attention.probabilities[j])]), ['Total', '', num(attention.total), '100%']]),
      shares(`Where ${quote(asking)} looks`, words, attention.probabilities),
      text('Implementation detail: real code subtracts the biggest score before taking exp(), so that large scores cannot overflow. The shares come out identical.'),
      details('Attention shares of every word (each row adds up to 100%)', [table('Attention weights α', ['Asking word ↓ / looked at →', ...words],
        ref.attentionMatrix.map((row, i) => [words[i], ...row.map((value, j) => (j <= i ? pct(value) : '0% (hidden)'))]))]),
    ],
    data: { word: asking, words, scores, exps: attention.exps, total: attention.total, weights: attention.probabilities, matrix: ref.attentionMatrix },
  });

  const contributions = ref.values.map((row, j) => row.map(value => attention.probabilities[j] * value));
  add({
    id: 'blend', part: 'attend', number: n('blend'), title: 'Blend the Values using those percentages', technical: 'Weighted sum of Values',
    plain: `Each word carries a Value: the information it will hand over. ${quote(asking)} now builds a new list of ${width} numbers by blending the Values of the words it looked at, in proportion to the attention shares: ${pct(attention.probabilities[topAttention])} of the Value of ${quote(words[topAttention])}, plus smaller amounts of the others. ${quote(asking)} now carries information gathered from the words it paid attention to.`,
    headline: 'm_i = α_i1·v_1 + α_i2·v_2 + … + α_ii·v_i', equations: ['m_i = α_i1·v_1 + α_i2·v_2 + … + α_ii·v_i'],
    where: [['m_i', `the blended list of ${width} numbers for word i`], ['v_j', `the Value of word j (step ${n('qkv')}); every one of its ${width} numbers is multiplied by α_ij`]],
    display: [vectorTable(`The blend for ${quote(asking)}: each row is share × Value`, 'Word looked at', [
      ...words.map((word, j) => [`${word} (${pct(attention.probabilities[j])})`, contributions[j]]), ['m = sum of the rows', ref.mixed[last]]])],
    data: { word: asking, words, weights: attention.probabilities, values: ref.values, contributions, mixed: ref.mixed[last] },
  });

  const projection = weights.projection;
  add({
    id: 'shortcut1', part: 'attend', number: n('shortcut1'), title: 'Tidy the blend and add a shortcut', technical: 'Output projection and residual connection',
    plain: `The blend is passed through one more learned table, W_O, to tidy it up; call the result o. Then comes a shortcut: o is added onto the starting vector x from step ${n('position')}. This is called a residual connection. The word keeps everything it already knew and only adds what attention found.`,
    headline: 'r_i = x_i + (W_O · m_i + b_O)', equations: ['o_i = W_O · m_i + b_O', 'r_i = x_i + o_i'],
    where: [['W_O, b_O', 'a learned table (8 rows of 8 numbers) and 8 learned offsets'], ['o_i', 'the tidied blend'], ['r_i', 'the word\'s vector after attention: what it knew before plus what attention found']],
    display: [
      code(`Worked example: the first number of o for ${quote(asking)}`, worked('o[1]', projection.weight[0], ref.mixed[last], projection.bias[0], ref.attentionOutput[last][0])),
      vectorTable('Adding the shortcut', 'Vector', [[`m: the blend (step ${n('blend')})`, ref.mixed[last]], ['o = W_O · m + b_O', ref.attentionOutput[last]], [`x: the starting vector (step ${n('position')})`, ref.input[last]], ['r = x + o', ref.residual1[last]]]),
    ],
    data: { word: asking, mixed: ref.mixed[last], row: projection.weight[0], bias: projection.bias[0], projected: ref.attentionOutput[last], input: ref.input[last], residual: ref.residual1[last] },
  });

  add(normalizationStep({
    id: 'norm2', part: 'think', number: n('norm2'), title: 'Rescale again', technical: 'Layer normalization (second)',
    plain: `The same rescaling recipe as step ${n('norm1')}, now applied to r, with its own learned g and β. It prepares the numbers for the next stage.`,
    symbols: { input: 'r', output: 'u' }, entry: ref.norm2[last], asking,
  }));

  const unit = argmax(ref.ffHidden[last]);
  const switchedOff = ref.ffPre[last].filter(value => !(value > 0)).length;
  add({
    id: 'expand', part: 'think', number: n('expand'), title: 'Think alone: 16 detectors, then switch the negative ones off', technical: 'Feed-forward network, first layer + ReLU',
    plain: `Now each word thinks on its own, without looking at other words. The ${width} numbers are expanded into ${weights.expand.bias.length} "detectors". Each detector is a weighted sum of the ${width} numbers plus its own offset. Then ReLU switches off every detector that came out negative: it keeps positive numbers and turns negative ones into 0. This on/off behaviour lets the network do more than simple sums.`,
    headline: 'h[j] = ReLU( W_1[j,1]·u[1] + W_1[j,2]·u[2] + … + W_1[j,8]·u[8] + b_1[j] )',
    equations: ['z[j] = W_1[j,1]·u[1] + W_1[j,2]·u[2] + … + W_1[j,8]·u[8] + b_1[j]', 'h[j] = ReLU(z[j]) = max(0, z[j])'],
    where: [['W_1, b_1', `a learned table (${weights.expand.bias.length} rows of ${width} numbers) and ${weights.expand.bias.length} learned offsets`], ['z[j]', 'the value of detector j before ReLU'], ['h[j]', 'the value of detector j after ReLU'], ['max(0, z)', 'the larger of 0 and z']],
    notice: `ReLU switched off ${switchedOff} of the ${weights.expand.bias.length} detectors.`,
    display: [
      code(`Worked example: detector ${unit + 1}, the strongest one`, `${worked(`z[${unit + 1}]`, weights.expand.weight[unit], ref.ffNormalized[last], weights.expand.bias[unit], ref.ffPre[last][unit])}\nh[${unit + 1}] = max(0, ${num(ref.ffPre[last][unit])}) = ${num(ref.ffHidden[last][unit])}`),
      table(`All ${weights.expand.bias.length} detectors for ${quote(asking)}`, ['Detector j', 'Before ReLU z[j]', 'After ReLU h[j]', 'State'], ref.ffPre[last].map((value, j) => [j + 1, num(value), num(ref.ffHidden[last][j]), value > 0 ? 'on' : 'switched off (0)'])),
    ],
    data: { word: asking, normalized: ref.ffNormalized[last], unit, row: weights.expand.weight[unit], bias: weights.expand.bias[unit], pre: ref.ffPre[last], hidden: ref.ffHidden[last] },
  });

  add({
    id: 'shortcut2', part: 'think', number: n('shortcut2'), title: 'Squeeze back to 8 numbers and add a second shortcut', technical: 'Feed-forward network, second layer + residual connection',
    plain: `The ${weights.expand.bias.length} detector values are squeezed back into ${width} numbers by another learned table, W_2. Call the result f: the new information produced by thinking. Another shortcut adds f onto r, so the word keeps what it had and gains what it worked out.`,
    headline: 'y_i = r_i + (W_2 · h_i + b_2)', equations: ['f_i = W_2 · h_i + b_2', 'y_i = r_i + f_i'],
    where: [['W_2, b_2', `a learned table (${width} rows of ${weights.expand.bias.length} numbers) and ${width} learned offsets`], ['f_i', 'what the thinking step found'], ['y_i', 'the word\'s vector after the whole block']],
    display: [
      code(`Worked example: the first number of f for ${quote(asking)}`, worked('f[1]', weights.contract.weight[0], ref.ffHidden[last], weights.contract.bias[0], ref.ffOutput[last][0])),
      vectorTable('Adding the second shortcut', 'Vector', [[`r: before thinking (step ${n('shortcut1')})`, ref.residual1[last]], ['f = W_2 · h + b_2', ref.ffOutput[last]], ['y = r + f', ref.residual2[last]]]),
    ],
    data: { word: asking, hidden: ref.ffHidden[last], row: weights.contract.weight[0], bias: weights.contract.bias[0], output: ref.ffOutput[last], residual1: ref.residual1[last], residual2: ref.residual2[last] },
  });

  add(normalizationStep({
    id: 'norm3', part: 'predict', number: n('norm3'), title: 'One last rescale', technical: 'Final layer normalization',
    plain: `The same rescaling recipe once more, applied to y with its own learned g and β, so that the final scoring always receives numbers of a similar size. The result, t, is the model's final summary of the word ${quote(asking)} in its context.`,
    symbols: { input: 'y', output: 't' }, entry: ref.norm3[last], asking,
  }));

  const logits = ref.logits[last];
  const topLogit = argmax(logits);
  add({
    id: 'readout', part: 'predict', number: n('readout'), title: 'Give every dictionary word a score', technical: 'Linear readout (logits)',
    plain: `Now the model must decide which dictionary word comes next. Each of the ${vocabulary.length} words has its own row of ${width} learned numbers in a table called W_R. Multiplying t by a row and adding up (plus a learned offset) gives that word's score: higher means "more likely to come next". These raw scores are called logits.`,
    headline: 'z[w] = W_R[w,1]·t[1] + W_R[w,2]·t[2] + … + W_R[w,8]·t[8] + b_R[w]',
    equations: ['z[w] = W_R[w,1]·t[1] + W_R[w,2]·t[2] + … + W_R[w,8]·t[8] + b_R[w]'],
    where: [['w', 'a word of the dictionary'], ['W_R, b_R', `a learned table (${vocabulary.length} rows of ${width} numbers) and ${vocabulary.length} learned offsets`], ['z[w]', 'the score (logit) of word w']],
    notice: `${quote(vocabulary[topLogit])} has the highest score, ${num(logits[topLogit])}.`,
    display: [
      code(`Worked example: the score of ${quote(vocabulary[topLogit])}, the highest`, worked(`z[${vocabulary[topLogit]}]`, weights.readout.weight[topLogit], ref.finalNormalized[last], weights.readout.bias[topLogit], logits[topLogit])),
      table('One score for every dictionary word', ['Word', 'Score z (logit)'], vocabulary.map((word, w) => [word, num(logits[w])])),
    ],
    data: { word: asking, final: ref.finalNormalized[last], rows: weights.readout.weight, biases: weights.readout.bias, logits },
  });

  const output = ref.output[last];
  const topWord = argmax(output.probabilities);
  add({
    id: 'probabilities', part: 'predict', number: n('probabilities'), title: 'Turn the scores into probabilities', technical: 'Softmax',
    plain: `Softmax again, exactly as in step ${n('softmax1')}, but now over all ${vocabulary.length} dictionary words. Each score becomes a probability: positive, and all ${vocabulary.length} together add up to 100%.`,
    headline: 'P(w) = exp(z[w]) / (exp(z[1]) + exp(z[2]) + … + exp(z[9]))', equations: ['P(w) = exp(z[w]) / (exp(z[1]) + exp(z[2]) + … + exp(z[9]))'],
    where: [['P(w)', 'the probability that word w comes next'], ['z[1] … z[9]', 'the scores of the nine dictionary words']],
    notice: `${quote(vocabulary[topWord])} gets ${pct(output.probabilities[topWord])}.`,
    display: [
      table('From scores to probabilities', ['Word', 'Score z', 'exp(z)', 'Probability P'], vocabulary.map((word, w) => [word, num(logits[w]), num(output.exps[w]), pct(output.probabilities[w])])),
      shares('Probability of each possible next word', vocabulary, output.probabilities),
    ],
    data: { words: [...vocabulary], logits, exps: output.exps, total: output.total, probabilities: output.probabilities },
  });

  const ranking = output.probabilities.map((probability, w) => [vocabulary[w], probability]).sort((a, b) => b[1] - a[1]);
  const chosen = vocabulary[topWord];
  add({
    id: 'choose', part: 'predict', number: n('choose'), title: 'Pick the next word, then repeat', technical: 'Greedy decoding',
    plain: `This lab uses the simplest rule, called greedy decoding: choose the word with the highest probability. Here that is ${quote(chosen)} (${pct(output.probabilities[topWord])}). The chosen word is added to the sentence and the whole sequence of steps starts again, to find the word after that, until the special word "<eos>" ("end of sentence") is chosen. Chat models usually sample from the probabilities instead (see the temperature labs). No number in the model changes while it writes: only training changes them.`,
    headline: 'next word = argmax_w P(w)', equations: ['next word = argmax_w P(w)'],
    where: [['argmax_w P(w)', 'the word w that has the largest probability P(w)']],
    display: [
      table('The three most probable next words', ['Rank', 'Word', 'Probability'], ranking.slice(0, 3).map(([word, probability], rank) => [rank + 1, word, pct(probability)])),
      text(`The sentence becomes: ${[...words, chosen].join(' ')}`),
    ],
    data: { vocabulary: [...vocabulary], probabilities: output.probabilities, chosen, chosenProbability: output.probabilities[topWord], sentenceBefore: sentence, sentenceAfter: `${sentence} ${chosen}` },
  });

  if (steps.some((step, index) => step.id !== FORWARD_STEPS[index])) throw new Error('Walkthrough steps are out of order.');
  const wrapUp = buildWrapUp(main, other, steps);
  return {
    kind: 'forward', title: 'Follow one prediction through every step', sentence, words, ids,
    focus: { place: last + 1, word: asking },
    intro: [
      `We follow one sentence, "${sentence}", through the trained model. The model's job is to guess the next word. There are ${steps.length} steps. Each step has three parts: what happens in plain words, the equation, and the real numbers from this run (not made-up examples).`,
      `We watch the last word, ${quote(asking)}, because that is the word whose output predicts the next word. In the equations, i is the word that is asking (here ${quote(asking)}) and j is a word it looks at. We count from 1 on this page ("the first number"); the dictionary IDs start at 0 because that is how the code counts. Numbers are rounded to 3 decimals for display, so doing the arithmetic by hand may differ in the last digit; the equations were checked with the full-precision numbers.`,
    ],
    glossary,
    parts: [
      { title: 'Part 1: Get the words ready', steps: [1, 2, 3] },
      { title: 'Part 2: Look back at the earlier words (attention)', steps: [4, 5, 6, 7, 8, 9, 10] },
      { title: 'Part 3: Think alone (feed-forward network)', steps: [11, 12, 13] },
      { title: 'Part 4: Predict the next word', steps: [14, 15, 16, 17] },
    ],
    steps, wrapUp,
    maxDifferenceFromModel: Math.max(main.difference, other.difference),
  };
}

function buildWrapUp(main, other, steps) {
  const [a, b] = [main, other];
  const at = a.words.findIndex((word, index) => word !== b.words[index]);
  if (at < 0 || a.words.length !== b.words.length || a.last !== b.last) throw new Error('The two sentences must have the same length and differ in at least one word.');
  const pick = (analysis, field) => analysis.ref[field][analysis.last];
  const attentionOf = analysis => analysis.ref.attention[analysis.last].probabilities;
  const noun = analysis => analysis.words[at];
  const differences = {
    x: maxAbsDifference(pick(a, 'input'), pick(b, 'input')),
    q: maxAbsDifference(pick(a, 'queries'), pick(b, 'queries')),
    attention: maxAbsDifference(attentionOf(a), attentionOf(b)),
    m: maxAbsDifference(pick(a, 'mixed'), pick(b, 'mixed')),
    y: maxAbsDifference(pick(a, 'residual2'), pick(b, 'residual2')),
    probabilities: maxAbsDifference(pick(a, 'probabilities'), pick(b, 'probabilities')),
  };
  const topA = argmax(pick(a, 'probabilities'));
  const topB = argmax(pick(b, 'probabilities'));
  const nounShare = analysis => attentionOf(analysis)[at];
  const n = stepNumber;
  const side = (label, valueA, valueB) => [label, valueA, valueB];
  return {
    title: `Why "${noun(a)} is" gives ${quote(vocabulary[topA])} but "${noun(b)} is" gives ${quote(vocabulary[topB])}`,
    plain: `The two sentences differ in just one word: word ${at + 1} has ID ${a.ids[at]} in the first and ID ${b.ids[at]} in the second. Look at the word ${quote(a.words[a.last])}: its starting vector (step ${n('position')}) and its Query (step ${n('qkv')}) are exactly the same in both sentences, so on its own it could not tell them apart. The only way it can learn which noun came before is by looking back at it (steps ${n('scores')} to ${n('blend')}). In step ${n('softmax1')}, ${quote(a.words[a.last])} gives ${pct(nounShare(a))} of its attention to ${quote(noun(a))} in the first sentence and ${pct(nounShare(b))} to ${quote(noun(b))} in the second. So the blend in step ${n('blend')} differs, and so does everything after it: the scores flip and the winner changes from ${quote(vocabulary[topA])} to ${quote(vocabulary[topB])}.`,
    caution: 'This toy model memorized two sentences. Attention weights show how information is mixed; they are not a complete explanation of what a model "thinks".',
    display: [
      table(`Where do the two sentences start to differ? (the word ${quote(a.words[a.last])}; largest difference in any of its numbers)`, ['Stage', 'Largest difference between the two sentences'], [
        [`Step ${n('position')}: starting vector x`, num(differences.x)], [`Step ${n('qkv')}: Query q`, num(differences.q)],
        [`Step ${n('softmax1')}: attention weights α`, num(differences.attention)], [`Step ${n('blend')}: blended vector m`, num(differences.m)],
        [`Step ${n('shortcut2')}: vector y after the block`, num(differences.y)], [`Step ${n('probabilities')}: probabilities P`, num(differences.probabilities)],
      ]),
      table('The same recipe on two sentences', ['What we look at', `"${a.sentence}"`, `"${b.sentence}"`], [
        side('Word IDs', a.ids.join(', '), b.ids.join(', ')),
        ...a.words.map((word, j) => side(`Attention of ${quote(a.words[a.last])} on word ${j + 1}`, `${pct(attentionOf(a)[j])} (${quote(word)})`, `${pct(attentionOf(b)[j])} (${quote(b.words[j])})`)),
        ...['blue', 'green'].flatMap(word => [
          side(`Score z of ${quote(word)}`, num(pick(a, 'logits')[vocabulary.indexOf(word)]), num(pick(b, 'logits')[vocabulary.indexOf(word)])),
          side(`Probability of ${quote(word)}`, pct(pick(a, 'probabilities')[vocabulary.indexOf(word)]), pct(pick(b, 'probabilities')[vocabulary.indexOf(word)])),
        ]),
        side('Chosen next word', quote(vocabulary[topA]), quote(vocabulary[topB])),
      ]),
    ],
    data: {
      sentences: [a.sentence, b.sentence], ids: [a.ids, b.ids], x: [pick(a, 'input'), pick(b, 'input')], q: [pick(a, 'queries'), pick(b, 'queries')],
      attention: [attentionOf(a), attentionOf(b)], m: [pick(a, 'mixed'), pick(b, 'mixed')], y: [pick(a, 'residual2'), pick(b, 'residual2')],
      logits: [pick(a, 'logits'), pick(b, 'logits')], probabilities: [pick(a, 'probabilities'), pick(b, 'probabilities')], differences,
      chosen: [vocabulary[topA], vocabulary[topB]], mainProbabilities: steps.find(step => step.id === 'probabilities').data.probabilities,
    },
  };
}

// One real training update, with real numbers: the loss, the slope of one weight, and the Adam step.
export function buildLearningWalkthrough({ seed, training }) {
  const fresh = createTinyTransformer(seed);
  const sentence = `<bos> ${trainingText[0]} <eos>`;
  const ids = tokenize(sentence);
  const inputs = ids.slice(0, -1).map(id => vocabulary[id]);
  const targets = ids.slice(1).map(id => vocabulary[id]);
  const probabilities = fresh.forward(ids.slice(0, -1)).probabilities.map((row, t) => row[ids[t + 1]].data);
  const penalties = probabilities.map(probability => -Math.log(probability));
  const meanLoss = average(penalties);
  if (Math.abs(meanLoss - fresh.loss(ids).data) > 1e-12) throw new Error('The displayed loss differs from the model loss.');

  const blue = vocabulary.indexOf('blue');
  const weight = fresh.layers.readout.bias[blue];
  const before = weight.data;
  const delta = 1e-5;
  const loss = fresh.loss(ids);
  loss.backward();
  const backpropSlope = weight.grad;
  weight.data = before + delta;
  const lossUp = fresh.loss(ids).data;
  weight.data = before - delta;
  const lossDown = fresh.loss(ids).data;
  weight.data = before;
  const numericSlope = (lossUp - lossDown) / (2 * delta);

  const stepped = createTinyTransformer(seed);
  const run = trainTinyTransformer(stepped, 1);
  const steppedWeight = stepped.layers.readout.bias[blue];
  const gradient = steppedWeight.grad;
  const clipped = Math.max(-1, Math.min(1, gradient));
  const eta = run.learningRate;
  const mHat = (0.1 * clipped) / (1 - 0.9);
  const vHat = (0.001 * clipped ** 2) / (1 - 0.999);
  const adamEpsilon = 1e-8;
  const stepSize = (eta * mHat) / (Math.sqrt(vHat) + adamEpsilon);
  const after = before - stepSize;
  const curve = training.curve;
  const parameters = fresh.parameters.length;
  const downhill = backpropSlope < 0 ? 'increase' : 'decrease';

  const steps = [
    {
      id: 'loss', part: 'one', number: 1, title: 'Measure how wrong the model is', technical: 'Cross-entropy loss',
      plain: `Training needs one number that says how wrong the model is. Before any training, the model reads the training sentence "${sentence}". At each word it gives a probability to every dictionary word as the next word. We look up the probability P it gave to the word that really came next. If P is 100% the penalty −ln(P) is 0; the smaller P is, the bigger the penalty (for 10% it is 2.30). The average penalty is the loss L. This untrained model is still almost guessing, about 1 chance in ${vocabulary.length} each time.`,
      headline: 'L = −(ln P_1 + ln P_2 + … + ln P_N) / N',
      equations: ['penalty_t = −ln(P_t)', 'L = (penalty_1 + penalty_2 + … + penalty_N) / N'],
      where: [['P_t', 'the probability the model gave to the word that really came next, at step t'], ['N', `the number of predictions: ${inputs.length}`], ['ln', 'the natural logarithm: ln(1) = 0, and ln gets more negative as P gets smaller']],
      notice: `A model that guessed uniformly would have loss ln(${vocabulary.length}) = ${num(Math.log(vocabulary.length))}. For this one sentence L = ${num(meanLoss, 4)}. (The training run reports the average over both training sentences: ${num(training.curve[0].loss, 4)}.)`,
      display: [
        table('Each prediction of the untrained model', ['t', 'The model reads', 'Real next word', 'Probability P it gave', 'Penalty −ln(P)'],
          inputs.map((word, t) => [t + 1, `${inputs.slice(0, t + 1).join(' ')}`, targets[t], pct(probabilities[t]), num(penalties[t])])),
        text(`Loss L = (${penalties.map(value => num(value)).join(' + ')}) ÷ ${penalties.length} = ${num(meanLoss, 4)}`),
      ],
      data: { sentence, inputs, targets, probabilities, penalties, mean: meanLoss },
    },
    {
      id: 'slope', part: 'one', number: 2, title: 'Find which way to nudge a number', technical: 'Slope of the loss (backpropagation)',
      plain: `To improve, we must know which way to change each learned number. Take one of them, w: the offset added to the score of ${quote('blue')} in the last learned table. If w went up by a tiny amount δ, would the loss go up or down, and how fast? That is the slope of the loss. You can measure it by brute force: nudge w up by δ, nudge it down by δ, and compare the two losses. Backpropagation (the chain rule from school maths) gets the same slope exactly, for all ${parameters} numbers at once. Below, both ways agree.`,
      headline: 'slope = ∂L/∂w ≈ (L(w + δ) − L(w − δ)) / (2δ)',
      equations: ['slope = ∂L/∂w ≈ (L(w + δ) − L(w − δ)) / (2δ)'],
      where: [['w', `the number we examine (here: the offset for ${quote('blue')}, currently ${num(before)})`], ['δ', 'a tiny nudge, 0.00001'], ['L(w + δ)', 'the loss measured after nudging w up by δ'], ['∂L/∂w', 'the slope of the loss with respect to w, as computed by backpropagation']],
      notice: `The slope is ${backpropSlope < 0 ? 'negative' : 'positive'}: to lower the loss, training must ${downhill} this number.`,
      display: [table('Two ways to find the same slope', ['Quantity', 'Value'], [
        ['w (current value)', num(before, 4)], ['L(w + δ)', num(lossUp, 8)], ['L(w − δ)', num(lossDown, 8)],
        ['Slope by nudging: (L(w + δ) − L(w − δ)) ÷ (2δ)', num(numericSlope, 6)], ['Slope by backpropagation', num(backpropSlope, 6)], ['Difference', Math.abs(numericSlope - backpropSlope).toExponential(2)],
      ])],
      data: { parameter: 'readout offset for "blue"', value: before, delta, lossUp, lossDown, numericSlope, backpropSlope },
    },
    {
      id: 'update', part: 'one', number: 3, title: 'Nudge every number a little', technical: 'Gradient step (Adam)',
      plain: `Now w is nudged a little in the direction that lowers the loss. The simplest rule is: new w = w − η × slope, where η = ${eta} is the learning rate (the size of a nudge). This lab uses a refinement called Adam, which also looks at how big the recent slopes were, so that every number moves at a sensible pace. On the very first update it reduces to the rule below: a nudge of almost exactly η, downhill, whatever the size of the slope. In the real training run all ${parameters} numbers are nudged together.`,
      headline: 'w_new = w − η · g / (|g| + 0.00000001)',
      equations: ['w_new = w − η · g / (|g| + 0.00000001)'],
      where: [['w', 'the number being learned'], ['g', 'the slope from step 2, limited to between −1 and 1'], ['η', `the learning rate, ${eta}`], ['|g|', 'the size of g, ignoring its sign']],
      notice: `After this single update the average loss over both training sentences fell from ${num(run.initialLoss, 4)} to ${num(run.finalLoss, 4)}.`,
      display: [table('One real update of w', ['Quantity', 'Value'], [
        ['w before', num(before, 6)], ['slope g (limited to −1 … 1)', num(clipped, 6)], [`step = η · g / (|g| + 0.00000001)`, num(stepSize, 6)],
        ['w after = w before − step', num(after, 6)], ['w after in the real first training update', num(steppedWeight.data, 6)],
        ['Average loss before the update', num(run.initialLoss, 4)], ['Average loss after the update', num(run.finalLoss, 4)],
      ])],
      data: { eta, epsilon: adamEpsilon, gradient, clipped, mHat, vHat, step: stepSize, before, after, afterFromRun: steppedWeight.data, lossBefore: run.initialLoss, lossAfter: run.finalLoss },
    },
    {
      id: 'repeat', part: 'repeat', number: 4, title: 'Repeat 400 times', technical: 'Training loop',
      plain: `Learning is this loop, repeated: read a training sentence, measure the loss, find the slopes, nudge all ${parameters} numbers. This lab does it ${training.steps} times, alternating the two training sentences. The loss falls from ${num(curve[0].loss, 4)} to ${num(curve.at(-1).loss, 4)}. The numbers it ends with are the ones used in the step-by-step walkthrough, and nothing changes them afterwards.`,
      headline: 'repeat 400 times: read, measure L, find slopes, nudge every w',
      equations: ['repeat 400 times:  L → slope of every w → w_new = w − nudge'],
      where: [['400', `the number of updates (${training.optimizer}, learning rate ${training.learningRate})`]],
      display: [table('Average loss while training', ['Update', 'Average loss'], curve.map(point => [point.step, num(point.loss, 4)]))],
      data: { updates: training.steps, parameters, curve },
    },
  ];
  if (steps.some((step, index) => step.id !== LEARNING_STEPS[index])) throw new Error('Learning steps are out of order.');
  return {
    kind: 'learning', title: 'See how the numbers are learned', sentence,
    intro: [
      'The step-by-step walkthrough uses a trained model. Here you can see how one training update works, with real numbers from this lab. The idea is: measure the mistake, work out which way to nudge each learned number, nudge, and repeat.',
    ],
    glossary: [
      ['Loss', 'one number that says how wrong the model is. Training tries to make it small.'],
      ['Slope', 'how fast the loss changes when one learned number is increased a tiny bit.'],
      ['Backpropagation', 'a way to compute the slope of every learned number at once, by applying the chain rule backwards through all the steps.'],
    ],
    parts: [{ title: 'One training update', steps: [1, 2, 3] }, { title: 'Then repeat', steps: [4] }],
    steps,
  };
}
