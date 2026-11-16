import { parseArgs } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { az } from '../lib/azure.mjs';

try {
  const { values } = parseArgs({ options: {
    subscription: { type: 'string' }, region: { type: 'string', default: 'swedencentral' },
    'hosting-region': { type: 'string', default: 'westeurope' },
    group: { type: 'string', default: 'rg-aibasics-classroom' },
    'reuse-group': { type: 'string' }, 'reuse-account': { type: 'string' },
    'create-models': { type: 'boolean', default: false },
    'confirm-public': { type: 'boolean', default: false },
  } });
  if (!values['confirm-public']) throw new Error('Use --confirm-public to authorize public hosting of synthetic lab outcomes only.');
  if (values['create-models'] === Boolean(values['reuse-account'])) {
    throw new Error('Choose exactly one of --create-models or --reuse-account (with --reuse-group).');
  }
  if (values['reuse-account'] && !values['reuse-group']) throw new Error('--reuse-group is required with --reuse-account.');
  const account = az(['account', 'show', ...(values.subscription ? ['--subscription', values.subscription] : [])]);
  const subscriptionId = account.id;
  const sub = ['--subscription', subscriptionId];
  const identityToken = az(['account', 'get-access-token', ...sub]).accessToken;
  const principalId = JSON.parse(Buffer.from(identityToken.split('.')[1], 'base64url').toString()).oid;
  if (!principalId) throw new Error('Unable to determine publisher object ID. Sign in as a user with az login.');
  const existing = az(['group', 'exists', '-n', values.group, ...sub]);
  if (existing) {
    const group = az(['group', 'show', '-n', values.group, ...sub]);
    if (group.tags?.project !== 'ai-basics-classroom') throw new Error('Refusing to use a resource group not tagged for this project.');
  } else {
    az(['group', 'create', '-n', values.group, '-l', values.region, '--tags', 'project=ai-basics-classroom', ...sub]);
  }
  const deployment = az(['deployment', 'group', 'create', '-g', values.group, '-n', 'classroom-hosting',
    '--template-file', 'infra/main.bicep', '--parameters', `location=${values['hosting-region']}`, ...sub]);
  const appName = deployment.properties.outputs.appName.value;
  let aiGroup = values['reuse-group'];
  let aiName = values['reuse-account'];
  if (values['create-models']) {
    const ai = az(['deployment', 'group', 'create', '-g', values.group, '-n', 'classroom-models',
      '--template-file', 'infra/models.bicep', '--parameters', `studentPrincipalId=${principalId}`, ...sub]);
    aiGroup = values.group;
    aiName = ai.properties.outputs.accountName.value;
  }
  const ai = az(['cognitiveservices', 'account', 'show', '-g', aiGroup, '-n', aiName, ...sub]);
  const deployments = az(['cognitiveservices', 'account', 'deployment', 'list', '-g', aiGroup, '-n', aiName, ...sub]);
  for (const name of ['gpt-4o', 'gpt-5-mini', 'text-embedding-3-small']) {
    const entry = deployments.find(item => item.name === name && item.properties.provisioningState === 'Succeeded');
    if (!entry || entry.properties.model.name !== name) throw new Error(`A ready ${name} deployment with that name is required.`);
  }
  const config = {
    subscriptionId, resourceGroup: values.group, appName, region: values.region,
    hostingRegion: values['hosting-region'], hosting: 'static-web-apps-free',
    website: deployment.properties.outputs.website.value,
    aiResourceGroup: aiGroup, aiAccountName: aiName, endpoint: ai.properties.endpoint,
    standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini', embeddingDeployment: 'text-embedding-3-small',
    reusedModels: !values['create-models'],
  };
  await writeFile('.azure.local.json', JSON.stringify(config, null, 2) + '\n');
  await mkdir('deliverables', { recursive: true });
  await writeFile('deliverables/deployment.json', JSON.stringify({
    deployedAt: new Date().toISOString(), website: config.website,
    resourceGroup: values.group, appName, region: values.region,
    hosting: config.hosting, hostingRegion: config.hostingRegion, reusedModels: config.reusedModels,
    models: deployments.filter(item => ['gpt-4o', 'gpt-5-mini', 'text-embedding-3-small'].includes(item.name)).map(item => ({
      deployment: item.name, model: item.properties.model.name, version: item.properties.model.version,
    })),
  }, null, 2) + '\n');
  console.log(`Azure hosting ready: ${config.website}\nAI endpoint configured with Entra authentication; no API keys stored.`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
