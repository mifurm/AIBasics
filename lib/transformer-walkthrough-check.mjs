import { dot, softmax, normalize, argmax } from './transformer-reference.mjs';
import { FORWARD_STEPS, LEARNING_STEPS } from './transformer-walkthrough.mjs';

const flat = value => (Array.isArray(value) ? value.flatMap(flat) : [value]);
const sum = values => values.reduce((a, b) => a + b, 0);

// Re-derives every number a step shows from the operands recorded next to it. Nothing here needs the model:
// it proves that the recorded evidence satisfies the displayed equations.
export function validateWalkthrough(walkthrough) {
  const failures = [];
  let checked = 0;
  let maxError = 0;
  const holds = (label, condition) => {
    checked++;
    if (!condition) failures.push(label);
  };
  const near = (label, actual, expected, tolerance = 1e-9) => {
    checked++;
    const a = flat(actual);
    const b = flat(expected);
    if (!a.length || a.length !== b.length) {
      failures.push(`${label}: the shapes differ`);
      return;
    }
    let error = 0;
    for (let index = 0; index < a.length; index++) {
      if (a[index] === null || b[index] === null) {
        if (a[index] !== b[index]) error = Infinity;
      } else if (!Number.isFinite(a[index]) || !Number.isFinite(b[index])) error = Infinity;
      else error = Math.max(error, Math.abs(a[index] - b[index]));
    }
    if (error <= tolerance) maxError = Math.max(maxError, error);
    else failures.push(`${label}: off by ${error}`);
  };

  const steps = Array.isArray(walkthrough?.steps) ? walkthrough.steps : [];
  const order = walkthrough?.kind === 'learning' ? LEARNING_STEPS : FORWARD_STEPS;
  holds('the steps come in the documented order', steps.length === order.length && steps.every((step, index) => step.id === order[index] && step.number === index + 1));
  for (const step of steps) {
    const words = (value, least) => typeof value === 'string' && value.trim().length >= least;
    holds(`step ${step.number} has a title, plain words, an equation, real numbers and recorded operands`,
      words(step.title, 3) && words(step.plain, 40) && words(step.headline, 3) && Array.isArray(step.equations) && step.equations.length > 0 &&
      step.equations.every(equation => words(equation, 3)) && Array.isArray(step.display) && step.display.length > 0 && step.data && typeof step.data === 'object');
  }
  const data = id => steps.find(step => step.id === id)?.data;

  try {
    if (walkthrough?.kind === 'forward') {
      const tokens = data('tokens');
      holds('the IDs are the places of the words in the dictionary', tokens.ids.every((id, index) => tokens.dictionary[id] === tokens.words[index]));
      const position = data('position');
      near('the word vectors are the rows that the IDs pick', data('embed').rows, position.tokenRows);
      near('x = e + p for every word', position.sums, position.tokenRows.map((row, i) => row.map((value, k) => value + position.positionRows[i][k])));

      const norms = [['norm1', position.sums.at(-1)], ['norm2', data('shortcut1').residual], ['norm3', data('shortcut2').residual2]];
      for (const [id, source] of norms) {
        const step = data(id);
        const again = normalize({ gain: step.gain, bias: step.offset }, step.input);
        near(`${id}: the input is the previous step's output`, step.input, source);
        near(`${id}: the average and variance`, [step.mean, step.variance], [again.mean, again.variance]);
        near(`${id}: the rescaled numbers`, step.output, again.output);
        holds(`${id}: epsilon is 0.00001`, step.epsilon === 1e-5);
      }

      const qkv = data('qkv');
      for (const example of qkv.examples) near(`${example.symbol}[1] is a weighted sum plus an offset`, dot(example.row, qkv.normalized) + example.bias, example.result);
      near('the worked numbers are the first numbers of the vectors', qkv.examples.map(example => example.result), [qkv.queries.at(-1)[0], qkv.keys.at(-1)[0], qkv.values.at(-1)[0]]);
      near('the rescaled vector n is the output of the first rescale', qkv.normalized, data('norm1').output);

      const scores = data('scores');
      near('the Query used for scoring is the recorded Query', scores.query, qkv.queries.at(-1));
      near('the Keys used for scoring are the recorded Keys', scores.keys, qkv.keys.slice(0, scores.keys.length));
      near('q · k is a sum of products', scores.dots, scores.keys.map(key => dot(scores.query, key)));
      near('the scale is the square root of the vector length', scores.scale, Math.sqrt(scores.query.length));
      near('score = q · k ÷ √8', scores.scores, scores.dots.map(value => value / scores.scale));

      const mask = data('mask');
      holds('a score is hidden exactly where the word looked at comes later', mask.matrix.every((row, i) => row.every((value, j) => (j > i) === (value === null))));
      near('the last row of the score table is the scores just computed', mask.matrix.at(-1), scores.scores);

      const attention = data('softmax1');
      const again = softmax(attention.scores);
      near('the scores are the scores just computed', attention.scores, scores.scores);
      near('exp of every score', attention.exps, again.exps);
      near('the total of the exp values', attention.total, again.total);
      near('share = exp(s) ÷ total', attention.weights, again.probabilities);
      near('the shares add up to 100%', sum(attention.weights), 1);
      mask.matrix.forEach((row, i) => {
        const visible = row.slice(0, i + 1);
        near(`attention row ${i + 1} is the softmax of its visible scores`, attention.matrix[i].slice(0, i + 1), softmax(visible).probabilities);
        holds(`attention row ${i + 1} gives hidden words exactly 0%`, attention.matrix[i].slice(i + 1).every(value => value === 0));
      });
      near('the last attention row is the shares just computed', attention.matrix.at(-1), attention.weights);

      const blend = data('blend');
      near('the blend uses the attention shares', blend.weights, attention.weights);
      near('the blend uses the recorded Values', blend.values, qkv.values);
      near('contribution = share × Value', blend.contributions, blend.values.map((row, j) => row.map(value => blend.weights[j] * value)));
      near('m is the sum of the contributions', blend.mixed, blend.contributions[0].map((_, k) => sum(blend.contributions.map(row => row[k]))));

      const first = data('shortcut1');
      near('the shortcut step starts from the blend', first.mixed, blend.mixed);
      near('o[1] is a weighted sum plus an offset', dot(first.row, first.mixed) + first.bias, first.projected[0]);
      near('x is the starting vector of step 3', first.input, position.sums.at(-1));
      near('r = x + o', first.residual, first.input.map((value, k) => value + first.projected[k]));

      const expand = data('expand');
      near('the detectors read the rescaled vector u', expand.normalized, data('norm2').output);
      near('the strongest detector is a weighted sum plus an offset', dot(expand.row, expand.normalized) + expand.bias, expand.pre[expand.unit]);
      near('ReLU keeps positive numbers and turns negative ones into 0', expand.hidden, expand.pre.map(value => Math.max(0, value)));
      holds('the worked detector is the strongest one', argmax(expand.hidden) === expand.unit);

      const second = data('shortcut2');
      near('the second shortcut starts from the detector values', second.hidden, expand.hidden);
      near('f[1] is a weighted sum plus an offset', dot(second.row, second.hidden) + second.bias, second.output[0]);
      near('the second shortcut starts from r', second.residual1, first.residual);
      near('y = r + f', second.residual2, second.residual1.map((value, k) => value + second.output[k]));

      const readout = data('readout');
      near('the readout reads the final rescaled vector t', readout.final, data('norm3').output);
      near('z[w] is a weighted sum plus an offset for every word', readout.logits, readout.rows.map((row, w) => dot(row, readout.final) + readout.biases[w]));

      const probabilities = data('probabilities');
      const final = softmax(probabilities.logits);
      near('the probabilities use the scores just computed', probabilities.logits, readout.logits);
      near('exp of every score', probabilities.exps, final.exps);
      near('the total of the exp values', probabilities.total, final.total);
      near('P = exp(z) ÷ total', probabilities.probabilities, final.probabilities);
      near('the probabilities add up to 100%', sum(probabilities.probabilities), 1);

      const choose = data('choose');
      holds('the chosen word has the highest probability', choose.vocabulary[argmax(choose.probabilities)] === choose.chosen);
      near('the chosen probability is the largest', choose.chosenProbability, Math.max(...choose.probabilities));
      near('the choice reads the probabilities just computed', choose.probabilities, probabilities.probabilities);
      holds('the new sentence is the old one plus the chosen word', choose.sentenceAfter === `${choose.sentenceBefore} ${choose.chosen}`);

      const wrap = walkthrough.wrapUp.data;
      holds('the two sentences have the same length and differ', wrap.ids[0].length === wrap.ids[1].length && wrap.ids[0].some((id, index) => id !== wrap.ids[1][index]));
      near('the first sentence is the one walked through', wrap.mainProbabilities, probabilities.probabilities);
      near('the walked word starts identical in both sentences', wrap.differences.x, 0, 0);
      near('the walked word asks the identical question in both sentences', wrap.differences.q, 0, 0);
      holds('the sentences differ from the blend onwards', wrap.differences.m > 1e-6 && wrap.differences.y > 1e-6);
      near('the largest attention difference', wrap.differences.attention, Math.max(...wrap.attention[0].map((value, index) => Math.abs(value - wrap.attention[1][index]))));
      near('the largest vector difference after attention', wrap.differences.m, Math.max(...wrap.m[0].map((value, index) => Math.abs(value - wrap.m[1][index]))));
      wrap.logits.forEach((row, index) => near(`probabilities of sentence ${index + 1} are the softmax of its scores`, wrap.probabilities[index], softmax(row).probabilities));
      holds('the recorded winners have the highest probability', wrap.chosen.every((word, index) => walkthrough.steps.find(step => step.id === 'choose').data.vocabulary[argmax(wrap.probabilities[index])] === word));
    } else if (walkthrough?.kind === 'learning') {
      const loss = data('loss');
      near('penalty = −ln(P)', loss.penalties, loss.probabilities.map(value => -Math.log(value)));
      near('the loss is the average penalty', loss.mean, sum(loss.penalties) / loss.penalties.length);
      holds('there is one prediction for every word but the last', loss.inputs.length === loss.targets.length && loss.probabilities.length === loss.inputs.length);

      const slope = data('slope');
      near('slope by nudging', slope.numericSlope, (slope.lossUp - slope.lossDown) / (2 * slope.delta));
      near('backpropagation agrees with the nudge test', slope.backpropSlope, slope.numericSlope, 1e-6 * Math.max(1, Math.abs(slope.backpropSlope)));
      holds('a negative slope means that raising the number lowers the loss', slope.backpropSlope < 0 ? slope.lossUp < slope.lossDown : slope.lossUp > slope.lossDown);

      const update = data('update');
      near('the update uses the slope from the previous step', update.gradient, slope.backpropSlope, 1e-12);
      near('the slope is limited to between −1 and 1', update.clipped, Math.max(-1, Math.min(1, update.gradient)));
      near('the first Adam step reduces to η · g ÷ (|g| + ε)', update.step, (update.eta * update.clipped) / (Math.abs(update.clipped) + update.epsilon), 1e-12);
      near('w after = w before − step', update.after, update.before - update.step);
      near('the real first training update gives the same w', update.after, update.afterFromRun, 1e-12);
      holds('one update lowers the average loss', update.lossAfter < update.lossBefore);

      const repeat = data('repeat');
      holds('repeating lowers the loss a lot', repeat.curve[0].loss > 0 && repeat.curve.at(-1).loss < repeat.curve[0].loss * 0.5);
    } else failures.push('the walkthrough kind is not recognised');
  } catch (error) {
    failures.push(`the relations could not be evaluated: ${error.message}`);
  }
  return { checked, failures, maxError };
}

function wrap(value, indent, width) {
  const lines = [];
  let line = '';
  for (const word of String(value).split(/\s+/)) {
    if (line && indent.length + line.length + 1 + word.length > width) {
      lines.push(indent + line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(indent + line);
  return lines;
}

function textTable(headers, rows, indent) {
  const cells = [headers.map(String), ...rows.map(row => row.map(cell => (cell === null ? 'none' : String(cell))))];
  const widths = headers.map((_, column) => Math.max(...cells.map(row => row[column].length)));
  const numeric = value => /^[-−]?\d[\d.,]*(%|e[-+]?\d+)?$/.test(value);
  const format = row => row.map((cell, column) => (column > 0 && numeric(cell) ? cell.padStart(widths[column]) : cell.padEnd(widths[column]))).join('  ').trimEnd();
  return [format(cells[0]), widths.map(width => '-'.repeat(width)).join('  '), ...cells.slice(1).map(format)].map(line => indent + line);
}

function renderBlockText(block, indent, width) {
  if (block.type === 'text') return wrap(block.text, indent, width);
  if (block.type === 'code') return [...(block.title ? [`${indent}${block.title}:`] : []), ...block.text.split('\n').flatMap(line => wrap(line, `${indent}  `, width))];
  if (block.type === 'table') return [...(block.title ? [`${indent}${block.title}:`] : []), ...textTable(block.headers, block.rows, `${indent}  `)];
  if (block.type === 'bars') {
    const label = Math.max(...block.items.map(item => item.label.length));
    return [`${indent}${block.title}:`, ...block.items.map(item => `${indent}  ${item.label.padEnd(label)}  ${'#'.repeat(Math.round((30 * item.value) / item.max)).padEnd(30)}  ${item.detail ?? item.value}`)];
  }
  if (block.type === 'details') return [`${indent}${block.title}:`, ...block.blocks.flatMap(inner => [...renderBlockText(inner, `${indent}  `, width), ''])];
  return [];
}

export function renderWalkthroughText(walkthrough, { width = 100 } = {}) {
  const out = [walkthrough.title.toUpperCase(), '='.repeat(width)];
  for (const paragraph of walkthrough.intro) out.push(...wrap(paragraph, '', width), '');
  if (walkthrough.glossary?.length) {
    out.push('Words you will meet:');
    for (const [term, meaning] of walkthrough.glossary) out.push(...wrap(`${term}: ${meaning}`, '  ', width));
    out.push('');
  }
  for (const part of walkthrough.parts) {
    out.push('-'.repeat(width), part.title.toUpperCase(), '-'.repeat(width), '');
    for (const number of part.steps) {
      const step = walkthrough.steps.find(entry => entry.number === number);
      out.push(`STEP ${step.number} of ${walkthrough.steps.length}: ${step.title}${step.technical ? `   [${step.technical}]` : ''}`, '  In plain words:', ...wrap(step.plain, '    ', width), '  The equation:',
        ...step.equations.map(equation => `    ${equation}`), '  Where:', ...step.where.map(([symbol, meaning]) => `    ${symbol} — ${meaning}`), '  With this run\'s numbers:');
      for (const block of step.display) out.push(...renderBlockText(block, '    ', width), '');
      if (step.notice) out.push(...wrap(`Notice: ${step.notice}`, '  ', width), '');
    }
  }
  if (walkthrough.wrapUp) {
    out.push('-'.repeat(width), walkthrough.wrapUp.title.toUpperCase(), '-'.repeat(width), '', ...wrap(walkthrough.wrapUp.plain, '  ', width), '');
    for (const block of walkthrough.wrapUp.display) out.push(...renderBlockText(block, '  ', width), '');
    out.push(...wrap(`Caution: ${walkthrough.wrapUp.caution}`, '  ', width));
  }
  return out.join('\n').trimEnd();
}
