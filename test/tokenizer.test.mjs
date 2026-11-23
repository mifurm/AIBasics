import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tokenizerLab, tokenizeSentences } from '../lib/tokenizer-lab.mjs';
import { runGenaiLab } from '../lib/genai/runner.mjs';
import { evaluate } from '../lib/evaluate.mjs';

test('the introductory tokenizer lab records real counts, token pieces and display tables without network calls', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Tokenization must work offline'); });
  const directory = await mkdtemp(join(tmpdir(), 'tokenizer-lab-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = pathToFileURL(`${directory}/`);
  const record = await runGenaiLab(tokenizerLab, { config: {}, log: () => {} }, root);
  const saved = JSON.parse(await readFile(new URL('00a-tokens.json', root), 'utf8'));
  assert.deepEqual(saved, record);
  const [result] = record.results;
  const { rows } = result.measurements;
  assert.deepEqual(rows.map(row => [row.language, row.tokens]), [['Polish', 11], ['English', 9], ['Spanish', 12]]);
  assert.ok(rows[0].characters < rows[1].characters && rows[0].tokens > rows[1].tokens);
  assert.equal(result.usage, null);
  assert.equal(result.apiRequests, 0);
  assert.ok(evaluate(tokenizerLab.id, record.results).every(check => check.passed));
  const tables = result.display.filter(block => block.type === 'table');
  assert.deepEqual(tables[0].rows.map(row => row[4]), [11, 9, 12]);
  rows.forEach((row, i) => {
    assert.equal(tables[i + 1].rows.length, row.tokens);
    assert.deepEqual(tables[i + 1].rows.map(entry => entry[1]), row.ids);
    assert.equal(row.decoded, row.text);
    assert.equal(Buffer.from(row.pieces.flatMap(piece => piece.bytes)).toString(), row.text);
  });
  assert.ok(rows[1].pieces.some(piece => piece.text === ' cat'));
  assert.ok(rows[1].pieces.some(piece => piece.text === ' windows'));
  assert.ok(rows[1].pieces.some(piece => piece.text === 'ill'));

  const damagedCount = structuredClone(record.results);
  damagedCount[0].measurements.rows[0].tokens++;
  assert.ok(evaluate(tokenizerLab.id, damagedCount).some(check => !check.passed));
  const damagedBytes = structuredClone(record.results);
  damagedBytes[0].measurements.rows[0].pieces[0].bytes[0] = 0;
  assert.ok(evaluate(tokenizerLab.id, damagedBytes).some(check => !check.passed));
});

test('token byte evidence preserves Unicode even when a token splits a character', async () => {
  const original = 'Zażółć gęślą jaźń. 🧑‍🚀';
  const [row] = await tokenizeSentences([{ id: 'unicode', language: 'Unicode probe', text: original }]);
  assert.equal(row.decoded, original);
  assert.equal(row.bytes, Buffer.byteLength(original));
  assert.equal(row.characters, [...original].length);
  assert.equal(Buffer.from(row.pieces.flatMap(piece => piece.bytes)).toString(), original);
  assert.ok(row.pieces.some(piece => piece.text.includes('\ufffd')), 'Probe must exercise split UTF-8 bytes');
  assert.notEqual(row.pieces.map(piece => piece.text).join(''), original);
});
