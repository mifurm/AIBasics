import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { labs } from '../lib/labs.mjs';

await mkdir('site', { recursive: true });
const { values } = parseArgs({ options: { 'media-directory': { type: 'string' } } });
const records = [];
for (const lab of labs) {
  const record = JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8'));
  if (record.status === 'failed' || record.observations.some(check => !check.passed) ||
      (record.status !== 'blocked' && record.results.length !== lab.cases.length)) {
    throw new Error(`Cannot publish incomplete or failed outcomes for ${lab.id}; rerun that lab first.`);
  }
  record.recordingAvailable = Boolean(values['media-directory']);
  if (record.recordingAvailable) await stat(path.join(values['media-directory'], `${lab.id}.mp4`));
  if (lab.id === '09-grounding') {
    record.firstAttempt = JSON.parse(await readFile('results/09-grounding-first-attempt.json', 'utf8'));
  }
  records.push({ ...lab, ...record });
}
await writeFile('site/results.json', JSON.stringify(records, null, 2) + '\n');
await copyFile('web/index.html', 'site/index.html');
await copyFile('web/app.js', 'site/app.js');
await copyFile('web/style.css', 'site/style.css');
await writeFile('site/404.html', '<!doctype html><html lang="en"><title>Not found</title><a href="/">Return to AI Basics</a></html>\n');
console.log(`Built gallery with ${records.length} real Azure lab records.`);
