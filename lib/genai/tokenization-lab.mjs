import { buildRequest } from '../azure.mjs';
import { experimentResult, table, bars, text } from './contract.mjs';

export const bpeCorpus = { robot: 8, robots: 6, robotic: 3, club: 7, clubs: 5, learn: 6, learner: 3, learning: 4, play: 5, player: 3, playing: 4 };
export const bpeProbeWords = ['robots', 'learners', 'playful', 'zebra'];
const END = '</w>';

function mergeSymbols(symbols, left, right) {
  const merged = [];
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i] === left && symbols[i + 1] === right) {
      merged.push(left + right);
      i++;
    } else merged.push(symbols[i]);
  }
  return merged;
}

export function trainBpe(corpus, mergeCount) {
  let words = Object.entries(corpus).map(([word, count]) => ({ word, count, symbols: [...word, END] }));
  const merges = [];
  for (let step = 1; step <= mergeCount; step++) {
    const pairs = new Map();
    for (const { symbols, count } of words) {
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + count);
      }
    }
    if (!pairs.size) break;
    const [key, count] = [...pairs.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    const [left, right] = key.split('\u0000');
    merges.push({ step, pair: [left, right], count, symbol: left + right });
    words = words.map(entry => ({ ...entry, symbols: mergeSymbols(entry.symbols, left, right) }));
  }
  return { merges, trainedWords: words };
}

export function segmentWord(word, merges) {
  let symbols = [...word, END];
  for (const merge of merges) symbols = mergeSymbols(symbols, merge.pair[0], merge.pair[1]);
  return symbols;
}

export const languageSentences = [
  { id: 'en', language: 'English', text: 'The cat sleeps on the warm windowsill.' },
  { id: 'pl', language: 'Polish', text: 'Kot śpi na ciepłym parapecie.' },
  { id: 'de', language: 'German', text: 'Die Katze schläft auf der warmen Fensterbank.' },
  { id: 'es', language: 'Spanish', text: 'El gato duerme en el alféizar cálido.' },
  { id: 'ru', language: 'Russian', text: 'Кошка спит на тёплом подоконнике.' },
  { id: 'ja', language: 'Japanese', text: '猫は暖かい窓辺で寝ています。' },
  { id: 'ar', language: 'Arabic', text: 'تنام القطة على حافة النافذة الدافئة.' },
  { id: 'hi', language: 'Hindi', text: 'बिल्ली गर्म खिड़की पर सोती है।' },
];

export const formatProbes = [
  { id: 'date', kind: 'Date', text: '2026-11-16' },
  { id: 'digits', kind: 'Sixteen digits', text: '1234567890123456' },
  { id: 'number-words', kind: 'Number in words', text: 'one million two hundred thirty-four thousand' },
  { id: 'code', kind: 'Code', text: 'for (let i = 0; i < n; i++) { total += i; }' },
  { id: 'emoji', kind: 'Five emoji', text: '🙂🙂🙂🙂🙂' },
  { id: 'repeat', kind: 'Twenty letter a', text: 'aaaaaaaaaaaaaaaaaaaa' },
  { id: 'url', kind: 'URL', text: 'https://example.com/a/b?x=1&y=2' },
  { id: 'spaces', kind: 'Ten spaces', text: 'a          b' },
];

const BASELINE = 'a';
const labels = [
  'Toy BPE learns merges from eleven words',
  'The same sentence in eight languages (GPT-4o)',
  'Numbers, code, emoji, and whitespace (GPT-4o)',
  'Does another model count the same? (GPT-5-mini)',
];

const probeRequest = (model, content, config) => buildRequest({
  model, messages: [{ role: 'user', content }],
  parameters: model === 'reasoning' ? { max_completion_tokens: 16, reasoning_effort: 'minimal' } : { max_tokens: 1, temperature: 0 },
}, config);

async function measure(ctx, model, items) {
  const calls = [];
  const promptTokens = async content => {
    const response = await ctx.azure.chat(probeRequest(model, content, ctx.config));
    calls.push(response.call);
    return response.usage.prompt_tokens;
  };
  const overhead = (await promptTokens(BASELINE)) - 1;
  const rows = [];
  for (const item of items) {
    const tokens = (await promptTokens(item.text)) - overhead;
    const characters = [...item.text].length;
    rows.push({ ...item, characters, bytes: Buffer.byteLength(item.text), tokens, charactersPerToken: characters / tokens });
  }
  return { overhead, rows, calls };
}

const round = (value, digits = 2) => Number(value.toFixed(digits));

export const tokenizationLab = {
  id: '29-tokenization', title: 'Tokens: learned chunks, uneven costs', minutes: 10, series: 'genai',
  concept: 'Models read learned chunks of text, not words or letters. A tokenizer learns frequent pieces from data, so the same meaning can cost very different numbers of tokens across languages and formats.',
  question: 'Which version of the same sentence is cheapest to send, and why might that be unfair to speakers of other languages?',
  caveat: 'The toy tokenizer learns from eleven words; real tokenizers learn from enormous corpora. Token counts here are measured from Azure usage after subtracting a calibrated chat-message overhead. They are not prices or a ranking of languages.',
  exercise: 'Add a sentence in your own language to languageSentences in lib/genai/tokenization-lab.mjs, redeploy, and compare its token count with English.',
  cases: labels.map(label => ({ label, experiment: true })),
  async run(ctx) {
    let started = performance.now();
    const trained = trainBpe(bpeCorpus, 18);
    const segmentation = bpeProbeWords.map(word => ({ word, seen: word in bpeCorpus, pieces: segmentWord(word, trained.merges) }));
    ctx.addResult(experimentResult({
      label: labels[0], startedAt: started,
      summary: `Count adjacent symbol pairs across eleven fictional classroom words (${Object.values(bpeCorpus).reduce((a, b) => a + b, 0)} word occurrences), merge the most frequent pair, and repeat 18 times. No model API request is used.`,
      output: `Learned ${trained.merges.length} merges. Most frequent first merge: "${trained.merges[0].pair.join(' + ')}" (${trained.merges[0].count} occurrences).\n` +
        segmentation.map(entry => `${entry.word}${entry.seen ? '' : ' (unseen)'} -> ${entry.pieces.join(' | ')}`).join('\n'),
      measurements: { corpus: bpeCorpus, merges: trained.merges, segmentation },
      display: [
        text('Byte-pair encoding starts from single characters (plus an end-of-word marker) and repeatedly merges the most frequent adjacent pair. Frequent chunks become single tokens.'),
        table('Learned merges, in order', ['Step', 'Merged pair', 'Occurrences', 'New token'],
          trained.merges.map(merge => [merge.step, merge.pair.join(' + '), merge.count, merge.symbol])),
        table('Segmenting words with the learned merges', ['Word', 'Seen in training?', 'Pieces'],
          segmentation.map(entry => [entry.word, entry.seen ? 'yes' : 'no', entry.pieces.join(' | ')])),
      ],
    }));
    started = performance.now();
    const languages = await measure(ctx, 'standard', languageSentences);
    const english = languages.rows[0].tokens;
    ctx.addResult(experimentResult({
      label: labels[1], startedAt: started, calls: languages.calls,
      summary: `Send each sentence as one user message to GPT-4o with max_tokens 1. The reported prompt tokens minus a calibrated ${languages.overhead}-token chat overhead (measured with the one-token message "${BASELINE}") is the sentence's token count.`,
      output: languages.rows.map(row => `${row.language}: ${row.tokens} tokens for ${row.characters} characters (${round(row.tokens / english)}x English)`).join('\n'),
      measurements: { model: 'gpt-4o', overheadTokens: languages.overhead, rows: languages.rows },
      display: [
        bars('Tokens for the same meaning', languages.rows.map(row => ({ label: row.language, value: row.tokens, max: Math.max(...languages.rows.map(entry => entry.tokens)), detail: `${round(row.tokens / english)}x English` }))),
        table('Measured cost of one sentence', ['Language', 'Text', 'Characters', 'UTF-8 bytes', 'Tokens', 'Characters per token', 'Relative to English'],
          languages.rows.map(row => [row.language, row.text, row.characters, row.bytes, row.tokens, round(row.charactersPerToken), `${round(row.tokens / english)}x`])),
        text(`Calibrated chat-message overhead: ${languages.overhead} tokens, subtracted from every count.`),
      ],
    }));
    started = performance.now();
    const formats = await measure(ctx, 'standard', formatProbes.map(probe => ({ ...probe, language: probe.kind })));
    ctx.addResult(experimentResult({
      label: labels[2], startedAt: started, calls: formats.calls,
      summary: 'Measure token counts for dates, long digit strings, number words, code, emoji, repeated letters, URLs, and runs of spaces with the same calibrated method.',
      output: formats.rows.map(row => `${row.kind}: ${row.tokens} tokens for ${row.characters} characters (${round(row.charactersPerToken)} characters/token)`).join('\n'),
      measurements: { model: 'gpt-4o', overheadTokens: formats.overhead, rows: formats.rows },
      display: [
        bars('Characters packed into each token (higher means cheaper)', formats.rows.map(row => ({ label: row.kind, value: round(row.charactersPerToken), max: Math.max(...formats.rows.map(entry => entry.charactersPerToken)), detail: `${row.tokens} tokens` }))),
        table('Measured cost by content type', ['Content', 'Text', 'Characters', 'UTF-8 bytes', 'Tokens', 'Characters per token'],
          formats.rows.map(row => [row.kind, row.text, row.characters, row.bytes, row.tokens, round(row.charactersPerToken)])),
      ],
    }));
    started = performance.now();
    const other = await measure(ctx, 'reasoning', languageSentences);
    const same = other.rows.filter((row, index) => row.tokens === languages.rows[index].tokens).length;
    ctx.addResult(experimentResult({
      label: labels[3], startedAt: started, calls: other.calls,
      summary: `Repeat the eight-language measurement with the GPT-5-mini deployment (max_completion_tokens 16, minimal reasoning). Its calibrated chat overhead is ${other.overhead} tokens.`,
      output: `${same} of ${other.rows.length} sentence counts equal GPT-4o.\n` + other.rows.map((row, index) => `${row.language}: GPT-4o ${languages.rows[index].tokens}, GPT-5-mini ${row.tokens}`).join('\n'),
      measurements: { model: 'gpt-5-mini', overheadTokens: other.overhead, rows: other.rows, gpt4oTokens: languages.rows.map(row => row.tokens), identical: same },
      display: [
        table('Same sentences, two models', ['Language', 'GPT-4o tokens', 'GPT-5-mini tokens', 'Difference'],
          other.rows.map((row, index) => [row.language, languages.rows[index].tokens, row.tokens, row.tokens - languages.rows[index].tokens])),
        text(`GPT-5-mini calibrated overhead: ${other.overhead} tokens (GPT-4o: ${languages.overhead}). Do not assume tokenizers are identical across models; measure them.`),
      ],
    }));
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [toy, languages, formats, other] = results;
    const merges = toy.measurements.merges;
    const counts = merges.map(merge => merge.count);
    return [
      check('Toy BPE learned every requested merge deterministically', merges.length === 18 && merges.every((merge, index) => merge.step === index + 1), `${merges.length} merges.`),
      check('Most frequent pair counts never increase', counts.every((count, index) => index === 0 || count <= counts[index - 1]), counts.join(', ')),
      check('Segmentations reconstruct each word', toy.measurements.segmentation.every(entry => entry.pieces.join('') === `${entry.word}</w>`), 'Joined pieces equal the word plus end marker.'),
      check('Calibrated overhead is a small constant for both models', [languages, other].every(result => result.measurements.overheadTokens >= 0 && result.measurements.overheadTokens < 30),
        `GPT-4o ${languages.measurements.overheadTokens}, GPT-5-mini ${other.measurements.overheadTokens}`),
      check('Every probe has a positive measured token count', [languages, formats, other].every(result => result.measurements.rows.every(row => Number.isInteger(row.tokens) && row.tokens > 0)), 'All token counts are positive integers.'),
      check('Probe sets are complete', languages.measurements.rows.length === languageSentences.length && formats.measurements.rows.length === formatProbes.length && other.measurements.rows.length === languageSentences.length, `${languageSentences.length} sentences and ${formatProbes.length} format probes.`),
      check('Same-meaning ratios are reported, not asserted', languages.measurements.rows.every(row => Number.isFinite(row.tokens / languages.measurements.rows[0].tokens)),
        languages.measurements.rows.map(row => `${row.language} ${round(row.tokens / languages.measurements.rows[0].tokens)}x`).join(', ')),
    ];
  },
};
