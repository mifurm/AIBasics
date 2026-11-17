import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createAzureClient } from './azure-client.mjs';
import { createArtifactStore } from './artifacts.mjs';
import { assertExperimentResult } from './contract.mjs';

export async function saveGenaiRecord(labId, record, store, root) {
  const mediaDirectory = new URL(`media/${labId}/`, root);
  await mkdir(root, { recursive: true });
  await rm(mediaDirectory, { recursive: true, force: true });
  if (store.entries().length) await mkdir(mediaDirectory, { recursive: true });
  for (const { ref, buffer } of store.entries()) await writeFile(new URL(ref.file, mediaDirectory), buffer);
  await writeFile(new URL(`${labId}.json`, root), JSON.stringify(record, null, 2) + '\n');
}

export async function runGenaiLab(lab, session, root) {
  const store = createArtifactStore(lab.id);
  const results = [];
  const ctx = {
    azure: session.azure ?? createAzureClient(session.config, session.token),
    artifacts: store, config: session.config,
    log: session.log ?? console.log,
    addResult(result) {
      assertExperimentResult(result, store);
      results.push(result);
      ctx.log(`${lab.id}: ${result.label}\n${result.output}\n`);
    },
  };
  let failure;
  try {
    await lab.run(ctx);
    if (results.length !== lab.cases.length) throw new Error(`Expected ${lab.cases.length} experiment results, recorded ${results.length}.`);
  } catch (error) {
    failure = error;
  }
  const observations = failure ? [] : lab.evaluate(results);
  const record = {
    labId: lab.id, recordedAt: new Date().toISOString(), results, observations, artifacts: store.refs(),
    ...(failure ? { status: 'failed', error: failure.message } : {}),
  };
  await saveGenaiRecord(lab.id, record, store, root);
  if (failure) throw failure;
  const failed = observations.filter(check => !check.passed);
  if (failed.length) throw new Error(`Saved actual outcomes; checks failed: ${failed.map(check => check.name).join(', ')}`);
  return record;
}
