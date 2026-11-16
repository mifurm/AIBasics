export function evaluate(labId, results) {
  const check = (name, passed, detail) => ({ name, passed, detail });
  const text = index => results[index].output;
  const observations = [];
  if (labId === '03-few-shot') observations.push(check('Few-shot label', text(1).trim() === 'SUN', text(1)));
  if (labId === '04-temperature' || labId === '05-top-p') {
    for (let i = 0; i < 6; i += 3) observations.push(check(
      `Unique outputs in ${results[i].label.split(',')[0]}`, true,
      `${new Set(results.slice(i, i + 3).map(result => result.output.trim())).size} / 3. Observation only; no diversity threshold.`,
    ));
  }
  if (labId === '06-token-budget') {
    observations.push(check('Low cap is respected', results[0].usage.completion_tokens <= 24, `${results[0].usage.completion_tokens} <= 24`));
    observations.push(check('Low cap demonstrates truncation', results[0].finishReason === 'length', results[0].finishReason));
    observations.push(check('Higher cap is respected', results[1].usage.completion_tokens <= 280, `${results[1].usage.completion_tokens} <= 280`));
  }
  if (labId === '07-context') {
    observations.push(check('Sent history is used', /Pebble/i.test(text(0)), text(0)));
    observations.push(check('Missing history is acknowledged', /do not know|don't know|not know|haven.t|not.*(told|provided)|no.*information/i.test(text(1)), text(1)));
  }
  if (labId === '08-structured-output') {
    const value = JSON.parse(text(0));
    observations.push(check('Exact schema and extracted values', value !== null && !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === 'item,quantity' && value.item === 'notebooks' && value.quantity === 3, JSON.stringify(value)));
  }
  if (labId === '09-grounding') {
    observations.push(check('Supported fact and citation', /Tuesday/i.test(text(1)) && /16:00/.test(text(1)) && /\[club-1\]/.test(text(1)), text(1)));
    observations.push(check('Missing founder is acknowledged', /not in the source/i.test(text(1)), text(1)));
  }
  if (labId === '10-untrusted-context') observations.push(check('Defensive instruction followed in this run', text(1).trim() === 'Room 7', text(1)));
  if (labId === '11-tools') {
    observations.push(check('Allowlisted code calculated 391', results[0].toolTrace?.total === 391, JSON.stringify(results[0].toolTrace)));
    observations.push(check('Final answer uses tool result', /\b391\b/.test(text(0)), text(0)));
  }
  if (labId === '13-persistent-memory') {
    observations.push(check('File alone does not give model memory', text(0).trim() === 'UNKNOWN', text(0)));
    observations.push(check('Fresh process loads the saved mascot', text(1).trim() === 'Otter' &&
      results[1].memoryTrace.memory.mascot === 'Otter' &&
      results[0].memoryTrace.processId !== results[1].memoryTrace.processId, JSON.stringify(results[1].memoryTrace)));
  }
  if (labId === '14-memory-lifecycle') {
    observations.push(check('Remembered and replaced values', text(0).trim() === 'Otter' && text(1).trim() === 'Falcon', `${text(0)} -> ${text(1)}`));
    observations.push(check('Forgotten value absent from store and fresh request', text(2).trim() === 'UNKNOWN' &&
      Object.keys(results[2].memoryTrace.memory).length === 0 &&
      !JSON.stringify(results[2].request.messages).includes('Falcon') &&
      !JSON.stringify(results[2].request.messages).includes('Otter'), JSON.stringify(results[2].memoryTrace)));
  }
  if (labId === '15-multiturn') {
    results.forEach((result, index) => {
      const plan = JSON.parse(result.output);
      observations.push(check(`Turn ${index + 1} preserves the correct plan`, plan.project === 'robot' &&
        plan.material === 'cardboard' && plan.color === (index === 0 ? 'blue' : 'red'), result.output));
      if (index > 0) observations.push(check(`Turn ${index + 1} uses actual previous reply`,
        result.request.messages.some(message => message.role === 'assistant' && message.content === results[index - 1].output),
        'Generated assistant reply included, not handwritten.'));
    });
  }
  if (labId === '16-summary-memory') {
    observations.push(check('No-summary request admits missing facts', text(1).trim() === 'UNKNOWN', text(1)));
    observations.push(check('Summary and recalled answer preserve decisions', [text(0), text(2)].every(value =>
      /Comet/.test(value) && /\b42\b/.test(value) && /Friday/.test(value)), `${text(0)} / ${text(2)}`));
    observations.push(check('Summary-fed request uses fewer input tokens', results[2].usage.prompt_tokens < results[0].usage.prompt_tokens,
      `${results[0].usage.prompt_tokens} -> ${results[2].usage.prompt_tokens} input tokens; includes differing instructions, not a universal savings ratio.`));
  }
  if (labId === '17-tool-chain') {
    const steps = results[0].toolSteps;
    observations.push(check('Lookup before calculation, using returned price', steps?.length === 2 &&
      steps[0].name === 'lookup_price' && steps[0].result.unitPrice === 23 &&
      steps[1].name === 'multiply' && steps[1].result.arguments.unitPrice === 23 &&
      steps[1].result.arguments.quantity === 4 && steps[1].result.total === 92, JSON.stringify(steps)));
    observations.push(check('Final answer uses calculated total', /\b92\b/.test(text(0)), text(0)));
  }
  if (labId === '18-semantic-memory') {
    observations.push(check('No retrieval means no classroom fact', text(0).trim() === 'UNKNOWN', text(0)));
    observations.push(check('Meaning retrieves watering card', results[1].retrievalTrace.selectedId === 'watering', JSON.stringify(results[1].retrievalTrace.ranking)));
    observations.push(check('Answer uses retrieved fact and citation', /Monday/i.test(text(1)) && /\[watering\]/.test(text(1)), text(1)));
  }
  return observations;
}
