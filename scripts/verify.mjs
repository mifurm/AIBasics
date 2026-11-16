import { parseArgs } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
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
      } else if (!Number.isInteger(result.usage?.total_tokens)) throw new Error(`Invalid API usage in ${lab.id}`);
      for (const extra of result.extraRequests ?? []) {
        if (!extra.model || !Number.isInteger(extra.usage?.total_tokens) || !Number.isInteger(extra.latencyMs)) {
          throw new Error(`Incomplete additional-request usage in ${lab.id}`);
        }
      }
    }
    const failed = evaluate(lab.id, record.results).filter(check => !check.passed);
    if (failed.length) throw new Error(`Behavior check failed for ${lab.id}: ${failed.map(check => check.name).join(', ')}`);
    console.log(`${lab.id}: verified saved and deployed outcomes.`);
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
