import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { az, loadConfig } from '../lib/azure.mjs';
import { findMediaDeployments } from '../lib/media-deployments.mjs';

try {
  const { values } = parseArgs({ options: {
    'confirm-costs': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  } });
  const config = await loadConfig();
  const sub = ['--subscription', config.subscriptionId];
  const listing = () => az(['cognitiveservices', 'account', 'deployment', 'list', '-g', config.aiResourceGroup, '-n', config.aiAccountName, ...sub]);
  let { found, missing } = findMediaDeployments(listing());
  for (const [key, name] of Object.entries(found)) console.log(`Found ${key}: ${name}`);
  if (missing.length && !values['dry-run']) {
    if (!values['confirm-costs']) throw new Error('Missing model deployments. Re-run with --confirm-costs to create them (billing is per use), or with --dry-run to preview.');
    for (const spec of missing) {
      console.log(`Creating ${spec.name} (${spec.model} ${spec.version}, ${spec.sku}, capacity ${spec.capacity}) for ${spec.labs}...`);
      az(['cognitiveservices', 'account', 'deployment', 'create', '-g', config.aiResourceGroup, '-n', config.aiAccountName,
        '--deployment-name', spec.name, '--model-name', spec.model, '--model-version', spec.version, '--model-format', 'OpenAI',
        '--sku-name', spec.sku, '--sku-capacity', String(spec.capacity), ...sub], false);
    }
    ({ found, missing } = findMediaDeployments(listing()));
  }
  if (missing.length) {
    for (const spec of missing) console.log(`${values['dry-run'] ? 'Would create' : 'Still missing'}: ${spec.name} (${spec.model} ${spec.version}, ${spec.sku}, capacity ${spec.capacity}) needed by ${spec.labs}.`);
    if (!values['dry-run']) throw new Error('Some media model deployments are not ready. Check regional availability and quota, and do not bypass either.');
  } else if (values['dry-run']) {
    console.log('All media model deployments are ready; nothing to create.');
  } else {
    const previous = JSON.parse(await readFile('.azure.local.json', 'utf8'));
    await writeFile('.azure.local.json', JSON.stringify({ ...previous, ...found }, null, 2) + '\n');
    console.log('All media model deployments are ready; their names are recorded in the local configuration.');
  }
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
