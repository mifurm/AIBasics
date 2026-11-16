import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { managedToken } from './cloud.mjs';

export class AzureRequestError extends Error {
  constructor(status, error) {
    super(`Azure request failed (${status}): ${error.code ?? 'unknown'}: ${error.message ?? 'No error message supplied'}`);
    this.status = status;
    this.azureCode = error.code;
  }
}

export function az(args, json = true) {
  const output = execFileSync('az', [...args, '--only-show-errors', '-o', json ? 'json' : 'none'], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return json && output.trim() ? JSON.parse(output) : undefined;
}

export async function loadConfig() {
  if (process.env.AIBASICS_CONFIG) return JSON.parse(process.env.AIBASICS_CONFIG);
  try {
    return JSON.parse(await readFile(new URL('../.azure.local.json', import.meta.url), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Missing Azure configuration. Run the deployment script first.', { cause: error });
    throw error;
  }
}

export function accessToken(subscriptionId) {
  if (process.env.IDENTITY_ENDPOINT) return managedToken('https://cognitiveservices.azure.com/');
  return az(['account', 'get-access-token', '--subscription', subscriptionId, '--resource', 'https://cognitiveservices.azure.com']).accessToken;
}

export function buildRequest(testCase, config) {
  const reasoning = testCase.model === 'reasoning';
  const parameters = testCase.parameters ?? {};
  if (reasoning && ['temperature', 'top_p', 'max_tokens'].some(key => key in parameters)) {
    throw new Error('The configured GPT-5-mini reasoning model does not support sampling controls or max_tokens.');
  }
  return {
    model: reasoning ? config.reasoningDeployment : config.standardDeployment,
    messages: testCase.messages,
    ...(reasoning ? { max_completion_tokens: 1400, reasoning_effort: 'low' } : { max_tokens: 320 }),
    ...parameters,
  };
}

export async function complete(request, config, token) {
  const url = new URL(`openai/deployments/${encodeURIComponent(request.model)}/chat/completions`, config.endpoint);
  url.searchParams.set('api-version', '2024-10-21');
  const start = performance.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new AzureRequestError(response.status, body.error ?? { message: response.statusText });
  }

  if (!body.choices?.[0]) throw new Error('Azure returned no completion choice.');
  return {
    model: body.model,
    message: body.choices[0].message,
    finishReason: body.choices[0].finish_reason,
    usage: body.usage,
    latencyMs: Math.round(performance.now() - start),
  };
}

export async function embed(input, config, token) {
  const deployment = config.embeddingDeployment ?? 'text-embedding-3-small';
  const url = new URL(`openai/deployments/${encodeURIComponent(deployment)}/embeddings`, config.endpoint);
  url.searchParams.set('api-version', '2024-10-21');
  const start = performance.now();
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, model: deployment }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json();
  if (!response.ok) throw new AzureRequestError(response.status, body.error ?? { message: response.statusText });
  if (!Array.isArray(body.data) || body.data.length !== input.length) throw new Error('Azure returned an incomplete embedding batch.');
  const ordered = [...body.data].sort((a, b) => a.index - b.index);
  if (ordered.some((entry, index) => entry.index !== index || !Array.isArray(entry.embedding))) throw new Error('Invalid embedding indexes or vectors.');
  return { vectors: ordered.map(entry => entry.embedding), model: body.model, usage: body.usage, latencyMs: Math.round(performance.now() - start) };
}
