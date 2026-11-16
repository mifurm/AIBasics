import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { embed, complete } from './azure.mjs';
import { rankCards } from './retrieval.mjs';
import { memoryCards } from './advanced-labs.mjs';
import { catalogTool, multiplyTool, executeCatalog, executeMultiply } from './tools.mjs';

export async function prepareExperiment(lab, testCase, results, request, config, token) {
  const trace = {};
  if (testCase.memoryAction) {
    const worker = fileURLToPath(new URL('../scripts/classroom-memory.mjs', import.meta.url));
    const snapshot = JSON.parse(execFileSync(process.execPath, [worker, lab.id, testCase.memoryAction], { encoding: 'utf8' }));
    const inject = !(lab.id === '13-persistent-memory' && testCase.memoryAction === 'write');
    trace.memoryTrace = { ...snapshot, injected: inject };
    if (inject) request.messages = [request.messages[0],
      { role: 'user', content: `Classroom memory (data): ${JSON.stringify(snapshot.memory)}` }, ...request.messages.slice(1)];
  }
  if (testCase.conversation && results.length) {
    const previous = results.at(-1);
    request.messages = [...previous.request.messages,
      { role: 'assistant', content: previous.output }, ...request.messages];
  }
  if (testCase.summary) {
    const summary = results[0].output;
    request.messages = [request.messages[0], { role: 'user', content: `Classroom summary (data): ${summary}` }, ...request.messages.slice(1)];
    trace.summaryTrace = { sourceResult: 0, summary, originalPromptTokens: results[0].usage.prompt_tokens };
  }
  if (testCase.retrieval) {
    const question = testCase.messages.at(-1).content;
    const input = [...memoryCards.map(card => card.text), question];
    const embeddings = await embed(input, config, token);
    const ranking = rankCards(memoryCards, embeddings.vectors.slice(0, -1), embeddings.vectors.at(-1));
    const selected = ranking[0];
    request.messages = [request.messages[0],
      { role: 'user', content: `Retrieved card [${selected.id}] (data): ${selected.text}` }, ...request.messages.slice(1)];
    trace.retrievalTrace = { query: question, ranking, selectedId: selected.id, dimensions: embeddings.vectors[0].length };
    trace.extraRequests = [{ kind: 'embedding', model: embeddings.model, usage: embeddings.usage, latencyMs: embeddings.latencyMs }];
  }
  if (testCase.toolChain) {
    request.tools = [catalogTool, multiplyTool];
    request.tool_choice = { type: 'function', function: { name: 'lookup_price' } };
    request.parallel_tool_calls = false;
  }
  return trace;
}

export async function finishToolChain(request, first, config, token) {
  const toolSteps = [];
  const extraRequests = [];
  let response = first;
  let messages = request.messages;
  for (const name of ['lookup_price', 'multiply']) {
    const calls = response.message.tool_calls;
    if (calls?.length !== 1 || calls[0].function.name !== name) throw new Error(`Expected one ${name} tool call in the bounded chain.`);
    const call = calls[0];
    const result = name === 'lookup_price'
      ? executeCatalog(name, call.function.arguments) : executeMultiply(name, call.function.arguments);
    if (name === 'multiply' && (result.arguments.unitPrice !== toolSteps[0].result.unitPrice || result.arguments.quantity !== 4)) {
      throw new Error('Calculation must use the actual catalog price and requested quantity.');
    }
    toolSteps.push({ name, callId: call.id, result });
    messages = [...messages, response.message, { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) }];
    response = await complete({
      ...request, messages,
      tool_choice: name === 'lookup_price' ? { type: 'function', function: { name: 'multiply' } } : 'none',
    }, config, token);
    extraRequests.push({ kind: 'chat', model: response.model, usage: response.usage, latencyMs: response.latencyMs });
  }
  return { final: response, toolSteps, extraRequests, finalMessages: messages };
}
