export const mediaModels = [
  { key: 'imageDeployment', labs: 'Lab 32', model: 'gpt-image-1.5', accepts: ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'], version: '2025-12-16', sku: 'GlobalStandard', capacity: 1, name: 'gpt-image-1.5' },
  { key: 'speechDeployment', labs: 'Labs 34 and 35', model: 'tts', accepts: ['tts', 'tts-hd'], version: '001', sku: 'Standard', capacity: 1, name: 'tts' },
  { key: 'transcriptionDeployment', labs: 'Lab 34', model: 'whisper', accepts: ['whisper'], version: '001', sku: 'Standard', capacity: 1, name: 'whisper' },
  { key: 'diarizationDeployment', labs: 'Lab 35', model: 'gpt-4o-transcribe-diarize', accepts: ['gpt-4o-transcribe-diarize'], version: '2025-10-15', sku: 'GlobalStandard', capacity: 10, name: 'gpt-4o-transcribe-diarize' },
];

// Finds ready deployments by the model they serve, so custom deployment names are respected.
export function findMediaDeployments(deployments) {
  const ready = deployments.filter(entry => entry.properties?.provisioningState === 'Succeeded');
  const found = {};
  const missing = [];
  for (const spec of mediaModels) {
    const match = ready.find(entry => entry.properties.model?.name === spec.model) ?? ready.find(entry => spec.accepts.includes(entry.properties.model?.name));
    if (match) found[spec.key] = match.name;
    else missing.push(spec);
  }
  return { found, missing };
}
