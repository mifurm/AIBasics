import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { az, loadConfig } from '../lib/azure.mjs';
import { labs, getLab } from '../lib/labs.mjs';
import { decodeRecords } from '../lib/azure-records.mjs';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    'run-id': { type: 'string' }, execution: { type: 'string' },
  } });
  const selection = positionals[0] ?? 'agents';
  if (positionals.length > 1 || Boolean(values['run-id']) !== Boolean(values.execution)) {
    throw new Error('Usage: npm run azure:agents -- <agents|all|lab-id> [--run-id ID --execution NAME]');
  }
  if (!['all', 'agents'].includes(selection)) getLab(selection);
  const config = await loadConfig();
  const runtime = config.agentRuntime;
  if (!runtime) throw new Error('Run npm run deploy:agents -- --confirm-costs first.');
  const token = az(['account', 'get-access-token', '--subscription', config.subscriptionId]).accessToken;
  const api = `${runtime.jobId}?api-version=2025-01-01`;
  const arm = async (path, method = 'GET', body) => {
    let response = await fetch(new URL(path, 'https://management.azure.com'), {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120_000),
    });
    for (let attempt = 0; response.status === 202; attempt++) {
      if (attempt >= 60 || !response.headers.get('Location')) throw new Error('Azure operation did not return a pollable completion.');
      const location = new URL(response.headers.get('Location'), 'https://management.azure.com');
      if (location.origin !== 'https://management.azure.com') throw new Error('Unexpected Azure operation polling host.');
      await delay(5000);
      response = await fetch(location, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
    }
    if (!response.ok) throw new Error(`Azure control plane HTTP ${response.status}: ${await response.text()}`);
    return response.json();
  };
  const runId = values['run-id'] ?? randomUUID();
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(runId) || (values.execution && !/^[a-zA-Z0-9-]{1,100}$/.test(values.execution))) {
    throw new Error('Invalid run ID or execution name.');
  }
  let execution;
  if (values.execution) execution = { name: values.execution, id: `${runtime.jobId}/executions/${values.execution}` };
  else {
    const job = await arm(api);
    const containers = structuredClone(job.properties.template.containers);
    for (const container of containers) {
      container.env = container.env.filter(entry => !['RUN_ID', 'LAB_SELECTION'].includes(entry.name));
      container.env.push({ name: 'RUN_ID', value: runId }, { name: 'LAB_SELECTION', value: selection });
    }
    execution = await arm(`${runtime.jobId}/start?api-version=2025-01-01`, 'POST', { containers });
  }
  if (!execution.name || !execution.id) throw new Error('Azure did not return an execution ID. Inspect the job before starting another run.');
  console.log(`Azure execution: ${execution.name}\nAuthenticated Azure Monitor result ID: ${runId}`);
  await mkdir('results', { recursive: true });
  await writeFile('results/azure-execution.json', JSON.stringify({
    runId, executionName: execution.name, selection, startedAt: new Date().toISOString(),
  }, null, 2) + '\n');
  let status;
  for (let attempt = 0; attempt < 250; attempt++) {
    const current = await arm(`${execution.id}?api-version=2025-01-01`);
    status = current.properties.status;
    if (['Succeeded', 'Failed', 'Stopped', 'Degraded'].includes(status)) break;
    if (attempt % 4 === 0) console.log(`Azure job: ${status ?? 'starting'}`);
    await delay(15_000);
  }
  if (!['Succeeded', 'Failed', 'Stopped', 'Degraded'].includes(status)) {
    throw new Error(`Timed out waiting locally; execution ${execution.name} may still be running. Do not start a duplicate.`);
  }
  const logToken = az(['account', 'get-access-token', '--subscription', config.subscriptionId, '--resource', 'https://api.loganalytics.io']).accessToken;
  let records = new Map();
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(`https://api.loganalytics.azure.com/v1/workspaces/${runtime.workspaceId}/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${logToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `AIBasicsResults_CL | where TimeGenerated > ago(2h) | where RunId == "${runId}" | project Log` }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json();
    if (!response.ok && !(response.status === 400 && JSON.stringify(body).includes('Failed to resolve table'))) {
      throw new Error(`Azure Monitor query HTTP ${response.status}: ${JSON.stringify(body)}`);
    }
    if (response.ok) {
      if (body.error) throw new Error(`Azure Monitor returned a partial query error: ${JSON.stringify(body.error)}`);
      records = decodeRecords(runId, body.tables.flatMap(table => table.rows.map(row => row[0])));
      const manifest = records.get('manifest');
      if (manifest && (manifest.records ?? manifest.labs).every(id => records.has(id))) break;
      if (status !== 'Succeeded' && attempt >= 8 && !manifest) {
        throw new Error(`Azure execution ${status} before result publication. Inspect console logs for ${execution.name}; run ID ${runId}.`);
      }
    }
    if (attempt % 4 === 0) console.log('Waiting for durable Azure Monitor result ingestion...');
    await delay(15_000);
  }
  const manifest = records.get('manifest');
  if (!manifest) throw new Error(`No complete result manifest in Azure Monitor. Execution ${execution.name}: ${status}; run ID ${runId}.`);
  if (manifest.runId !== runId) throw new Error('Downloaded manifest has the wrong run ID.');
  const expected = selection === 'all' ? labs : selection === 'agents' ? labs.filter(lab => lab.cases[0].agent) : [getLab(selection)];
  if (manifest.status === 'completed' && JSON.stringify(manifest.labs) !== JSON.stringify(expected.map(lab => lab.id))) {
    throw new Error('Completed Azure manifest does not contain the exact requested lab set.');
  }
  await mkdir('results', { recursive: true });
  const completed = new Set(manifest.labs.map(id => getLab(id).id));
  for (const id of manifest.records ?? [...records.keys()].filter(name => name !== 'manifest')) {
    if (!expected.some(lab => lab.id === id)) throw new Error(`Unexpected Azure lab record: ${id}`);
    const record = records.get(id);
    if (!record) throw new Error(`Incomplete Azure Monitor evidence for ${id}; run ID ${runId}.`);
    if (record.labId !== id) throw new Error(`Wrong lab ID downloaded for ${id}.`);
    record.execution = { runtime: manifest.runtime, executionName: execution.name, runId };
    await writeFile(`results/${id}.json`, JSON.stringify(record, null, 2) + '\n');
  }
  await writeFile('results/azure-run.json', JSON.stringify({ ...manifest, executionName: execution.name }, null, 2) + '\n');
  if (status !== 'Succeeded' || manifest.status !== 'completed') throw new Error(`Azure execution ${status}: ${manifest.error ?? manifest.status}. Downloaded evidence is retained.`);
  console.log(`Downloaded ${completed.size} verified lab records executed entirely in Azure.`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
