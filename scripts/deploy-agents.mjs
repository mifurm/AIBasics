import { parseArgs } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { az, loadConfig } from '../lib/azure.mjs';

let directory;
try {
  const { values } = parseArgs({ options: {
    'confirm-costs': { type: 'boolean', default: false },
    region: { type: 'string' },
  } });
  if (!values['confirm-costs']) throw new Error('Use --confirm-costs to authorize Consumption job execution, Azure Monitor log ingestion, and model inference charges.');
  const config = await loadConfig();
  const sub = ['--subscription', config.subscriptionId];
  const group = az(['group', 'show', '-n', config.resourceGroup, ...sub]);
  if (group.tags?.project !== 'ai-basics-classroom') throw new Error('Refusing to deploy into an untagged resource group.');
  const identityToken = az(['account', 'get-access-token', ...sub]).accessToken;
  const principalId = JSON.parse(Buffer.from(identityToken.split('.')[1], 'base64url').toString()).oid;
  if (!principalId) throw new Error('Sign in interactively with az login; publisher object ID was not found.');
  directory = await mkdtemp(join(tmpdir(), 'aibasics-deploy-'));
  const archive = join(directory, 'source.tgz');
  execFileSync('tar', ['-czf', archive, 'lib', 'scripts'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' }, stdio: 'pipe',
  });
  const archiveBytes = await readFile(archive);
  const sha256 = createHash('sha256').update(archiveBytes).digest('hex');
  const parameters = join(directory, 'parameters.json');
  await writeFile(parameters, JSON.stringify({
    sourceArchive: { value: archiveBytes.toString('base64') },
  }));
  console.log('Deploying a manual Consumption job and authenticated Azure Monitor results. No model deployments are changed.');
  const deployment = az(['deployment', 'group', 'create', '-g', config.resourceGroup, '-n', 'classroom-agents',
    '--template-file', 'infra/agents.bicep', '--parameters',
    `publisherPrincipalId=${principalId}`, `aiResourceGroup=${config.aiResourceGroup}`,
    `aiAccountName=${config.aiAccountName}`, `aiEndpoint=${config.endpoint}`,
    `standardDeployment=${config.standardDeployment}`, `reasoningDeployment=${config.reasoningDeployment}`,
    `embeddingDeployment=${config.embeddingDeployment}`, `sourceSha256=${sha256}`,
    `location=${values.region ?? config.region}`, `@${parameters}`, ...sub]);
  const outputs = deployment.properties.outputs;
  config.agentRuntime = {
    jobId: outputs.jobId.value, jobName: outputs.jobName.value,
    workspaceId: outputs.workspaceId.value, workspaceName: outputs.workspaceName.value,
    identityId: outputs.identityId.value, sourceSha256: sha256,
  };
  await writeFile('.azure.local.json', JSON.stringify(config, null, 2) + '\n');
  const metadata = JSON.parse(await readFile('deliverables/deployment.json', 'utf8'));
  metadata.agentRuntime = { ...config.agentRuntime, deployedAt: new Date().toISOString(), runtime: 'Azure Container Apps Job' };
  await writeFile('deliverables/deployment.json', JSON.stringify(metadata, null, 2) + '\n');
  console.log(`Azure job ready: ${config.agentRuntime.jobName}\nRun npm run azure:agents -- agents`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}
