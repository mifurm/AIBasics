import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { labs, getLab } from '../lib/labs.mjs';
import { loadConfig, accessToken, buildRequest, complete, AzureRequestError } from '../lib/azure.mjs';
import { multiplyTool, executeMultiply } from '../lib/tools.mjs';
import { evaluate } from '../lib/evaluate.mjs';
import { prepareExperiment, finishToolChain } from '../lib/experiments.mjs';
import { runAgent } from '../lib/agent.mjs';
import { runTransformerExperiment } from '../lib/transformer-lab.mjs';
import { renderWalkthroughText } from '../lib/transformer-walkthrough-check.mjs';
import { assessComparisonOutput } from '../lib/model-comparison.mjs';
import { runGenaiLab } from '../lib/genai/runner.mjs';
import { selectLabs, selectionGroups } from '../lib/selection.mjs';

// The CPU demo prints every step, equation and number of a walkthrough. Azure runs only persist the record.
export function printWalkthroughs(record) {
  for (const result of record?.results ?? []) {
    const walkthrough = result.computationTrace?.walkthrough;
    if (walkthrough) console.log(`\n${renderWalkthroughText(walkthrough)}\n`);
  }
}

export async function runLab(id, session) {
  const lab = getLab(id);
  if (lab.id === '00-tiny-transformer') {
    const results = runTransformerExperiment();
    const observations = evaluate(id, results);
    const record = { labId: id, recordedAt: new Date().toISOString(), results, observations };
    await mkdir(new URL('../results/', import.meta.url), { recursive: true });
    await writeFile(new URL(`../results/${id}.json`, import.meta.url), JSON.stringify(record, null, 2) + '\n');
    for (const result of results) console.log(`${result.label}\n${result.output}\n`);
    const failed = observations.filter(check => !check.passed);
    if (failed.length) throw new Error(`Saved actual computations; checks failed: ${failed.map(check => check.name).join(', ')}`);
    return record;
  }
  const config = session?.config ?? await loadConfig();
  const token = session?.token ?? await accessToken(config.subscriptionId);
  if (lab.series === 'genai') return runGenaiLab(lab, { config, token }, new URL('../results/', import.meta.url));
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
      ...(testCase.comparison ? { comparison: {
        ...testCase.comparison, targetChecks: assessComparisonOutput(testCase.comparison.taskId, final.message.content),
      } } : {}),
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
    if (!id) throw new Error(`Usage: npm run demo -- <lab-id|${selectionGroups.join('|')}>. Each execution makes billable Azure requests.`);
    if (selectionGroups.includes(id) || id === 'advanced' || id.includes(',')) {
      const config = await loadConfig();
      const session = { config, token: await accessToken(config.subscriptionId) };
      const chosen = id === 'advanced' ? labs.filter(entry => Number(entry.id.slice(0, 2)) >= 13 && Number(entry.id.slice(0, 2)) <= 18) : selectLabs(id);
      for (const lab of chosen) printWalkthroughs(await runLab(lab.id, session));
    } else {
      printWalkthroughs(await runLab(id));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
