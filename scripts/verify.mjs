import { parseArgs } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { labs } from '../lib/labs.mjs';
import { evaluate } from '../lib/evaluate.mjs';
import { loadConfig } from '../lib/azure.mjs';

const { values } = parseArgs({ options: { media: { type: 'boolean', default: false } } });
const config = await loadConfig();
const galleryResponse = await fetch(new URL('results.json', config.website));
if (!galleryResponse.ok) throw new Error(`Gallery manifest failed: HTTP ${galleryResponse.status}`);
const gallery = await galleryResponse.json();
if (gallery.length !== labs.length) throw new Error(`Deployed gallery does not contain all ${labs.length} labs.`);
for (const lab of labs) {
  await stat(`labs/${lab.id}/readme.md`);
  await stat(`labs/${lab.id}/demo.mjs`);
  const record = JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8'));
  const deployed = gallery.find(item => item.id === lab.id);
  if (!deployed || JSON.stringify(deployed.results) !== JSON.stringify(record.results)) throw new Error(`Stale deployed outcomes: ${lab.id}`);
  if (record.status === 'blocked') {
    if (lab.id !== '10-untrusted-context' || record.results[0].error?.code !== 'content_filter' || record.results[0].output !== null) {
      throw new Error(`Unexpected blocked outcome: ${lab.id}`);
    }
    console.log(`${lab.id}: verified real Azure block, not a model completion.`);
  } else {
    if (record.results.length !== lab.cases.length) throw new Error(`Missing variants for ${lab.id}`);
    for (const result of record.results) {
      if (!result.output?.trim() || !result.actualModel) throw new Error(`Invalid result in ${lab.id}`);
      if (result.kind === 'computation') {
        if (lab.id !== '00-tiny-transformer' || result.usage !== null || result.apiRequests !== 0 || !result.computationTrace) {
          throw new Error(`Invalid teaching computation evidence in ${lab.id}`);
        }
      } else if (result.kind === 'experiment') {
        if (lab.series !== 'genai' || result.apiRequests !== result.apiCalls.length ||
          result.apiCalls.some(call => !call.operation || !Number.isInteger(call.latencyMs))) throw new Error(`Invalid experiment evidence in ${lab.id}`);
      } else if (!Number.isInteger(result.usage?.total_tokens)) throw new Error(`Invalid API usage in ${lab.id}`);
      for (const extra of result.extraRequests ?? []) {
        if (!extra.model || !Number.isInteger(extra.usage?.total_tokens) || !Number.isInteger(extra.latencyMs)) {
          throw new Error(`Incomplete additional-request usage in ${lab.id}`);
        }
      }
    }
    const failed = evaluate(lab.id, record.results).filter(check => !check.passed);
    if (failed.length) throw new Error(`Behavior check failed for ${lab.id}: ${failed.map(check => check.name).join(', ')}`);
    let verifiedArtifacts = 0;
    for (const artifact of record.artifacts ?? []) {
      const response = await fetch(new URL(`media/${lab.id}/${artifact.file}`, config.website), { signal: AbortSignal.timeout(60_000) });
      if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith(artifact.mime.split('/')[0])) {
        throw new Error(`Deployed artifact is missing or has the wrong type: ${lab.id}/${artifact.file} (HTTP ${response.status}, ${response.headers.get('content-type')})`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) throw new Error(`Deployed artifact differs from the Azure record: ${lab.id}/${artifact.file}`);
      const local = await readFile(`results/media/${lab.id}/${artifact.file}`);
      if (!local.equals(bytes)) throw new Error(`Local artifact differs from the deployed artifact: ${lab.id}/${artifact.file}`);
      verifiedArtifacts++;
    }
    console.log(`${lab.id}: verified saved and deployed outcomes${verifiedArtifacts ? ` and ${verifiedArtifacts} media files` : ''}.`);
  }
  if (values.media) {
    const response = await fetch(`${config.website}recordings/${lab.id}.mp4`, { method: 'HEAD' });
    if (!response.ok || response.headers.get('content-type') !== 'video/mp4' || Number(response.headers.get('content-length')) < 1000) {
      throw new Error(`Missing or invalid deployed recording: ${lab.id}`);
    }
  }
}
if (values.media) {
  const response = await fetch(`${config.website}AI-Basics.pptx`, { method: 'HEAD' });
  if (!response.ok || Number(response.headers.get('content-length')) < 1000) throw new Error('Deployed PowerPoint is missing.');
}
console.log(`Verified ${labs.length} labs${values.media ? `, ${labs.length} recordings, and deployed PowerPoint` : ''}.`);
