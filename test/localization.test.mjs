import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { labs } from '../lib/labs.mjs';
import { validateWalkthrough } from '../lib/transformer-walkthrough-check.mjs';
import { ui } from '../web/polish.mjs';
import { isBasicLab, polishLabs, localizeLab, localizeBlock, localizeDiagram, localizeTeaching, translate, validateTranslations } from '../web/i18n.mjs';

const basics = labs.filter(isBasicLab);
const recordFor = async lab => ({ ...lab, ...JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8')) });

test('every lab has complete Polish teaching content, case labels and applicable practice prompts without changing evidence', async () => {
  validateTranslations(labs);
  assert.equal(basics.length, 14);
  for (const lab of labs) {
    const record = await recordFor(lab);
    const before = JSON.stringify(record);
    const polish = localizeLab(record, 'pl');
    assert.notEqual(polish.title, lab.title);
    for (const field of ['title', 'concept', 'question', 'caveat', 'exercise']) {
      assert.equal(polish[field], polishLabs[lab.id][field]);
      assert.notEqual(polish[field], lab[field], `${lab.id}: untranslated ${field}`);
    }
    polish.results.forEach((result, index) => {
      const original = record.results[index];
      assert.notEqual(result.label, original.label);
      for (const key of ['output', 'usage', 'apiCalls', 'measurements', 'latencyMs', 'actualModel', 'error', 'toolTrace',
        'memoryTrace', 'summaryTrace', 'toolSteps', 'retrievalTrace', 'agentTrace', 'finalMessages', 'artifacts']) {
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
  assert.throws(() => localizeLab(missing[0], 'pl'), /Missing Polish lab/);
});

test('every authored display heading, explanation, caption and label has a translation, including media variants', async () => {
  const checkBlocks = (original, localized) => original.forEach((block, index) => {
    const translated = localized[index];
    for (const key of ['title', 'caption', 'alt']) {
      if (block[key]) assert.equal(translated[key], localizeTeaching(block[key]));
    }
    if (block.type === 'text') assert.equal(translated.text, localizeTeaching(block.text));
    if (block.type === 'code') assert.equal(translated.text, block.text, 'Recorded code must not be translated');
    if (block.headers) assert.deepEqual(translated.headers, block.headers.map(localizeTeaching));
    if (block.items) block.items.forEach((item, i) => {
      assert.equal(translated.items[i].label, localizeTeaching(item.label));
      assert.equal(translated.items[i].value, item.value);
      assert.equal(translated.items[i].max, item.max);
    });
    if (block.blocks) checkBlocks(block.blocks, translated.blocks);
    assert.equal(translated.artifact, block.artifact, 'Media reference must not change');
  });
  for (const lab of labs) {
    const record = await recordFor(lab);
    const polish = localizeLab(record, 'pl');
    record.results.forEach((result, i) => {
      if (result.request.summary) assert.equal(polish.results[i].request.summary, localizeTeaching(result.request.summary));
      if (result.display) checkBlocks(result.display, polish.results[i].display);
    });
  }
  assert.throws(() => localizeTeaching('An untranslated teaching paragraph'), /Missing Polish teaching translation/);
  assert.throws(() => localizeBlock({ type: 'table', headers: ['Measurement', 'Value'],
    rows: [['A new untranslated measurement', 3]] }), /Missing Polish teaching translation/);
  const record = await recordFor(labs.find(lab => lab.id === '31-embedding-space'));
  const localized = localizeLab(record, 'pl').results[0];
  const table = localized.display.find(block => block.title === 'Jak dobrze geometria rozdziela tematy?');
  assert.equal(table.rows[0][0], 'Długość wektora');
  assert.deepEqual(table.rows.map(row => row[1]), record.results[0].display.find(block => block.title === 'How well does the geometry separate topics?').rows.map(row => row[1]));
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

test('all 40 handouts provide reciprocal language links and explain the original evidence', async () => {
  for (const lab of labs) {
    for (const file of ['readme.md', 'readme.pl.md']) {
      const text = await readFile(`labs/${lab.id}/${file}`, 'utf8');
      assert.match(text, /\[[^\]]+\]\((?:\.\/)?readme\.md\)/, `${lab.id}/${file}: English link`);
      assert.match(text, /\[[^\]]+\]\((?:\.\/)?readme\.pl\.md\)/, `${lab.id}/${file}: Polish link`);
      assert.match(text, file === 'readme.pl.md' ? /[ąćęłńóśźż]/ : /Polish|Polski/);
    }
  }
});

test('every published handout has working flat-file language links and all localization modules are shipped', async () => {
  for (const lab of labs) {
    for (const language of ['en', 'pl']) {
      const text = await readFile(`site/handouts/${lab.id}.${language}.md`, 'utf8');
      assert.ok(text.includes(`](${lab.id}.en.md)`), `${lab.id}: missing downloadable English link`);
      assert.ok(text.includes(`](${lab.id}.pl.md)`), `${lab.id}: missing downloadable Polish link`);
      assert.doesNotMatch(text, /\]\((?:\.\/)?readme(?:\.pl)?\.md\)/);
    }
  }
  for (const file of ['i18n.mjs', 'polish.mjs', 'polish-advanced.mjs', 'polish-displays.mjs', 'polish-walkthrough.mjs']) {
    assert.equal(await readFile(`site/${file}`, 'utf8'), await readFile(`web/${file}`, 'utf8'), `Stale shipped module: ${file}`);
  }
});
