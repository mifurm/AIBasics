import { experimentResult, table, bars, text } from './genai/contract.mjs';

export const tokenSentences = [
  { id: 'pl', language: 'Polish', text: 'Kot śpi na ciepłym parapecie.' },
  { id: 'en', language: 'English', text: 'The cat sleeps on the warm windowsill.' },
  { id: 'es', language: 'Spanish', text: 'El gato duerme en el alféizar cálido.' },
];

export async function tokenizeSentences(sentences = tokenSentences) {
  const { get_encoding } = await import('tiktoken');
  const encoder = get_encoding('o200k_base');
  const decoder = new TextDecoder();
  try {
    return sentences.map(sentence => {
      const ids = [...encoder.encode(sentence.text, [], [])];
      const pieces = ids.map(id => {
        const bytes = [...encoder.decode(Uint32Array.of(id))];
        return { id, bytes, text: decoder.decode(Uint8Array.from(bytes)) };
      });
      return {
        ...sentence, characters: [...sentence.text].length,
        bytes: Buffer.byteLength(sentence.text), tokens: ids.length, ids, pieces,
        decoded: decoder.decode(encoder.decode(Uint32Array.from(ids))),
      };
    });
  } finally {
    encoder.free();
  }
}

const label = 'One meaning, three languages, different token counts';

export const tokenizerLab = {
  id: '00a-tokens', title: 'What is a token? One sentence, three languages', minutes: 7, series: 'foundations',
  concept: 'A tokenizer turns text into a sequence of integer IDs. Each ID represents a learned chunk of bytes: often a word or part of a word, sometimes punctuation or part of a character. The model reads these IDs, not words directly.',
  question: 'These sentences mean the same thing. Will Polish, English, and Spanish use the same number of tokens?',
  caveat: 'Counts use OpenAI\'s o200k_base encoding (used by GPT-4o) via the community-maintained tiktoken JavaScript/WASM bindings. They count only the sentence, not chat formatting or generated output. One sentence is not a ranking of languages or a price estimate.',
  exercise: 'Replace all three translations in lib/tokenizer-lab.mjs with another sentence of the same meaning, rerun, and compare the IDs, boundaries, and counts.',
  cases: [{ label, experiment: true }],
  async run(ctx) {
    const started = performance.now();
    const rows = await tokenizeSentences();
    const english = rows.find(row => row.id === 'en').tokens;
    const max = Math.max(...rows.map(row => row.tokens));
    ctx.addResult(experimentResult({
      label, startedAt: started,
      summary: 'Encode three translations of "The cat sleeps on the warm windowsill." with OpenAI\'s o200k_base vocabulary using tiktoken JavaScript/WASM bindings. Decode each token to inspect its bytes, then decode the full sequence to verify the original text. This runs on the CPU without a model API request.',
      parameters: { encoding: 'o200k_base', implementation: 'tiktoken (JavaScript/WASM bindings)', modelExample: 'gpt-4o' },
      output: rows.map(row => `${row.language}: ${row.tokens} tokens\n${row.text}\nPieces: ${row.pieces.map(piece => JSON.stringify(piece.text)).join(' | ')}\nIDs: ${row.ids.join(', ')}`).join('\n\n'),
      measurements: { encoding: 'o200k_base', rows },
      display: [
        text('Lab 00 used a tiny word-based dictionary. A real OpenAI tokenizer has a much larger learned subword vocabulary. Tokenization is a fixed, reversible conversion, not translation or a model thinking about the meaning.'),
        bars('Tokens for the same meaning', rows.map(row => ({ label: row.language, value: row.tokens, max, detail: `${row.tokens} tokens` }))),
        table('Same meaning does not mean the same token count', ['Language', 'Sentence', 'Characters', 'UTF-8 bytes', 'Tokens', 'Relative to English'],
          rows.map(row => [row.language, row.text, row.characters, row.bytes, row.tokens, `${(row.tokens / english).toFixed(2)}x`])),
        text('Read the pieces from left to right. Quotes make leading spaces visible: " cat" includes its space. A word can span several tokens; punctuation can be a token too. A single token can contain only part of a UTF-8 character, so its isolated text may show a replacement character. The byte column is exact; decode the whole sequence to recover the sentence.'),
        ...rows.map(row => table(`${row.language}: inspect every token`, ['Position', 'Token ID', 'Text piece (quoted)', 'UTF-8 bytes (hex)'],
          row.pieces.map((piece, index) => [index + 1, piece.id, JSON.stringify(piece.text), Buffer.from(piece.bytes).toString('hex')]))),
        text('Frequent byte patterns can be stored in fewer chunks. Spelling, accents, spaces, and the tokenizer vocabulary all affect the count. The shortest sentence in characters need not be shortest in tokens. Different encodings can split the same text differently.'),
        text('Input and output limits are measured in tokens, not words. Counts affect context usage and, for token-billed APIs, cost. These are exact sentence counts, not estimated API usage; no chat overhead has been subtracted. Continue with lab 06 for output limits and lab 29 for BPE training and broader comparisons.'),
      ],
    }));
  },
  evaluate(results) {
    const rows = results[0].measurements.rows;
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    return [
      check('All three original translations are present, in order',
        rows.length === tokenSentences.length && rows.every((row, i) => row.id === tokenSentences[i].id && row.text === tokenSentences[i].text),
        rows.map(row => row.language).join(', ')),
      check('Counts match the recorded IDs and pieces',
        rows.every(row => Number.isInteger(row.tokens) && row.tokens > 0 && row.tokens === row.ids.length &&
          row.tokens === row.pieces.length && row.ids.every((id, i) => Number.isInteger(id) && id >= 0 && id === row.pieces[i].id)),
        rows.map(row => `${row.language}: ${row.tokens}`).join(', ')),
      check('Token bytes and full-sequence decoding recover the exact Unicode text',
        rows.every(row => row.decoded === row.text &&
          Buffer.from(row.pieces.flatMap(piece => piece.bytes)).equals(Buffer.from(row.text)) &&
          row.bytes === Buffer.byteLength(row.text) && row.characters === [...row.text].length),
        'Compare full UTF-8 bytes, not separately decoded token fragments.'),
      check('This example demonstrates three different measured token counts',
        new Set(rows.map(row => row.tokens)).size === 3,
        'An observation about these translations with o200k_base, not a rule about languages.'),
      check('Tokenization used no model API requests',
        results[0].apiRequests === 0 && results[0].usage === null,
        'CPU-only encoding and decoding; sentence tokens are not API billing usage.'),
    ];
  },
};
