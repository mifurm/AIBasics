import { AzureRequestError } from '../azure.mjs';

const GA_VERSION = '2024-10-21';
const PREVIEW_VERSION = '2025-04-01-preview';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function send(url, init, { attempts = 6, timeoutMs = 120_000, wait = sleep } = {}) {
  let waitedMs = 0;
  for (let attempt = 1; ; attempt++) {
    const started = performance.now();
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const latencyMs = Math.round(performance.now() - started);
    if ((response.status === 429 || response.status === 503) && attempt < attempts) {
      const advised = Number(response.headers.get('retry-after'));
      const delay = Math.min(60, (Number.isFinite(advised) && advised > 0 ? advised : 10) + 1) * 1000;
      await response.arrayBuffer().catch(() => undefined);
      waitedMs += delay;
      await wait(delay);
      continue;
    }
    return { response, latencyMs, attempts: attempt, waitedMs };
  }
}

async function failure(response, sent) {
  const text = await response.text().catch(() => '');
  let error;
  try { error = JSON.parse(text).error; } catch { /* non-JSON error bodies fall back to status text */ }
  const result = new AzureRequestError(response.status, error ?? { message: text.slice(0, 300) || response.statusText });
  if (sent) Object.assign(result, { attempts: sent.attempts, waitedMs: sent.waitedMs, latencyMs: sent.latencyMs });
  return result;
}

export function deploymentNames(config) {
  return {
    standard: config.standardDeployment, reasoning: config.reasoningDeployment,
    embedding: config.embeddingDeployment ?? 'text-embedding-3-small',
    image: config.imageDeployment ?? 'gpt-image-1.5', speech: config.speechDeployment ?? 'tts',
    transcription: config.transcriptionDeployment ?? 'whisper',
    diarization: config.diarizationDeployment ?? 'gpt-4o-transcribe-diarize',
  };
}

export function createAzureClient(config, token, options = {}) {
  const names = deploymentNames(config);
  const authorization = { Authorization: `Bearer ${token}` };
  const endpoint = (path, version) => {
    const url = new URL(path, config.endpoint);
    if (version) url.searchParams.set('api-version', version);
    return url;
  };
  const json = async (url, body, retry) => {
    const sent = await send(url, { method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, retry ?? options);
    if (!sent.response.ok) throw await failure(sent.response, sent);
    return sent;
  };
  const meta = (sent, operation, deployment, extra = {}) => ({
    operation, deployment, latencyMs: sent.latencyMs, attempts: sent.attempts, waitedMs: sent.waitedMs, ...extra,
  });
  const form = async (path, version, fields, audio, deployment, operation) => {
    const body = new FormData();
    body.append('file', new Blob([audio.data], { type: audio.mime ?? 'audio/wav' }), audio.filename ?? 'audio.wav');
    for (const [key, value] of fields) body.append(key, value);
    const sent = await send(endpoint(path, version), { method: 'POST', headers: authorization, body }, options);
    if (!sent.response.ok) throw await failure(sent.response, sent);
    return { sent, body: await sent.response.json(), call: (extra = {}) => meta(sent, operation, deployment, extra) };
  };
  return {
    names,
    async chat(request) {
      const sent = await json(endpoint(`openai/deployments/${encodeURIComponent(request.model)}/chat/completions`, GA_VERSION), request);
      const body = await sent.response.json();
      if (!Array.isArray(body.choices) || !body.choices.length) throw new Error('Azure returned no completion choices.');
      return { choices: body.choices, model: body.model, usage: body.usage, call: meta(sent, 'chat.completions', request.model, { model: body.model, usage: body.usage }) };
    },
    async image({ prompt, size = '1024x1024', quality = 'low' }) {
      const sent = await json(endpoint(`openai/deployments/${encodeURIComponent(names.image)}/images/generations`, PREVIEW_VERSION),
        { prompt, size, quality, n: 1, output_format: 'png' });
      const body = await sent.response.json();
      const encoded = body.data?.[0]?.b64_json;
      if (typeof encoded !== 'string') throw new Error('Azure returned no generated image.');
      const png = Buffer.from(encoded, 'base64');
      return { png, usage: body.usage, call: meta(sent, 'images.generate', names.image, { model: names.image, usage: body.usage ?? null, parameters: { size, quality } }) };
    },
    async speech({ input, voice, speed, format = 'wav' }) {
      const sent = await json(endpoint('openai/v1/audio/speech'), {
        model: names.speech, input, voice, response_format: format, ...(speed ? { speed } : {}),
      });
      const audio = Buffer.from(await sent.response.arrayBuffer());
      if (!(sent.response.headers.get('content-type') ?? '').startsWith('audio/')) throw new Error('Azure returned a non-audio speech response.');
      return { audio, call: meta(sent, 'audio.speech', names.speech, { model: names.speech, usage: null, billedCharacters: input.length, parameters: { voice, speed: speed ?? 1, format } }) };
    },
    async transcribe({ audio, language, prompt }) {
      const fields = [['response_format', 'verbose_json'], ['temperature', '0'], ...(language ? [['language', language]] : []), ...(prompt ? [['prompt', prompt]] : [])];
      const { body, call } = await form(`openai/deployments/${encodeURIComponent(names.transcription)}/audio/transcriptions`, GA_VERSION, fields, audio, names.transcription, 'audio.transcriptions');
      if (typeof body.text !== 'string') throw new Error('Azure returned no transcript text.');
      return { text: body.text, language: body.language, duration: body.duration, segments: body.segments ?? [], call: call({ model: names.transcription, usage: null, audioSeconds: body.duration }) };
    },
    async diarize({ audio }) {
      const fields = [['response_format', 'diarized_json'], ['chunking_strategy', 'auto']];
      const { body, call } = await form(`openai/deployments/${encodeURIComponent(names.diarization)}/audio/transcriptions`, PREVIEW_VERSION, fields, audio, names.diarization, 'audio.diarization');
      if (!Array.isArray(body.segments)) throw new Error('Azure returned no diarized segments.');
      return { text: body.text, duration: body.duration, segments: body.segments, call: call({ model: names.diarization, usage: body.usage ?? null, audioSeconds: body.duration }) };
    },
    async embed(input, { dimensions } = {}) {
      const sent = await json(endpoint(`openai/deployments/${encodeURIComponent(names.embedding)}/embeddings`, GA_VERSION), { input, ...(dimensions ? { dimensions } : {}) });
      const body = await sent.response.json();
      const ordered = [...(body.data ?? [])].sort((a, b) => a.index - b.index);
      if (ordered.length !== input.length || ordered.some((entry, index) => entry.index !== index || !Array.isArray(entry.embedding))) {
        throw new Error('Azure returned an incomplete or misordered embedding batch.');
      }
      return { vectors: ordered.map(entry => entry.embedding), usage: body.usage, call: meta(sent, 'embeddings', names.embedding, { model: body.model, usage: body.usage, parameters: dimensions ? { dimensions } : {} }) };
    },
  };
}
