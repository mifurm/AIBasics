import { mkdir, readFile, writeFile, copyFile, stat, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { labs } from '../lib/labs.mjs';
import { isBasicLab, validateTranslations, localizeDiagram } from '../web/i18n.mjs';

validateTranslations(labs);
await mkdir('site', { recursive: true });
await mkdir('site/handouts', { recursive: true });
await rm('site/media', { recursive: true, force: true });
const { values } = parseArgs({ options: { 'media-directory': { type: 'string' } } });
const records = [];
for (const lab of labs) {
  if (isBasicLab(lab)) {
    await copyFile(`labs/${lab.id}/readme.md`, `site/handouts/${lab.id}.en.md`);
    await copyFile(`labs/${lab.id}/readme.pl.md`, `site/handouts/${lab.id}.pl.md`);
  }
  const record = JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8'));
  if (record.status === 'failed' || record.observations.some(check => !check.passed) ||
      (record.status !== 'blocked' && record.results.length !== lab.cases.length)) {
    throw new Error(`Cannot publish incomplete or failed outcomes for ${lab.id}; rerun that lab first.`);
  }
  for (const artifact of record.artifacts ?? []) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*\.(png|wav|svg)$/.test(artifact.file)) throw new Error(`Unsafe artifact file name in ${lab.id}: ${artifact.file}`);
    const bytes = await readFile(`results/media/${lab.id}/${artifact.file}`);
    if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) throw new Error(`Artifact ${lab.id}/${artifact.file} does not match its recorded hash.`);
    await mkdir(`site/media/${lab.id}`, { recursive: true });
    await writeFile(`site/media/${lab.id}/${artifact.file}`, bytes);
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
for (const file of ['i18n.mjs', 'polish.mjs', 'polish-walkthrough.mjs']) await copyFile(`web/${file}`, `site/${file}`);
await copyFile('web/style.css', 'site/style.css');
await copyFile('web/transformer.svg', 'site/transformer.svg');
await writeFile('site/transformer.pl.svg', localizeDiagram(await readFile('web/transformer.svg', 'utf8')));
await writeFile('site/404.html', '<!doctype html><html lang="en"><title>Not found</title><a href="/">Return to AI Basics</a></html>\n');
console.log(`Built gallery with ${records.length} recorded lab outcomes.`);
