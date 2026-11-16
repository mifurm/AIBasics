import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { labs, getLab } from '../lib/labs.mjs';
import { loadConfig, accessToken, buildRequest, complete, AzureRequestError } from '../lib/azure.mjs';
import { multiplyTool, executeMultiply } from '../lib/tools.mjs';
import { evaluate } from '../lib/evaluate.mjs';
import { prepareExperiment, finishToolChain } from '../lib/experiments.mjs';
import { runAgent } from '../lib/agent.mjs';

export async function runLab(id, session) {
  const lab = getLab(id);
  const config = session?.config ?? await loadConfig();
  const token = session?.token ?? await accessToken(config.subscriptionId);
  const results = [];
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  for (const testCase of lab.cases) {
    if (testCase.agent) {
      console.log(`${lab.id}: ${testCase.label}`);
      try {
        const result = await runAgent(testCase, config, token, testCase.continueAgent ? results.at(-1) : undefined);
        results.push(result);
        console.log(`${result.output}\n  ${result.agentTrace.stopReason} | ${result.agentTrace.requestCount} requests\n`);
      } catch (error) {
        await writeFile(new URL(`../results/${id}.json`, import.meta.url), JSON.stringify({
          labId: id, recordedAt: new Date().toISOString(), status: 'failed', results,
          observations: [], error: error.message,
        }, null, 2) + '\n');
        throw error;
      }
      continue;
    }
    const request = buildRequest(testCase, config);
    const experimentTrace = await prepareExperiment(lab, testCase, results, request, config, token);
    if (testCase.tool) {
      request.tools = [multiplyTool];
      request.tool_choice = { type: 'function', function: { name: 'multiply' } };
      request.parallel_tool_calls = false;
    }
    console.log(`${lab.id}: ${testCase.label}`);
    let first;
    try {
      first = await complete(request, config, token);
    } catch (error) {
      if (!(error instanceof AzureRequestError) || error.azureCode !== 'content_filter') throw error;
      const blocked = {
        label: testCase.label, request, status: 'blocked', output: null,
        error: { status: error.status, code: error.azureCode, message: error.message },
      };
      await writeFile(new URL(`../results/${id}.json`, import.meta.url), JSON.stringify({
        labId: id, recordedAt: new Date().toISOString(), status: 'blocked',
        results: [...results, blocked], observations: [],
        note: 'Azure rejected this request. No model answer was generated. Remaining variants were not executed.',
      }, null, 2) + '\n');
      throw error;
    }
    let final = first;
    let toolTrace;
    if (testCase.toolChain) {
      const chain = await finishToolChain(request, first, config, token);
      final = chain.final;
      experimentTrace.toolSteps = chain.toolSteps;
      experimentTrace.finalMessages = chain.finalMessages;
      // usage is stored on the final result; only preceding requests are additional.
      experimentTrace.extraRequests = [
        { kind: 'chat', model: first.model, usage: first.usage, latencyMs: first.latencyMs },
        ...chain.extraRequests.slice(0, -1),
      ];
    }
    if (testCase.tool) {
      const calls = first.message.tool_calls;
      if (calls?.length !== 1) throw new Error('Expected exactly one tool call.');
      const call = calls[0];
      toolTrace = executeMultiply(call.function.name, call.function.arguments);
      final = await complete({
        ...request, tool_choice: 'none',
        messages: [...request.messages, first.message, {
          role: 'tool', tool_call_id: call.id, content: JSON.stringify({ total: toolTrace.total }),
        }],
      }, config, token);
    }
    if (typeof final.message.content !== 'string' || !final.message.content.trim()) {
      throw new Error(`No visible answer for ${lab.id}/${testCase.label}; finish reason: ${final.finishReason}`);
    }
    results.push({
      label: testCase.label, request, output: final.message.content, actualModel: final.model,
      finishReason: final.finishReason, usage: final.usage,
      latencyMs: testCase.toolChain ? final.latencyMs + experimentTrace.extraRequests.reduce((sum, entry) => sum + entry.latencyMs, 0) :
        first.latencyMs + (testCase.tool ? final.latencyMs : 0) + (experimentTrace.extraRequests ?? []).reduce((sum, entry) => sum + entry.latencyMs, 0),
      ...experimentTrace,
      ...(toolTrace ? { toolTrace, toolRequestUsage: first.usage, toolRequestModel: first.model, toolRequestFinishReason: first.finishReason } : {}),
    });
    console.log(final.message.content);
    console.log(`  ${final.latencyMs}ms | ${final.usage.total_tokens} tokens | ${final.finishReason}\n`);
  }
  const observations = evaluate(id, results);
  const record = { labId: id, recordedAt: new Date().toISOString(), results, observations };
  await writeFile(new URL(`../results/${id}.json`, import.meta.url), JSON.stringify(record, null, 2) + '\n');
  const failed = observations.filter(item => !item.passed);
  if (failed.length) throw new Error(`Saved actual outcomes; checks failed: ${failed.map(item => item.name).join(', ')}`);
  return record;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const id = process.argv[2];
    if (!id) throw new Error('Usage: npm run demo -- <lab-id|all|advanced|agents>. Each execution makes billable Azure requests.');
    if (id === 'all' || id === 'advanced' || id === 'agents') {
      const config = await loadConfig();
      const session = { config, token: await accessToken(config.subscriptionId) };
      for (const lab of labs.filter(entry => id === 'all' ||
        (id === 'advanced' && Number(entry.id.slice(0, 2)) >= 13 && Number(entry.id.slice(0, 2)) <= 18) ||
        (id === 'agents' && entry.cases[0].agent))) await runLab(lab.id, session);
    } else {
      await runLab(id);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
