export const comparisonTasks = [
  {
    id: 'explanation', title: 'Explain a concept',
    manualRubric: 'Is the explanation accurate, understandable to a 10-year-old, and free of misleading claims? Mentioning keywords alone does not establish accuracy.',
    prompts: {
      broad: 'Explain how a language model produces text. Keep the answer under 100 words.',
      specific: 'Explain how a language model produces text to a 10-year-old. Use exactly two bullet lines, each starting with "- ", and at most 45 words total. Mention tokens and context. Do not claim that it looks up a complete stored answer.',
    },
  },
  {
    id: 'extraction', title: 'Turn a note into data',
    manualRubric: 'Does the answer preserve the item and quantity? A prose answer can be correct even though it does not meet the refined JSON target.',
    prompts: {
      broad: 'Read this classroom note and tell me what to bring: "Please bring 3 notebooks to class."',
      specific: 'Extract the item and quantity from this classroom note: "Please bring 3 notebooks to class." Return only a JSON object with exactly two fields: item (the lowercase plural item name) and quantity (an integer). Do not use Markdown fences, commentary, or extra fields.',
    },
  },
  {
    id: 'constraints', title: 'Follow scheduling constraints',
    manualRubric: 'Check the meaning, not only the format: each demo appears once; plant is immediately before robot; art is not first. The unique solution is plant, robot, art.',
    prompts: {
      broad: 'Schedule a robot demo, plant demo, and art demo in slots 1, 2, 3. Robot must immediately follow plant. Art must not be first. What is the schedule?',
      specific: 'Schedule a robot demo, plant demo, and art demo in slots 1, 2, 3. Robot must immediately follow plant. Art must not be first. Return exactly three lines in slot order, formatted "1: name", "2: name", "3: name". Use only the lowercase demo name (robot, plant, or art); no heading or explanation.',
    },
  },
];

const models = [
  { key: 'standard', label: 'GPT-4o', parameters: { temperature: 0, max_tokens: 320 } },
  { key: 'reasoning', label: 'GPT-5-mini', parameters: { reasoning_effort: 'low', max_completion_tokens: 1400 } },
];

export const modelComparisonLab = {
  id: '12-models', title: 'Same prompts, different models', minutes: 12, modelComparison: true,
  concept: 'The same prompt can produce different wording, formatting, latency, and token use across models. Compare broad and specific prompts without assuming a winner.',
  question: 'What changes when only the model changes? What changes when the prompt becomes more specific?',
  caveat: 'These are single observations, not a benchmark. Both models may be correct or identical. Supported settings differ; reasoning tokens are billed work, not visible explanations.',
  exercise: 'Compare each broad prompt with its specific version, then repeat with another familiar topic. Inspect both outputs and the manual rubric, not just automatic format checks.',
  cases: comparisonTasks.flatMap(task => Object.entries(task.prompts).flatMap(([style, prompt]) => models.map(model => ({
    label: `${task.title} / ${style} / ${model.label}`,
    model: model.key, messages: [{ role: 'user', content: prompt }], parameters: model.parameters,
    comparison: { taskId: task.id, taskTitle: task.title, promptStyle: style, modelLabel: model.label, manualRubric: task.manualRubric },
  })))),
};

export function assessComparisonOutput(taskId, output) {
  const check = (name, passed, detail) => ({ name, passed, detail });
  if (taskId === 'explanation') {
    const words = output.trim().split(/\s+/).length;
    const lines = output.trim().split(/\r?\n/).filter(line => line.trim());
    return [
      check('Exactly two bullet lines', lines.length === 2 && lines.every(line => /^- /.test(line)), `${lines.length} non-empty lines.`),
      check('At most 45 whitespace-separated words', words <= 45, `${words} words.`),
      check('Mentions tokens and context', /\btokens?\b/i.test(output) && /\bcontext\b/i.test(output), 'Keyword check only, not a factual-accuracy judgment.'),
    ];
  }
  if (taskId === 'extraction') {
    let value;
    try { value = JSON.parse(output); } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return [check('Exact JSON target and extracted values', false, 'Not a standalone JSON object. Prose or Markdown may still convey the correct meaning.')];
    }
    return [check('Exact JSON target and extracted values', value !== null && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === 'item,quantity' && value.item === 'notebooks' && value.quantity === 3,
    JSON.stringify(value))];
  }
  if (taskId === 'constraints') {
    const lines = output.trim().split(/\r?\n/);
    return [check('Exact three-line target and valid schedule', lines.length === 3 &&
      lines.every((line, index) => line === `${index + 1}: ${['plant', 'robot', 'art'][index]}`),
    'Target is exactly: 1: plant / 2: robot / 3: art. Other formats require manual semantic review.')];
  }
  throw new Error(`Unknown comparison task: ${taskId}`);
}

export function evaluateModelComparison(results) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  check('All twelve planned Azure responses are preserved', results.length === modelComparisonLab.cases.length,
    `${results.length} / ${modelComparisonLab.cases.length} responses.`);
  for (let index = 0; index < modelComparisonLab.cases.length; index += 2) {
    const expected = modelComparisonLab.cases[index].comparison;
    const pair = results.slice(index, index + 2);
    const [left, right] = pair;
    const label = `${expected.taskTitle} / ${expected.promptStyle}`;
    check(`${label}: identical messages, distinct model deployments`, pair.length === 2 &&
      JSON.stringify(left.request.messages) === JSON.stringify(right.request.messages) &&
      left.request.model !== right.request.model &&
      typeof left.actualModel === 'string' && left.actualModel !== right.actualModel &&
      JSON.stringify(left.request.messages) === JSON.stringify(modelComparisonLab.cases[index].messages),
    'The model-specific settings are deliberately recorded separately from the identical prompt.');
    check(`${label}: complete observable evidence`, pair.length === 2 && pair.every((result, offset) =>
      result.comparison?.taskId === expected.taskId && result.comparison.promptStyle === expected.promptStyle &&
      result.comparison.modelLabel === models[offset].label &&
      typeof result.output === 'string' && result.output.trim() &&
      result.finishReason === 'stop' && Number.isInteger(result.latencyMs) && result.latencyMs >= 0 &&
      Number.isInteger(result.usage?.total_tokens) && Array.isArray(result.comparison.targetChecks) &&
      JSON.stringify(result.comparison.targetChecks) === JSON.stringify(assessComparisonOutput(expected.taskId, result.output))),
    'Model-quality failures remain visible in target checks; they do not erase or invalidate an otherwise complete experiment.');
  }
  return checks;
}
