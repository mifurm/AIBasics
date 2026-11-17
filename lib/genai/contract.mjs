export const text = value => ({ type: 'text', text: value });
export const table = (title, headers, rows) => ({ type: 'table', title, headers, rows });
export const image = (artifact, caption, alt) => ({ type: 'image', artifact: artifact.id, caption, alt: alt ?? caption });
export const audio = (artifact, caption) => ({ type: 'audio', artifact: artifact.id, caption });
export const bars = (title, items) => ({ type: 'bars', title, items });
export const code = (title, value) => ({ type: 'code', title, text: value });

export function sumUsage(calls) {
  let input = 0;
  let output = 0;
  let total = 0;
  let counted = 0;
  for (const call of calls) {
    const usage = call.usage;
    if (!usage) continue;
    const i = usage.prompt_tokens ?? usage.input_tokens ?? 0;
    const o = usage.completion_tokens ?? usage.output_tokens ?? 0;
    input += i;
    output += o;
    total += usage.total_tokens ?? i + o;
    counted++;
  }
  return counted ? { input_tokens: input, output_tokens: output, total_tokens: total } : null;
}

export function experimentResult({ label, summary, parameters, output, calls = [], artifacts = [], display = [], measurements = {}, startedAt }) {
  return {
    label, kind: 'experiment', request: { summary, ...(parameters ? { parameters } : {}) }, output,
    outputSource: calls.length ? 'azure-and-computation' : 'computation',
    actualModel: [...new Set(calls.map(call => call.model).filter(Boolean))].join(' + ') || 'local-computation',
    finishReason: 'completed', latencyMs: Math.round(performance.now() - startedAt),
    usage: sumUsage(calls), apiRequests: calls.length, apiCalls: calls, artifacts, display, measurements,
  };
}

const primitive = value => value === null || ['string', 'number', 'boolean'].includes(typeof value);

export function assertExperimentResult(result, store) {
  const fail = message => { throw new Error(`Invalid experiment result "${result?.label}": ${message}`); };
  if (result?.kind !== 'experiment' || typeof result.label !== 'string' || !result.label.trim()) fail('missing experiment label or kind');
  if (typeof result.output !== 'string' || !result.output.trim() || result.output.length > 8000) fail('output must be a non-empty summary of at most 8000 characters');
  if (typeof result.request?.summary !== 'string' || !result.request.summary.trim()) fail('missing request summary');
  if (!Array.isArray(result.apiCalls) || result.apiCalls.some(call => !call.operation || !Number.isInteger(call.latencyMs) || call.latencyMs < 0)) fail('every API call needs an operation and integer latency');
  if (result.apiRequests !== result.apiCalls.length) fail('apiRequests must equal the number of recorded calls');
  const referenced = new Map();
  for (const reference of result.artifacts ?? []) {
    if (!store.has(reference.id)) fail(`artifact ${reference.id} is not in the store`);
    if (store.entries().find(entry => entry.ref.id === reference.id).ref.sha256 !== reference.sha256) fail(`artifact ${reference.id} hash mismatch`);
    referenced.set(reference.id, reference);
  }
  for (const block of result.display ?? []) {
    if (block.type === 'text' || block.type === 'code') {
      if (typeof block.text !== 'string' || block.text.length > 6000) fail(`${block.type} block needs text up to 6000 characters`);
    } else if (block.type === 'table') {
      if (!Array.isArray(block.headers) || !Array.isArray(block.rows) || block.rows.length > 200 ||
        block.rows.some(row => !Array.isArray(row) || row.length !== block.headers.length || !row.every(primitive))) fail('table rows must match headers and contain only primitive values');
    } else if (block.type === 'bars') {
      if (!Array.isArray(block.items) || block.items.some(item => typeof item.label !== 'string' || !Number.isFinite(item.value) || !Number.isFinite(item.max) || item.max <= 0)) fail('bars need labels, finite values, and positive maxima');
    } else if (block.type === 'image' || block.type === 'audio') {
      const reference = referenced.get(block.artifact);
      if (!reference) fail(`${block.type} block references unknown artifact ${block.artifact}`);
      if (!reference.mime.startsWith(`${block.type}/`)) fail(`${block.type} block references ${reference.mime}`);
    } else fail(`unknown display block "${block.type}"`);
  }
  return result;
}
