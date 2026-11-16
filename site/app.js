const nav = document.getElementById('labNav');
const main = document.getElementById('main');
let records;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function showLab(index, selectedCase = 0) {
  const lab = records[index];
  main.replaceChildren();
  for (const button of nav.querySelectorAll('button')) {
    button.setAttribute('aria-current', String(Number(button.dataset.index) === index));
  }
  main.append(element('p', `LAB ${String(index + 1).padStart(2, '0')} / ${records.length}  |  ${lab.minutes} MINUTES`, 'eyebrow'));
  const heading = element('h2', lab.title);
  heading.id = 'labTitle';
  main.append(heading, element('p', lab.concept, 'concept'));
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
  prompt.append(element('h3', 'What we sent'), element('pre', result.request.messages.map(message => `${message.role.toUpperCase()}: ${message.content ?? JSON.stringify(message.tool_calls)}`).join('\n\n')));
  const settings = Object.fromEntries(Object.entries(result.request).filter(([key]) => !['messages', 'model'].includes(key)));
  prompt.append(element('h3', 'API parameters'), element('pre', JSON.stringify(settings, null, 2), 'settings'));
  const answer = element('section');
  const output = element('pre', result.status === 'blocked'
    ? `BLOCKED BY AZURE\nHTTP ${result.error.status}: ${result.error.code}\n\n${result.error.message}\n\nNo model answer was generated. The runner stopped; remaining variants were not executed.`
    : result.output, 'output');
  output.id = 'output';
  answer.append(element('h3', 'What Azure returned'), output);
  if (result.status !== 'blocked') {
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
    ['toolSteps', 'Ordered tool execution'], ['retrievalTrace', 'Semantic memory ranking']]) {
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
  history.replaceState(null, '', `#${lab.id}`);
}

fetch('./results.json').then(response => {
  if (!response.ok) throw new Error(`Result download failed: HTTP ${response.status}`);
  return response.json();
}).then(data => {
  records = data;
  document.title = `AI Basics | ${records.length} classroom labs`;
  document.querySelector('header p').textContent = `${records.length} small experiments. Real Azure model outputs. No magic.`;
  records.forEach((lab, i) => {
    const button = element('button', `${String(i + 1).padStart(2, '0')} ${lab.title}`);
    button.dataset.index = String(i);
    button.addEventListener('click', () => showLab(i));
    nav.append(button);
  });
  const index = records.findIndex(lab => `#${lab.id}` === location.hash);
  showLab(index >= 0 ? index : 0);
}).catch(error => {
  main.replaceChildren(element('p', `Unable to load gallery: ${error.message}`, 'error'));
});
