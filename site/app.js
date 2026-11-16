const nav = document.getElementById('labNav');
const main = document.getElementById('main');
let records;

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
    answer.append(element('h3', 'Measured training loss (lower is better)'),
      evidenceTable(['Update', 'Mean cross-entropy'], trace.training.curve.map(point => [point.step, point.loss.toFixed(5)])));
    const probes = [{ ...trace.beforeTraining, prefix: 'Before training: robot' }, ...trace.probes];
    answer.append(element('h3', 'Actual next-token predictions'),
      evidenceTable(['Context', 'Next token', 'Probability'], probes.flatMap(probe =>
        probe.distribution.slice(0, 3).map(entry => [probe.prefix, entry.token, `${(100 * entry.probability).toFixed(3)}%`]))));
  }
  if (trace.original) {
    answer.append(element('h3', 'Causal attention: each row reads only itself and earlier columns'),
      evidenceTable(['Reads from ->', ...trace.original.tokens], trace.original.attention.map((row, i) =>
        [trace.original.tokens[i], ...row.map((value, j) => j > i ? 'blocked' : value.toFixed(3))])));
  }
  if (trace.generation) {
    answer.append(element('h3', 'One token at a time'),
      evidenceTable(['Context supplied', 'Token appended', 'Probability'], trace.generation.steps.map(step =>
        [step.prefix, step.nextToken, `${(100 * step.distribution[0].probability).toFixed(3)}%`])));
  }
  const details = element('details');
  details.append(element('summary', 'Inspect measured vectors, attention, logits, and experiment evidence'),
    element('pre', JSON.stringify(trace, null, 2), 'settings'));
  answer.append(details);
}

function showModelComparison(lab, selectedPair, index) {
  const pairs = lab.results.filter((_, resultIndex) => resultIndex % 2 === 0)
    .map((_, pairIndex) => lab.results.slice(pairIndex * 2, pairIndex * 2 + 2));
  const label = element('label', 'Prompt variant');
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
  shared.append(element('h3', 'Identical prompt sent to both models'),
    element('pre', pair[0].request.messages.map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n')),
    element('p', 'Only the model and its supported configuration change within this pair. Prompt wording changes only when you select broad versus specific.', 'metrics'));
  main.append(shared);
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
      element('p', `${result.actualModel} | ${result.latencyMs} ms | finish: ${result.finishReason}`, 'metrics'),
      evidenceTable(['Measured quantity', 'This response'], [
        ['Input tokens', usage.prompt_tokens],
        ['Completion tokens (including reasoning)', usage.completion_tokens],
        ['Reasoning tokens', reasoning ?? 'Not reported'],
        ['Total tokens', usage.total_tokens],
        ['Visible words (whitespace-separated)', words],
      ]));
    const settingsDetails = element('details');
    settingsDetails.append(element('summary', 'Inspect model-specific API settings'), element('pre', JSON.stringify(settings, null, 2), 'settings'));
    card.append(settingsDetails, element('h3', 'Match to the specific-prompt targets'));
    const checks = element('ul', undefined, 'checks');
    for (const check of result.comparison.targetChecks) {
      checks.append(element('li', `${check.passed ? 'MATCHED' : 'NOT MATCHED'}: ${check.name} - ${check.detail}`));
    }
    card.append(checks);
    grid.append(card);
  }
  main.append(grid);
  const comparison = element('aside', undefined, 'discussion');
  comparison.append(element('strong', 'What this pair actually shows'),
    element('p', pair[0].output.trim() === pair[1].output.trim() ?
      'These two recorded outputs are identical. Agreement is a valid observation, not a failed experiment.' :
      'These two recorded outputs differ. Compare their meaning and instruction following, not just their wording.'),
    element('p', 'The target checks describe the specific prompt. The broad prompt did not request every target; a target mismatch alone is not proof of a wrong answer or a weaker model.'),
    element('p', `Manual review: ${pair[0].comparison.manualRubric}`),
    element('p', 'Latency and tokens describe one run, not a benchmark or dollar cost. Both models may be correct; supported settings and output budgets differ. No hidden chain-of-thought is displayed.'));
  main.append(comparison);
}

function showDiscussion(lab) {
  const discussion = element('aside', undefined, 'discussion');
  discussion.append(element('strong', 'Ask the class'), element('p', lab.question), element('p', `Important: ${lab.caveat}`), element('p', `Try it: ${lab.exercise}`));
  main.append(discussion);
  if (lab.observations.length) {
    const checks = element('ul', undefined, 'checks');
    for (const check of lab.observations) checks.append(element('li', `${check.passed ? 'PASS / OBSERVED' : 'FAILED'}: ${check.name} - ${check.detail}`));
    main.append(checks);
  }
  if (lab.firstAttempt) {
    const first = element('details');
    first.append(element('summary', 'First attempt: a real missing-citation failure'));
    first.append(element('pre', lab.firstAttempt.results[1].output));
    first.append(element('p', 'The first instruction requested a citation, but the model omitted it. The failed check stopped the runner. We retained that output, refined the instruction, and ran again.'));
    main.append(first);
  }
  if (lab.recordingAvailable) {
    const recording = element('a', 'Watch this lab recording');
    recording.href = `./recordings/${lab.id}.mp4`;
    main.append(recording);
  } else {
    main.append(element('p', 'Recording pending: the integrated browser must be visible to capture real behavior.', 'metrics'));
  }
  main.append(element('p', `Actual run: ${lab.recordedAt}. Latency is one observation, not a benchmark.`, 'metrics'));
  if (lab.execution) main.append(element('p', `Execution: ${lab.execution.runtime} | ${lab.execution.executionName}`, 'metrics'));
  history.replaceState(null, '', `#${lab.id}`);
}

function showLab(index, selectedCase = 0) {
  const lab = records[index];
  main.replaceChildren();
  for (const button of nav.querySelectorAll('button')) {
    button.setAttribute('aria-current', String(Number(button.dataset.index) === index));
  }
  main.append(element('p', `LAB ${lab.id.slice(0, 2)}  |  ${index + 1} OF ${records.length}  |  ${lab.minutes} MINUTES`, 'eyebrow'));
  const heading = element('h2', lab.title);
  heading.id = 'labTitle';
  main.append(heading, element('p', lab.concept, 'concept'));
  if (lab.diagram) {
    const figure = element('figure', undefined, 'architecture');
    const image = element('img');
    image.src = `./${lab.diagram}`;
    image.alt = 'Tiny decoder-only transformer: token and position embeddings, one causal attention and feed-forward block with two residual paths, then next-token probabilities and a generation loop. A separate training loop updates weights.';
    const link = element('a', 'Open the architecture diagram at full size');
    link.href = image.src;
    figure.append(image, link);
    main.append(figure);
  }
  if (lab.modelComparison) {
    showModelComparison(lab, selectedCase, index);
    showDiscussion(lab);
    return;
  }
  const label = element('label', 'Prompt variant');
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
  const result = lab.results[selectedCase];
  const grid = element('div', undefined, 'comparison');
  const prompt = element('section');
  prompt.append(element('h3', result.kind === 'computation' ? 'Experiment' : 'What we sent'),
    element('pre', result.kind === 'computation' ? result.label :
      result.request.messages.map(message => `${message.role.toUpperCase()}: ${message.content ?? JSON.stringify(message.tool_calls)}`).join('\n\n')));
  const settings = Object.fromEntries(Object.entries(result.request).filter(([key]) => !['messages', 'model'].includes(key)));
  prompt.append(element('h3', result.kind === 'computation' ? 'Teaching model architecture' : 'API parameters'),
    element('pre', JSON.stringify(result.computationTrace?.architecture ?? settings, null, 2), 'settings'));
  const answer = element('section');
  const output = element('pre', result.status === 'blocked'
    ? `BLOCKED BY AZURE\nHTTP ${result.error.status}: ${result.error.code}\n\n${result.error.message}\n\nNo model answer was generated. The runner stopped; remaining variants were not executed.`
    : result.output, 'output');
  output.id = 'output';
  answer.append(element('h3', result.kind === 'computation' ? 'Measured teaching-model computation' :
    result.outputSource === 'application' ? 'Application-enforced stop (see Azure trace)' : 'What Azure returned'), output);
  if (result.kind === 'computation') {
    answer.append(element('p', `${result.actualModel} | ${result.latencyMs} ms | No Azure OpenAI API requests. Toy tokens are not API billing tokens.`, 'metrics'));
    showComputation(answer, result.computationTrace);
  } else if (result.status !== 'blocked') {
    answer.append(element('p', `${result.actualModel} | ${result.latencyMs} ms | ${result.usage.total_tokens} tokens | finish: ${result.finishReason}`, 'metrics'));
    const reasoningTokens = result.usage.completion_tokens_details?.reasoning_tokens;
    answer.append(element('p', `Input: ${result.usage.prompt_tokens} | Output: ${result.usage.completion_tokens}${reasoningTokens !== undefined ? ` (including ${reasoningTokens} reasoning tokens)` : ''}`, 'metrics'));
  }
  if (result.toolTrace) answer.append(element('pre', JSON.stringify(result.toolTrace, null, 2), 'settings'), element('p', `Tool request: ${result.toolRequestUsage.total_tokens} additional tokens`, 'metrics'));
  if (result.extraRequests?.length) {
    const total = result.usage.total_tokens + result.extraRequests.reduce((sum, entry) => sum + entry.usage.total_tokens, 0);
    answer.append(element('p', `All requests for this variant: ${result.extraRequests.length + 1} | ${total} tokens (chat and embedding usage are billed at different rates)`, 'metrics'));
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
  document.title = `AI Basics | ${records.length} classroom labs`;
  document.querySelector('header p').textContent = `${records.length} small experiments. Real Azure model outputs. No magic.`;
  records.forEach((lab, i) => {
    const button = element('button', `${lab.id.slice(0, 2)} ${lab.title}`);
    button.dataset.index = String(i);
    button.addEventListener('click', () => showLab(i));
    nav.append(button);
  });
  const index = records.findIndex(lab => `#${lab.id}` === location.hash);
  showLab(index >= 0 ? index : 0);
}).catch(error => {
  main.replaceChildren(element('p', `Unable to load gallery: ${error.message}`, 'error'));
});
