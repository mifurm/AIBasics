import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { labs } from '../lib/labs.mjs';
import { validateWalkthrough } from '../lib/transformer-walkthrough-check.mjs';
import { basicLabs, ui } from '../web/polish.mjs';
import { isBasicLab, localizeLab, localizeDiagram, translate, validateTranslations } from '../web/i18n.mjs';

const basics = labs.filter(isBasicLab);
const recordFor = async lab => ({ ...lab, ...JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8')) });

test('every basic lab has complete Polish teaching content, case labels and applicable practice prompts', async () => {
  validateTranslations(labs);
  assert.equal(basics.length, 14);
  for (const lab of basics) {
    const record = await recordFor(lab);
    const before = JSON.stringify(record);
    const polish = localizeLab(record, 'pl');
    assert.notEqual(polish.title, lab.title);
    for (const field of ['title', 'concept', 'question', 'caveat', 'exercise']) {
      assert.equal(polish[field], basicLabs[lab.id][field]);
      assert.notEqual(polish[field], lab[field], `${lab.id}: untranslated ${field}`);
    }
    polish.results.forEach((result, index) => {
      const original = record.results[index];
      assert.notEqual(result.label, original.label);
      for (const key of ['output', 'usage', 'apiCalls', 'measurements', 'latencyMs', 'actualModel', 'error', 'toolTrace']) {
        assert.deepEqual(result[key], original[key], `${lab.id}: changed evidence ${key}`);
      }
      assert.deepEqual(result.request.messages, original.request.messages);
      assert.deepEqual(result.comparison?.targetChecks, original.comparison?.targetChecks);
    });
    assert.equal(JSON.stringify(record), before, 'Localization must not mutate evidence');
    assert.equal(localizeLab(record, 'en'), record);
  }
  const missing = [{ ...basics[2], id: '01-missing-translation' }];
  assert.throws(() => validateTranslations(missing), /Incomplete Polish/);
  assert.equal(localizeLab(labs.find(lab => lab.id === '29-tokenization'), 'pl').title, 'Tokens: learned chunks, uneven costs');
});

test('both Polish walkthroughs preserve every equation and operand and still reproduce the recorded math', async () => {
  const english = await recordFor(basics[0]);
  const polish = localizeLab(english, 'pl');
  for (const [index, original] of english.results.entries()) {
    const source = original.computationTrace?.walkthrough;
    if (!source) continue;
    const localized = polish.results[index].computationTrace.walkthrough;
    assert.deepEqual(validateWalkthrough(localized).failures, []);
    assert.notEqual(localized.title, source.title);
    localized.steps.forEach((step, i) => {
      assert.notEqual(step.title, source.steps[i].title);
      assert.notEqual(step.plain, source.steps[i].plain);
      assert.deepEqual(step.data, source.steps[i].data);
      assert.deepEqual(step.equations, source.steps[i].equations);
      assert.deepEqual(step.where.map(([symbol]) => symbol), source.steps[i].where.map(([symbol]) => symbol));
    });
  }
});

test('Polish tokenization tables translate explanations without changing sentence text, IDs, bytes or counts', async () => {
  const english = await recordFor(basics[1]);
  const polish = localizeLab(english, 'pl');
  const sourceTables = english.results[0].display.filter(block => block.type === 'table');
  const tables = polish.results[0].display.filter(block => block.type === 'table');
  assert.equal(tables.length, 4);
  assert.deepEqual(tables[0].rows.map(row => row.slice(1)), sourceTables[0].rows.map(row => row.slice(1)));
  assert.deepEqual(tables[0].rows.map(row => row[0]), ['Polski', 'Angielski', 'Hiszpański']);
  tables.slice(1).forEach((table, i) => {
    assert.notEqual(table.title, sourceTables[i + 1].title);
    assert.deepEqual(table.rows, sourceTables[i + 1].rows);
  });
  polish.results[0].display.filter(block => block.type === 'text').forEach(block => {
    assert.ok(!english.results[0].display.some(source => source.text === block.text), 'Teaching paragraph needs a Polish translation');
  });
});

test('the localized architecture keeps the implemented dictionary and mathematical content intact', async () => {
  const source = await readFile('web/transformer.svg', 'utf8');
  const polish = localizeDiagram(source);
  assert.match(polish, /xml:lang="pl"/);
  assert.match(polish, /Jak mały transformer przewiduje następny token/);
  assert.deepEqual(polish.match(/<tspan class="idnum">.*?<\/text>/g), source.match(/<tspan class="idnum">.*?<\/text>/g));
  assert.ok(polish.includes('softmax(Q K^T / sqrt(8) + mask) V -&gt; Wout'));
  assert.throws(() => localizeDiagram('<svg/>'), /Missing diagram text/);
});

test('interface templates preserve named values and reject unsupported or missing translations explicitly', () => {
  assert.equal(translate('Input: {input} | Output: {output}{reasoning}', 'pl', { input: 11, output: 9, reasoning: '' }), 'Wejście: 11 | Wyjście: 9');
  for (const [source, polish] of Object.entries(ui)) {
    assert.deepEqual([...source.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
      [...polish.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), `Changed interpolation keys: ${source}`);
  }
  assert.throws(() => translate('Language', 'es'), /Unsupported language/);
  assert.throws(() => translate('Missing key', 'pl'), /Missing Polish/);
  assert.throws(() => translate('Input: {input} | Output: {output}{reasoning}', 'pl'), /Missing translation value/);
});

test('all basic handouts provide reciprocal language links and explain the original evidence', async () => {
  for (const lab of basics) {
    for (const file of ['readme.md', 'readme.pl.md']) {
      const text = await readFile(`labs/${lab.id}/${file}`, 'utf8');
      assert.match(text, /\[[^\]]+\]\((?:\.\/)?readme\.md\)/, `${lab.id}/${file}: English link`);
      assert.match(text, /\[[^\]]+\]\((?:\.\/)?readme\.pl\.md\)/, `${lab.id}/${file}: Polish link`);
      assert.match(text, file === 'readme.pl.md' ? /[ąćęłńóśźż]/ : /Polish|Polski/);
    }
  }
});
