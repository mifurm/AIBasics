import { languages, isBasicLab, localizeLab, translate, assertLanguage } from './i18n.mjs';

const nav = document.getElementById('labNav');
const main = document.getElementById('main');
const languageSelect = document.getElementById('languageSelect');
let records;
let currentIndex = 0;
let currentCase = 0;
let language = new URL(location.href).searchParams.get('lang');
if (!language) {
  try { language = localStorage.getItem('ai-basics-language'); } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn('Language preference storage is unavailable.', error);
  }
}
if (language && !languages.includes(language)) console.warn(`Unsupported saved language "${language}"; using English.`);
language = languages.includes(language) ? language : 'en';
const t = (source, values) => translate(source, language, values);

function showLanguage() {
  document.documentElement.lang = language;
  languageSelect.value = language;
  document.querySelector('label[for="languageSelect"]').textContent = t('Language');
  nav.setAttribute('aria-label', t('Classroom labs'));
  document.querySelector('header .eyebrow').textContent = t("A BEGINNER'S FIELD GUIDE");
  document.querySelector('footer').textContent = t('These are saved observations, not live model calls. AI output may be wrong. Only fictional classroom data is used.');
  if (!records) {
    main.replaceChildren(element('p', t('Loading recorded results...')));
    return;
  }
  document.title = t('AI Basics | {count} classroom labs', { count: records.length });
  document.querySelector('header p').textContent = t('{count} small experiments. Recorded outcomes. No magic.', { count: records.length });
  nav.replaceChildren();
  records.forEach((record, i) => {
    const lab = localizeLab(record, language);
    const button = element('button', `${lab.id.split('-')[0]} ${lab.title}`);
    button.dataset.index = String(i);
    button.addEventListener('click', () => showLab(i));
    nav.append(button);
  });
  showLab(currentIndex, currentCase);
}

languageSelect.addEventListener('change', () => {
  assertLanguage(languageSelect.value);
  language = languageSelect.value;
  try { localStorage.setItem('ai-basics-language', language); } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn('Could not save the language preference.', error);
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(null, '', url);
  showLanguage();
});
showLanguage();

function originalEvidence() {
  return element('p', t('Original recorded evidence (English)'), 'metrics');
}

function showPractice(lab, caseIndex) {
  if (language !== 'pl' || !lab.practice?.[caseIndex]) return;
  const section = element('details', undefined, 'practice-prompt');
  section.open = true;
  section.append(element('summary', t('Polish practice prompt (translation, not an executed request)')),
    element('pre', lab.practice[caseIndex].map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')),
    element('p', t('Practice variants can change token counts and answers. JSON fields, tool names and fixed test values remain as required by the original contract. Do not send the untrusted-context example to bypass filters.'), 'metrics'));
  main.append(section);
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function evidenceTable(headers, rows) {
  const table = element('table', undefined, 'evidence-table');
  const head = element('tr');
  for (const header of headers) {
    const cell = element('th', header);
    cell.scope = 'col';
    head.append(cell);
  }
  const thead = element('thead');
  thead.append(head);
  const tbody = element('tbody');
  for (const row of rows) {
    const tr = element('tr');
    for (const value of row) tr.append(element('td', String(value)));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

function showComputation(answer, trace) {
  if (trace.training) {
    answer.append(element('h3', t('Measured training loss (lower is better)')),
      evidenceTable(['Update', 'Mean cross-entropy'].map(key => t(key)), trace.training.curve.map(point => [point.step, point.loss.toFixed(5)])));
    const probes = [{ ...trace.beforeTraining, prefix: t('Before training: robot') }, ...trace.probes];
    answer.append(element('h3', t('Actual next-token predictions')),
      evidenceTable(['Context', 'Next token', 'Probability'].map(key => t(key)), probes.flatMap(probe =>
        probe.distribution.slice(0, 3).map(entry => [probe.prefix, entry.token, `${(100 * entry.probability).toFixed(3)}%`]))));
  }
  if (trace.original) {
    answer.append(element('h3', t('Causal attention: each row reads only itself and earlier columns')),
      evidenceTable([t('Reads from ->'), ...trace.original.tokens], trace.original.attention.map((row, i) =>
        [trace.original.tokens[i], ...row.map((value, j) => j > i ? t('blocked') : value.toFixed(3))])));
  }
  if (trace.generation) {
    answer.append(element('h3', t('One token at a time')),
      evidenceTable(['Context supplied', 'Token appended', 'Probability'].map(key => t(key)), trace.generation.steps.map(step =>
        [step.prefix, step.nextToken, `${(100 * step.distribution[0].probability).toFixed(3)}%`])));
  }
  const details = element('details');
  details.append(element('summary', t('Inspect measured vectors, attention, logits, and experiment evidence')),
    element('pre', JSON.stringify(trace, null, 2), 'settings'));
  answer.append(details);
}

function showModelComparison(lab, selectedPair, index) {
  const pairs = lab.results.filter((_, resultIndex) => resultIndex % 2 === 0)
    .map((_, pairIndex) => lab.results.slice(pairIndex * 2, pairIndex * 2 + 2));
  const label = element('label', t('Prompt variant'));
  label.htmlFor = 'caseSelect';
  const select = element('select');
  select.id = 'caseSelect';
  pairs.forEach((pair, pairIndex) => {
    const option = element('option', `${pair[0].comparison.taskTitle} / ${pair[0].comparison.promptStyle}`);
    option.value = String(pairIndex);
    select.append(option);
  });
  select.value = String(selectedPair);
  select.addEventListener('change', () => showLab(index, Number(select.value)));
  main.append(label, select);
  const pair = pairs[selectedPair];
  const shared = element('section', undefined, 'shared-prompt');
  shared.append(element('h3', t('Identical prompt sent to both models')),
    ...(language === 'pl' ? [originalEvidence()] : []),
    element('pre', pair[0].request.messages.map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')),
    element('p', t('Only the model and its supported configuration change within this pair. Prompt wording changes only when you select broad versus specific.'), 'metrics'));
  main.append(shared);
  showPractice(lab, selectedPair * 2);
  const grid = element('div', undefined, 'comparison model-pair');
  for (const [offset, result] of pair.entries()) {
    const card = element('section');
    card.dataset.resultIndex = String(selectedPair * 2 + offset);
    const usage = result.usage;
    const reasoning = usage.completion_tokens_details?.reasoning_tokens;
    const words = result.output.trim().split(/\s+/).length;
    const settings = Object.fromEntries(Object.entries(result.request).filter(([key]) => key !== 'messages'));
    card.append(element('h3', result.comparison.modelLabel),
      element('pre', result.output, 'output'),
      element('p', t('{model} | {ms} ms | finish: {reason}', { model: result.actualModel, ms: result.latencyMs, reason: result.finishReason }), 'metrics'),
      evidenceTable(['Measured quantity', 'This response'].map(key => t(key)), [
        [t('Input tokens'), usage.prompt_tokens],
        [t('Completion tokens (including reasoning)'), usage.completion_tokens],
        [t('Reasoning tokens'), reasoning ?? t('Not reported')],
        [t('Total tokens'), usage.total_tokens],
        [t('Visible words (whitespace-separated)'), words],
      ]));
    const settingsDetails = element('details');
    settingsDetails.append(element('summary', t('Inspect model-specific API settings')), element('pre', JSON.stringify(settings, null, 2), 'settings'));
    card.append(settingsDetails, element('h3', t('Match to the specific-prompt targets')));
    if (language === 'pl') card.append(originalEvidence());
    const checks = element('ul', undefined, 'checks');
    for (const check of result.comparison.targetChecks) {
      checks.append(element('li', `${t(check.passed ? 'MATCHED' : 'NOT MATCHED')}: ${check.name} - ${check.detail}`));
    }
    card.append(checks);
    grid.append(card);
  }
  main.append(grid);
  const comparison = element('aside', undefined, 'discussion');
  comparison.append(element('strong', t('What this pair actually shows')),
    element('p', t(pair[0].output.trim() === pair[1].output.trim() ?
      'These two recorded outputs are identical. Agreement is a valid observation, not a failed experiment.' :
      'These two recorded outputs differ. Compare their meaning and instruction following, not just their wording.')),
    element('p', t('The target checks describe the specific prompt. The broad prompt did not request every target; a target mismatch alone is not proof of a wrong answer or a weaker model.')),
    element('p', t('Manual review: {text}', { text: pair[0].comparison.manualRubric })),
    element('p', t('Latency and tokens describe one run, not a benchmark or dollar cost. Both models may be correct; supported settings and output budgets differ. No hidden chain-of-thought is displayed.')));
  main.append(comparison);
}

function mediaUrl(lab, artifact) {
  return `./media/${encodeURIComponent(lab.id)}/${encodeURIComponent(artifact.file)}`;
}

// Equations are plain text such as "s_ij = (q_i · k_j) / √8". Single letters become variables (italic), longer
// names such as exp or ReLU stay upright, and "_x" becomes a subscript. Everything is built from text nodes.
function typeset(source) {
  const fragment = document.createDocumentFragment();
  const token = /([A-Za-z\u0391-\u03a9\u03b1-\u03c9]+)|_([A-Za-z0-9]+)|([^A-Za-z\u0391-\u03a9\u03b1-\u03c9_]+|_)/g;
  for (const [, name, subscript, other] of source.matchAll(token)) {
    if (name) fragment.append(name.length === 1 ? element('i', name) : element('span', name, 'fn'));
    else if (subscript) {
      const sub = element('sub');
      for (const part of subscript.match(/[a-z]+|[^a-z]+/g)) sub.append(/^[a-z]+$/.test(part) ? element('i', part) : document.createTextNode(part));
      fragment.append(sub);
    } else fragment.append(document.createTextNode(other));
  }
  return fragment;
}

function equationBlock(source) {
  const node = element('div', undefined, 'equation');
  node.setAttribute('role', 'math');
  node.setAttribute('aria-label', source);
  const visual = element('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.append(typeset(source));
  node.append(visual);
  return node;
}

function renderBlock(block, lab, artifacts) {
  const wrap = element('div', undefined, `block block-${block.type}`);
  if (block.type === 'text') wrap.append(element('p', block.text));
  else if (block.type === 'details') {
    const details = element('details');
    details.append(element('summary', block.title));
    for (const inner of block.blocks) details.append(renderBlock(inner, lab, artifacts));
    wrap.append(details);
  } else if (block.type === 'code') {
    if (block.title) wrap.append(element('h4', block.title));
    wrap.append(element('pre', block.text, 'settings'));
  } else if (block.type === 'table') {
    if (block.title) wrap.append(element('h4', block.title));
    const scroller = element('div', undefined, 'table-wrap');
    scroller.append(evidenceTable(block.headers, block.rows.map(row => row.map(cell => (cell === null ? t('none') : cell)))));
    wrap.append(scroller);
  } else if (block.type === 'bars') {
    wrap.append(element('h4', block.title));
    for (const item of block.items) {
      const row = element('div', undefined, 'bar-row');
      const track = element('div', undefined, 'bar-track');
      const fill = element('div', undefined, 'bar-fill');
      fill.style.width = `${Math.max(0, Math.min(100, (item.value / item.max) * 100))}%`;
      track.append(fill);
      row.append(element('span', item.label), track, element('span', item.detail ?? String(item.value), 'metrics'));
      wrap.append(row);
    }
  } else if (block.type === 'image' || block.type === 'audio') {
    const artifact = artifacts.get(block.artifact);
    const figure = element('figure');
    const media = element(block.type === 'image' ? 'img' : 'audio');
    media.src = mediaUrl(lab, artifact);
    if (block.type === 'image') {
      media.alt = block.alt;
      media.loading = 'lazy';
    } else {
      media.controls = true;
      media.preload = 'none';
      media.setAttribute('aria-label', block.caption);
    }
    const link = element('a', t('Open {file} ({kb} KB)', { file: artifact.file, kb: (artifact.bytes / 1024).toFixed(0) }));
    link.href = media.src;
    figure.append(media, element('figcaption', block.caption), link);
    wrap.append(figure);
  }
  return wrap;
}

function showExperiment(lab, result) {
  const grid = element('div', undefined, 'comparison stack');
  const did = element('section');
  did.append(element('h3', t('What we did')), element('pre', result.request.summary));
  if (result.request.parameters) {
    const details = element('details');
    details.append(element('summary', t('Inspect the settings')), element('pre', JSON.stringify(result.request.parameters, null, 2), 'settings'));
    did.append(details);
  }
  const outcome = element('section');
  const output = element('pre', result.output, 'output');
  output.id = 'output';
  outcome.append(element('h3', t('Measured outcome')), ...(language === 'pl' ? [originalEvidence()] : []), output);
  const tokens = result.usage ? t(' | {count} tokens reported', { count: result.usage.total_tokens }) : '';
  outcome.append(element('p', t('{model} | {ms} ms | {count} Azure API requests{tokens}', { model: result.actualModel, ms: result.latencyMs, count: result.apiRequests, tokens }), 'metrics'));
  const artifacts = new Map(result.artifacts.map(artifact => [artifact.id, artifact]));
  for (const block of result.display) outcome.append(renderBlock(block, lab, artifacts));
  if (result.apiCalls.length) {
    const details = element('details');
    details.append(element('summary', t('Every Azure API call in this variant ({count})', { count: result.apiCalls.length })),
      evidenceTable(['Operation', 'Deployment', 'Model', 'Latency (ms)', 'Attempts', 'Tokens'].map(key => t(key)),
        result.apiCalls.map(call => [call.operation, call.deployment ?? '', call.model ?? '', call.latencyMs, call.attempts ?? 1, call.usage?.total_tokens ?? t('not token-billed')])));
    outcome.append(details);
  } else {
    outcome.append(element('p', t('No Azure model request: computed from earlier results or local code.'), 'metrics'));
  }
  if (Object.keys(result.measurements ?? {}).length) {
    const details = element('details');
    details.append(element('summary', t('Inspect all recorded measurements')), element('pre', JSON.stringify(result.measurements, null, 2), 'settings'));
    outcome.append(details);
  }
  grid.append(did, outcome);
  return grid;
}

function showStep(step, lab) {
  const card = element('section', undefined, 'step');
  card.id = `step-${step.number}`;
  const heading = element('h4', undefined, 'step-title');
  heading.append(element('span', String(step.number), 'step-number'), element('span', step.title));
  if (step.technical) heading.append(element('span', step.technical, 'step-technical'));
  card.append(heading, element('p', step.plain, 'plain'), element('h5', t('The equation')));
  for (const equation of step.equations) card.append(equationBlock(equation));
  if (step.where?.length) {
    const where = element('dl', undefined, 'where');
    for (const [symbol, meaning] of step.where) {
      const term = element('dt');
      term.append(typeset(symbol));
      where.append(term, element('dd', meaning));
    }
    card.append(where);
  }
  card.append(element('h5', t("With this run's numbers")));
  for (const block of step.display) card.append(renderBlock(block, lab, new Map()));
  if (step.notice) card.append(element('p', step.notice, 'notice'));
  return card;
}

function showGlance(walkthrough) {
  const section = element('section', undefined, 'glance');
  section.append(element('h3', t('All {count} steps at a glance', { count: walkthrough.steps.length })));
  const grid = element('table', undefined, 'evidence-table');
  const head = element('tr');
  for (const heading of ['Step', 'In plain words', 'The equation']) {
    const cell = element('th', t(heading));
    cell.scope = 'col';
    head.append(cell);
  }
  const thead = element('thead');
  thead.append(head);
  const tbody = element('tbody');
  for (const step of walkthrough.steps) {
    const row = element('tr');
    const numberCell = element('td');
    const link = element('a', String(step.number));
    link.href = `#step-${step.number}`;
    link.addEventListener('click', event => {
      event.preventDefault();
      document.getElementById(`step-${step.number}`)?.scrollIntoView();
    });
    numberCell.append(link);
    const equationCell = element('td', undefined, 'equation-cell');
    equationCell.append(typeset(step.headline));
    row.append(numberCell, element('td', step.title), equationCell);
    tbody.append(row);
  }
  grid.append(thead, tbody);
  const scroller = element('div', undefined, 'table-wrap');
  scroller.append(grid);
  section.append(scroller);
  return section;
}

function showWalkthrough(lab, result) {
  const walkthrough = result.computationTrace.walkthrough;
  const root = element('div', undefined, 'walkthrough');
  const summary = element('section');
  const output = element('pre', result.output, 'output');
  output.id = 'output';
  summary.append(element('h3', walkthrough.title), ...(language === 'pl' ? [originalEvidence()] : []), output,
    element('p', t('{model} | {ms} ms | No Azure OpenAI API requests. Toy tokens are not API billing tokens.', { model: result.actualModel, ms: result.latencyMs }), 'metrics'));
  const intro = element('div', undefined, 'intro');
  for (const paragraph of walkthrough.intro) intro.append(element('p', paragraph));
  summary.append(intro);
  if (walkthrough.glossary?.length) {
    const glossary = element('details', undefined, 'glossary');
    glossary.open = true;
    glossary.append(element('summary', t('Words you will meet')));
    const list = element('dl');
    for (const [term, meaning] of walkthrough.glossary) list.append(element('dt', term), element('dd', meaning));
    glossary.append(list);
    summary.append(glossary);
  }
  root.append(summary, showGlance(walkthrough));
  for (const part of walkthrough.parts) {
    root.append(element('h3', part.title, 'part-title'));
    for (const number of part.steps) root.append(showStep(walkthrough.steps.find(step => step.number === number), lab));
  }
  if (walkthrough.wrapUp) {
    const card = element('section', undefined, 'step wrap-up');
    card.append(element('h4', walkthrough.wrapUp.title, 'step-title'), element('p', walkthrough.wrapUp.plain, 'plain'));
    for (const block of walkthrough.wrapUp.display) card.append(renderBlock(block, lab, new Map()));
    card.append(element('p', t('Caution: {text}', { text: walkthrough.wrapUp.caution }), 'notice'));
    root.append(element('h3', t('Putting it together'), 'part-title'), card);
  }
  const raw = element('details');
  raw.append(element('summary', t('Inspect every recorded number at full precision')),
    element('pre', JSON.stringify(Object.fromEntries(walkthrough.steps.map(step => [step.id, step.data])), null, 2), 'settings'));
  root.append(raw);
  return root;
}

function showDiscussion(lab) {
  const discussion = element('aside', undefined, 'discussion');
  discussion.append(element('strong', t('Ask the class')), element('p', lab.question),
    element('p', t('Important: {text}', { text: lab.caveat })), element('p', t('Try it: {text}', { text: lab.exercise })));
  main.append(discussion);
  if (lab.observations.length) {
    const checks = element('ul', undefined, 'checks');
    for (const check of lab.observations) checks.append(element('li', `${t(check.passed ? 'PASS / OBSERVED' : 'FAILED')}: ${check.name} - ${check.detail}`));
    if (language === 'pl') {
      const details = element('details');
      details.append(element('summary', t('Original automated checks (English)')), checks);
      main.append(details);
    } else main.append(checks);
  }
  if (lab.firstAttempt) {
    const first = element('details');
    first.append(element('summary', t('First attempt: a real missing-citation failure')));
    first.append(element('pre', lab.firstAttempt.results[1].output));
    first.append(element('p', t('The first instruction requested a citation, but the model omitted it. The failed check stopped the runner. We retained that output, refined the instruction, and ran again.')));
    main.append(first);
  }
  if (lab.recordingAvailable) {
    const recording = element('a', t('Watch this lab recording'));
    recording.href = `./recordings/${lab.id}.mp4`;
    main.append(recording);
  } else {
    main.append(element('p', t('Recording pending: the integrated browser must be visible to capture real behavior.'), 'metrics'));
  }
  main.append(element('p', t('Actual run: {date}. Latency is one observation, not a benchmark.', { date: lab.recordedAt }), 'metrics'));
  if (lab.execution) main.append(element('p', t('Execution: {runtime} | {name}', { runtime: lab.execution.runtime, name: lab.execution.executionName }), 'metrics'));
  history.replaceState(null, '', `#${lab.id}`);
}

function showLab(index, selectedCase = 0) {
  currentIndex = index;
  currentCase = selectedCase;
  const lab = localizeLab(records[index], language);
  main.replaceChildren();
  for (const button of nav.querySelectorAll('button')) {
    button.setAttribute('aria-current', String(Number(button.dataset.index) === index));
  }
  main.append(element('p', t('LAB {number}  |  {index} OF {count}  |  {minutes} MINUTES',
    { number: lab.id.split('-')[0], index: index + 1, count: records.length, minutes: lab.minutes }), 'eyebrow'));
  const heading = element('h2', lab.title);
  heading.id = 'labTitle';
  main.append(heading, element('p', lab.concept, 'concept'));
  if (isBasicLab(lab)) {
    const handouts = element('p', undefined, 'handout-links');
    for (const [locale, label] of [['en', 'English handout'], ['pl', 'Polish handout']]) {
      const link = element('a', t(label));
      link.href = `./handouts/${lab.id}.${locale}.md`;
      link.hreflang = locale;
      link.download = `${lab.id}.${locale}.md`;
      handouts.append(link);
    }
    main.append(handouts);
  }
  if (language === 'pl') {
    main.append(element('p', t(isBasicLab(lab)
      ? 'Teaching text is translated. Recorded prompts, answers, tokens, equations and timings stay unchanged. Polish practice prompts below are not recorded model runs.'
      : 'This advanced lab is available in English; the basic labs 00, 00a and 01–12 have Polish teaching content.'), 'notice'));
  }
  if (lab.diagram) {
    const figure = element('figure', undefined, 'architecture');
    const image = element('img');
    image.src = `./${lab.diagram}`;
    image.alt = t('The diagram shows the implemented transformer architecture and training loop. Tags such as #5-9 match the walkthrough steps. Dictionary entries and IDs do not change with the teaching language.');
    const link = element('a', t('Open the architecture diagram at full size'));
    link.href = image.src;
    figure.append(image, link);
    const vocabulary = lab.results[0]?.computationTrace?.architecture?.vocabulary;
    if (vocabulary) {
      figure.append(element('figcaption', t('Dictionary (IDs start at 0): {entries}. Tags such as #5-9 refer to walkthrough steps.',
        { entries: vocabulary.map((word, id) => `${id} = ${word}`).join(', ') })));
    }
    main.append(figure);
    const guided = lab.results.findIndex(entry => entry.computationTrace?.walkthrough?.kind === 'forward');
    if (guided >= 0 && selectedCase !== guided) {
      const jump = element('button', t('Start here: follow one prediction through every step, with equations and plain words'), 'jump');
      jump.addEventListener('click', () => showLab(index, guided));
      main.append(jump);
    }
  }
  if (lab.modelComparison) {
    showModelComparison(lab, selectedCase, index);
    showDiscussion(lab);
    return;
  }
  const label = element('label', t('Prompt variant'));
  label.htmlFor = 'caseSelect';
  const select = element('select');
  select.id = 'caseSelect';
  lab.results.forEach((result, i) => {
    const option = element('option', result.label);
    option.value = String(i);
    select.append(option);
  });
  select.value = String(selectedCase);
  select.addEventListener('change', () => showLab(index, Number(select.value)));
  main.append(label, select);
  showPractice(lab, selectedCase);
  const result = lab.results[selectedCase];
  if (result.kind === 'experiment') {
    main.append(showExperiment(lab, result));
    showDiscussion(lab);
    return;
  }
  if (result.kind === 'computation' && result.computationTrace?.walkthrough) {
    main.append(showWalkthrough(lab, result));
    showDiscussion(lab);
    return;
  }
  const grid = element('div', undefined, 'comparison');
  const prompt = element('section');
  prompt.append(element('h3', t(result.kind === 'computation' ? 'Experiment' : 'What we sent')),
    ...(language === 'pl' && result.kind !== 'computation' ? [originalEvidence()] : []),
    element('pre', result.kind === 'computation' ? result.label :
      result.request.messages.map(message => `${message.role.toUpperCase()}: ${message.content ?? JSON.stringify(message.tool_calls)}`).join('\n\n')));
  const settings = Object.fromEntries(Object.entries(result.request).filter(([key]) => !['messages', 'model'].includes(key)));
  prompt.append(element('h3', t(result.kind === 'computation' ? 'Teaching model architecture' : 'API parameters')),
    element('pre', JSON.stringify(result.computationTrace?.architecture ?? settings, null, 2), 'settings'));
  const answer = element('section');
  const output = element('pre', result.status === 'blocked'
    ? t('BLOCKED BY AZURE\nHTTP {status}: {code}\n\n{message}\n\nNo model answer was generated. The runner stopped; remaining variants were not executed.',
      { status: result.error.status, code: result.error.code, message: result.error.message })
    : result.output, 'output');
  output.id = 'output';
  answer.append(element('h3', t(result.kind === 'computation' ? 'Measured teaching-model computation' :
    result.outputSource === 'application' ? 'Application-enforced stop (see Azure trace)' : 'What Azure returned')),
  ...(language === 'pl' ? [originalEvidence()] : []), output);
  if (result.kind === 'computation') {
    answer.append(element('p', t('{model} | {ms} ms | No Azure OpenAI API requests. Toy tokens are not API billing tokens.', { model: result.actualModel, ms: result.latencyMs }), 'metrics'));
    showComputation(answer, result.computationTrace);
  } else if (result.status !== 'blocked') {
    answer.append(element('p', t('{model} | {ms} ms | {tokens} tokens | finish: {reason}', { model: result.actualModel, ms: result.latencyMs, tokens: result.usage.total_tokens, reason: result.finishReason }), 'metrics'));
    const reasoningTokens = result.usage.completion_tokens_details?.reasoning_tokens;
    answer.append(element('p', t('Input: {input} | Output: {output}{reasoning}', {
      input: result.usage.prompt_tokens, output: result.usage.completion_tokens,
      reasoning: reasoningTokens !== undefined ? t(' (including {count} reasoning tokens)', { count: reasoningTokens }) : '',
    }), 'metrics'));
  }
  if (result.toolTrace) answer.append(element('pre', JSON.stringify(result.toolTrace, null, 2), 'settings'), element('p', t('Tool request: {count} additional tokens', { count: result.toolRequestUsage.total_tokens }), 'metrics'));
  if (result.extraRequests?.length) {
    const total = result.usage.total_tokens + result.extraRequests.reduce((sum, entry) => sum + entry.usage.total_tokens, 0);
    answer.append(element('p', t('All requests for this variant: {count} | {tokens} tokens (chat and embedding usage are billed at different rates)', { count: result.extraRequests.length + 1, tokens: total }), 'metrics'));
    answer.append(element('pre', JSON.stringify(result.extraRequests, null, 2), 'settings'));
  }
  for (const [key, title] of [['memoryTrace', 'Application memory snapshot'], ['summaryTrace', 'Generated summary used as context'],
    ['toolSteps', 'Ordered tool execution'], ['retrievalTrace', 'Semantic memory ranking'], ['agentTrace', 'Agent actions, observations, state, limits, and rubric']]) {
    if (result[key]) {
      answer.append(element('h3', title), element('pre', JSON.stringify(result[key], null, 2), 'settings'));
    }
  }
  if (result.finalMessages) {
    const transcript = element('details');
    transcript.append(element('summary', 'Inspect the actual tool-call conversation'),
      element('pre', JSON.stringify(result.finalMessages, null, 2)));
    answer.append(transcript);
  }
  grid.append(prompt, answer);
  main.append(grid);
  showDiscussion(lab);
}

fetch('./results.json').then(response => {
  if (!response.ok) throw new Error(`Result download failed: HTTP ${response.status}`);
  return response.json();
}).then(data => {
  records = data;
  const index = records.findIndex(lab => `#${lab.id}` === location.hash);
  currentIndex = index >= 0 ? index : 0;
  showLanguage();
}).catch(error => {
  console.error(error);
  main.replaceChildren(element('p', t('Unable to load gallery: {message}', { message: error.message }), 'error'));
});
