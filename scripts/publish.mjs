import { parseArgs } from 'node:util';
import { stat, readdir, mkdtemp, copyFile, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { az, loadConfig } from '../lib/azure.mjs';
import { labs } from '../lib/labs.mjs';

let staging;
try {
  const { values } = parseArgs({ options: {
    'media-directory': { type: 'string' },
    'include-deck': { type: 'boolean', default: false },
  } });
  const config = await loadConfig();
  await stat('site/index.html');
  const allowed = new Set(['index.html', '404.html', 'app.js', 'style.css', 'results.json']);
  const entries = await readdir('site');
  if (entries.some(entry => !allowed.has(entry))) throw new Error('Unexpected site file; refusing to publish unreviewed content.');
  staging = await mkdtemp(path.join(tmpdir(), 'ai-basics-publish-'));
  for (const entry of entries) await copyFile(path.join('site', entry), path.join(staging, entry));
  if (values['media-directory']) {
    await mkdir(path.join(staging, 'recordings'));
    for (const lab of labs) {
      const file = path.resolve(values['media-directory'], `${lab.id}.mp4`);
      await stat(file);
      await copyFile(file, path.join(staging, 'recordings', `${lab.id}.mp4`));
    }
  }
  if (values['include-deck']) {
    await copyFile('deliverables/AI-Basics.pptx', path.join(staging, 'AI-Basics.pptx'));
  }
  const token = az(['staticwebapp', 'secrets', 'list', '-g', config.resourceGroup, '-n', config.appName,
    '--subscription', config.subscriptionId]).properties.apiKey;
  const deploy = spawnSync(path.resolve('node_modules/.bin/swa'), ['deploy', staging, '--env', 'production', '--no-use-keychain'], {
    env: { ...process.env, SWA_CLI_DEPLOYMENT_TOKEN: token, SWA_CLI_TELEMETRY_ENABLED: 'false' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
  });
  if (deploy.error) throw deploy.error;
  if (deploy.status !== 0) throw new Error(`Static Web Apps deployment failed: ${(deploy.stderr || deploy.stdout).replaceAll(token, '[REDACTED]')}`);
  console.log(deploy.stdout.replaceAll(token, '[REDACTED]'));
  const response = await fetch(config.website, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !(await response.text()).includes('AI Basics')) throw new Error(`Published website verification failed: ${response.status}`);
  console.log(`Published and HTTP-verified: ${config.website}`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (staging) await rm(staging, { recursive: true, force: true });
}
