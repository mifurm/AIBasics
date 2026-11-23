import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { runLab } from './run.mjs';
import { selectLabs } from '../lib/selection.mjs';
import { loadConfig } from '../lib/azure.mjs';
import { persistRecord, persistBlob } from '../lib/azure-records.mjs';
import { sha256 } from '../lib/genai/artifacts.mjs';

const runId = process.env.RUN_ID ?? randomUUID();
if (!/^[a-zA-Z0-9-]{1,80}$/.test(runId)) throw new Error('Invalid run ID.');
const selected = selectLabs(process.env.LAB_SELECTION ?? 'agents');
const config = await loadConfig();
const manifest = { runId, runtime: 'Azure Container Apps Job', startedAt: new Date().toISOString(), status: 'running', labs: [], records: [], artifacts: [] };
try {
  if (selected.some(lab => lab.id === '00a-tokens')) {
    execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'inherit' });
  }
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
  for (const lab of selected) {
    let record;
    try {
      record = JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    await persistRecord(runId, lab.id, record);
    for (const artifact of record.artifacts ?? []) {
      const buffer = await readFile(`results/media/${lab.id}/${artifact.file}`);
      if (sha256(buffer) !== artifact.sha256) throw new Error(`Artifact ${lab.id}/${artifact.file} changed after it was recorded.`);
      const name = `${lab.id}--${artifact.id}`;
      await persistBlob(runId, name, buffer);
      manifest.artifacts.push({ lab: lab.id, id: artifact.id, name, file: artifact.file, sha256: artifact.sha256, bytes: artifact.bytes });
    }
    manifest.records.push(record.labId);
  }
  manifest.finishedAt = new Date().toISOString();
  await persistRecord(runId, 'manifest', manifest);
  console.log(JSON.stringify({ ...manifest, artifacts: manifest.artifacts.length }));
}
