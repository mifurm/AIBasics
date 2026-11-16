import { readdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { runLab } from './run.mjs';
import { labs, getLab } from '../lib/labs.mjs';
import { loadConfig } from '../lib/azure.mjs';
import { persistRecord } from '../lib/azure-records.mjs';

const runId = process.env.RUN_ID ?? randomUUID();
if (!/^[a-zA-Z0-9-]{1,80}$/.test(runId)) throw new Error('Invalid run ID.');
const selection = process.env.LAB_SELECTION ?? 'agents';
const selected = selection === 'agents' ? labs.filter(lab => lab.cases[0].agent) :
  selection === 'all' ? labs : [getLab(selection)];
const config = await loadConfig();
const manifest = { runId, runtime: 'Azure Container Apps Job', startedAt: new Date().toISOString(), status: 'running', labs: [], records: [] };
try {
  for (const lab of selected) {
    await runLab(lab.id, { config });
    manifest.labs.push(lab.id);
  }
  manifest.status = 'completed';
} catch (error) {
  manifest.status = 'failed';
  manifest.error = error.message;
  process.exitCode = 1;
  console.error(error);
} finally {
  for (const file of await readdir('results')) {
    if (!selected.some(lab => file === `${lab.id}.json`)) continue;
    const record = JSON.parse(await readFile(`results/${file}`, 'utf8'));
    await persistRecord(runId, file.slice(0, -5), record);
    manifest.records.push(record.labId);
  }
  manifest.finishedAt = new Date().toISOString();
  await persistRecord(runId, 'manifest', manifest);
  console.log(JSON.stringify(manifest));
}
