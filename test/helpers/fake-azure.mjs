import { AzureRequestError } from '../../lib/azure.mjs';
import { mulberry32, sampleWeighted, gaussian } from '../../lib/media/random.mjs';
import { sentencePairs, bankProbe } from '../../lib/genai/embedding-lab.mjs';
import { buildScenes } from '../../lib/genai/vision-lab.mjs';
import { createCanvas, fillCircle, fillRect, canvasToPng, colors } from '../../lib/media/raster.mjs';
import { parseWav, encodeWav, concatSamples, silence, silenceRatio, estimatePitch } from '../../lib/media/wav.mjs';
import { speechIntervals } from '../../lib/genai/diarization-lab.mjs';
import { buildClips } from '../../lib/genai/video-lab.mjs';
import { truthPairs } from '../../lib/genai/judge-lab.mjs';

export const testConfig = { standardDeployment: 'gpt-4o', reasoningDeployment: 'gpt-5-mini', endpoint: 'https://example.invalid/' };
export const fakeNames = { image: 'gpt-image-1.5', speech: 'tts', transcription: 'whisper', diarization: 'gpt-4o-transcribe-diarize', embedding: 'text-embedding-3-small' };

export const fakeCall = (operation, deployment, extra = {}) => ({ operation, deployment, model: deployment, latencyMs: 7, attempts: 1, waitedMs: 0, ...extra });

const logprobTables = {
  capital: [['Paris', 0.992], ['The', 0.004], ['Par', 0.001], ['France', 0.0006], ['**', 0.0004]],
  number10: [['7', 0.9866], ['3', 0.006], ['5', 0.003], ['4', 0.001], ['8', 0.0005]],
  number100: [['47', 0.339], ['57', 0.205], ['37', 0.141], ['87', 0.125], ['73', 0.059], ['67', 0.04], ['42', 0.02], ['77', 0.015], ['27', 0.01], ['17', 0.006]],
  story: [['The', 0.237], ['Blink', 0.112], ['Wh', 0.068], ['S', 0.06], ['Cl', 0.053], ['In', 0.041], ['A', 0.03], ['Once', 0.03], ['Rust', 0.02], ['Be', 0.02]],
};

function tableFor(text) {
  return text.includes('capital') ? logprobTables.capital : /1 to 100/.test(text) ? logprobTables.number100 : /1 to 10\b/.test(text) ? logprobTables.number10 : logprobTables.story;
}

const hashSeed = text => [...text].reduce((hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0, 7);
const unit = vector => {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
};
const randomVector = (key, dimension = 1536) => {
  const random = mulberry32(hashSeed(key));
  return Array.from({ length: dimension }, () => gaussian(random));
};
const combine = (...parts) => parts.reduce((sum, [weight, vector]) => sum.map((value, i) => value + weight * vector[i]), new Array(parts[0][1].length).fill(0));

export function fakeVectorFor(input) {
  const index = sentencePairs.findIndex(pair => pair.en === input || pair.pl === input);
  if (index >= 0) {
    const pair = sentencePairs[index];
    return unit(combine([1, randomVector(`topic-${pair.topic}`)], [0.7, randomVector(`pair-${index}`)], [0.2, randomVector(pair.en === input ? 'english' : 'polish')], [0.05, randomVector(input)]));
  }
  if (input === bankProbe.query) return unit(combine([1, randomVector('bank-meaning')], [0.2, randomVector('q')]));
  const candidate = bankProbe.candidates.find(entry => entry.text === input);
  if (candidate?.id === 'trap') return unit(combine([0.3, randomVector('bank-meaning')], [1, randomVector('river')]));
  if (candidate?.id === 'paraphrase') return unit(combine([0.9, randomVector('bank-meaning')], [0.5, randomVector('lender')]));
  return unit(combine([0.8, randomVector('bank-meaning')], [0.6, randomVector('paycheck')]));
}

export function createFakeAzure(overrides = {}) {
  const random = mulberry32(2024);
  const fakeTokens = text => (text === 'a' ? 1 : Math.ceil(Buffer.byteLength(text) / 3));
  const scenes = buildScenes();
  const clips = buildClips();
  const spoken = [];
  return {
    names: fakeNames,
    async speech({ input, voice, speed = 1 }) {
      const rate = 24000;
      const f0 = { alloy: 190, onyx: 110, nova: 235 }[voice] ?? 150;
      const parts = [silence(0.15, rate)];
      for (const sentence of input.split(/(?<=[.?!])\s+/)) {
        const length = Math.round((sentence.length * 0.062 * rate) / speed);
        parts.push(Float32Array.from({ length }, (_, i) => {
          const t = i / rate;
          const gate = 0.35 + 0.65 * Math.abs(Math.sin(Math.PI * 3.5 * t));
          return gate * (0.5 * Math.sin(2 * Math.PI * f0 * t) + 0.3 * Math.sin(4 * Math.PI * f0 * t) + 0.15 * Math.sin(6 * Math.PI * f0 * t));
        }), silence(0.5 / speed, rate));
      }
      parts.push(silence(0.1, rate));
      const samples = concatSamples(parts);
      spoken.push({ input, duration: samples.length / rate });
      return { audio: encodeWav(samples, rate), call: fakeCall('audio.speech', 'tts', { usage: null, billedCharacters: input.length }) };
    },
    async transcribe({ audio }) {
      const parsed = parseWav(audio.data);
      const noisy = silenceRatio(parsed.samples, parsed.sampleRate) < 0.05;
      const match = spoken.reduce((best, entry) => (Math.abs(entry.duration - parsed.durationSeconds) < Math.abs(best.duration - parsed.durationSeconds) ? entry : best), spoken[0]);
      return {
        text: noisy ? 'Go back to bed and see you on Tuesday.' : match.input, language: 'english', duration: parsed.durationSeconds,
        segments: [{ avg_logprob: noisy ? -1.1 : -0.3, no_speech_prob: noisy ? 0.4 : 0.02, compression_ratio: 1.1 }],
        call: fakeCall('audio.transcriptions', 'whisper', { usage: null, audioSeconds: parsed.durationSeconds }),
      };
    },
    async diarize({ audio }) {
      const parsed = parseWav(audio.data);
      const centers = { alloy: 190, onyx: 110, nova: 235 };
      const order = [];
      const segments = speechIntervals(parsed.samples, parsed.sampleRate, { minGapSeconds: 0.35 }).map(interval => {
        const part = parsed.samples.subarray(Math.round(interval.start * parsed.sampleRate), Math.round(interval.end * parsed.sampleRate));
        const pitch = estimatePitch(part, parsed.sampleRate, { minHz: 70, maxHz: 350 }).medianHz ?? 150;
        const voice = Object.entries(centers).reduce((best, entry) => (Math.abs(entry[1] - pitch) < Math.abs(best[1] - pitch) ? entry : best))[0];
        if (!order.includes(voice)) order.push(voice);
        return { type: 'transcript.text.segment', speaker: 'ABC'[order.indexOf(voice)], start: interval.start + 0.03, end: interval.end, text: 'words' };
      });
      return { text: 'words', duration: parsed.durationSeconds, segments, call: fakeCall('audio.diarization', 'gpt-4o-transcribe-diarize', { usage: { input_tokens: 40, output_tokens: 100, total_tokens: 140 } }) };
    },
    async image({ prompt }) {
      const canvas = createCanvas(1024, 1024);
      const jitter = Math.floor(random() * 40);
      if (/red circle/.test(prompt)) {
        fillCircle(canvas, 250 + jitter, 500, 170, colors.red);
        fillRect(canvas, 600, 330 + jitter, 340, 340, colors.blue);
      } else {
        for (let i = 0; i < 40; i++) fillCircle(canvas, random() * 1024, random() * 1024, 40 + random() * 120, [Math.floor(random() * 255), Math.floor(random() * 255), Math.floor(random() * 255)]);
      }
      return { png: canvasToPng(canvas), usage: { input_tokens: 47, output_tokens: 423, output_tokens_details: { image_tokens: 272 }, total_tokens: 470 }, call: fakeCall('images.generate', 'gpt-image-1.5', { usage: { input_tokens: 47, output_tokens: 423, total_tokens: 470 } }) };
    },
    async chat(request) {
      const last = request.messages.at(-1).content;
      const text = typeof last === 'string' ? last : last.find(part => part.type === 'text')?.text ?? '';
      const system = request.messages[0].role === 'system' ? request.messages[0].content : '';
      const reply = (content, extra = {}) => ({
        choices: [{ message: { content }, finish_reason: 'stop' }], model: `${request.model}-fake`,
        usage: { prompt_tokens: 60, completion_tokens: 20, total_tokens: 80 }, call: fakeCall('chat.completions', request.model, { model: `${request.model}-fake` }), ...extra,
      });
      if (/strict grader/.test(system)) {
        const pair = truthPairs.find(entry => text.includes(entry.question));
        const slotOf = candidate => (text.indexOf(`Response 1: ${candidate}`) >= 0 ? '1' : '2');
        let winner;
        if (pair) winner = request.model === 'gpt-4o' && pair.id === 'train' ? slotOf(pair.wrong) : slotOf(pair.correct);
        else winner = /exactly one winner/.test(system) ? '1' : 'tie';
        return reply(JSON.stringify({ winner, reason: 'Because of the content.' }));
      }
      if (/Compose a simple, singable/.test(text)) {
        const valid = 'C4:2 D4:2 E4:2 F4:2 G4:4 E4:2 C4:2 D4:4 E4:2 D4:2 C4:4 C4:4';
        return { ...reply(''), choices: [valid, 'C4:4 E4:4 G4:4', 'C4:2 H9:2 E4:2 G4:2 C5:4 R:4 C4:4 D4:4 E4:4', valid, valid].map(content => ({ message: { content }, finish_reason: 'stop' })) };
      }
      const imageParts = Array.isArray(last) ? last.filter(part => part.type === 'image_url') : [];
      const imagePart = imageParts[0];
      if (imagePart) {
        const detail = imagePart.image_url.detail;
        const reasoning = request.model === 'gpt-5-mini';
        const perImage = detail === 'low' ? (reasoning ? 80 : 85) : (reasoning ? 300 : 700);
        const usage = { prompt_tokens: 20 + perImage * imageParts.length, completion_tokens: 20, total_tokens: 400, ...(reasoning ? { completion_tokens_details: { reasoning_tokens: 64 } } : {}) };
        const schema = request.response_format?.json_schema?.name;
        const twelve = imageParts.length === 12;
        const clipTruth = clips[twelve ? 'twelve' : 'six'].truth;
        const answer = schema === 'shape_counts' ? { ...scenes.shapes.truth, red_circles: scenes.shapes.truth.red_circles - 1 } :
          schema === 'chart_reading' ? { tallest_bar: 'B', value_of_c: 58 } :
            schema === 'codes' ? { large_code: 'R4X9', small_code: detail === 'low' ? 'MX75' : 'M7K2P5' } :
              schema === 'ball_motion' ? { direction: clipTruth.direction, crossing_frame: reasoning ? clipTruth.crossing_frame : clipTruth.crossing_frame - 1 } :
                schema === 'frame_order' ? { order: reasoning ? clips.shuffled.truth.order : [...clips.shuffled.truth.order].reverse().join('') } :
                  schema === 'rotation' ? { rotation: 'clockwise' } : null;
        return {
          choices: [{ message: { content: answer ? JSON.stringify(answer) : 'A red circle on the left and a blue square on the right.' }, finish_reason: 'stop' }],
          model: `${request.model}-fake`, usage, call: fakeCall('chat.completions', request.model, { model: `${request.model}-fake`, usage }),
        };
      }
      if (request.logprobs) {
        if (request.model === 'gpt-5-mini') throw new AzureRequestError(400, { code: 'unsupported_parameter', message: "Unsupported parameter: 'logprobs' is not supported with this model." });
        const top = tableFor(text);
        const padded = [...top, ...Array.from({ length: Math.max(0, 10 - top.length) }, (_, i) => [`tail${i}`, 0.00001])];
        const sampled = top[sampleWeighted(top.map(entry => entry[1]), random)][0];
        return {
          choices: [{ message: { content: sampled }, finish_reason: 'length', logprobs: { content: [{ token: sampled, top_logprobs: padded.slice(0, 10).map(([token, p]) => ({ token, logprob: Math.log(p) })) }] } }],
          model: 'gpt-4o-fake', usage: { prompt_tokens: 20, completion_tokens: 1, total_tokens: 21 }, call: fakeCall('chat.completions', request.model, { model: 'gpt-4o-fake' }),
        };
      }
      if (request.n > 1) {
        const top = tableFor(text);
        const weights = top.map(entry => entry[1] ** (1 / request.temperature));
        return {
          choices: Array.from({ length: request.n }, () => ({ message: { content: top[sampleWeighted(weights, random)][0] }, finish_reason: 'length' })),
          model: 'gpt-4o-fake', usage: { prompt_tokens: 20, completion_tokens: request.n, total_tokens: 20 + request.n }, call: fakeCall('chat.completions', request.model, { model: 'gpt-4o-fake' }),
        };
      }
      if (request.max_tokens === 1 || request.max_completion_tokens === 16) {
        const overhead = request.model === 'gpt-5-mini' ? 9 : 7;
        return {
          choices: [{ message: { content: '' }, finish_reason: 'length' }], model: `${request.model}-fake`,
          usage: { prompt_tokens: overhead + fakeTokens(text), completion_tokens: 1, total_tokens: overhead + fakeTokens(text) + 1 },
          call: fakeCall('chat.completions', request.model, { model: `${request.model}-fake` }),
        };
      }
      if (overrides.chat) return overrides.chat(request, text);
      throw new Error(`Fake Azure has no response for ${JSON.stringify(request).slice(0, 200)}`);
    },
    async embed(inputs, { dimensions } = {}) {
      const vectors = inputs.map(input => {
        const vector = fakeVectorFor(input);
        return dimensions ? unit(vector.slice(0, dimensions)) : vector;
      });
      return { vectors, usage: { prompt_tokens: inputs.length * 9, total_tokens: inputs.length * 9 }, call: fakeCall('embeddings', 'text-embedding-3-small', { model: 'text-embedding-3-small-fake', usage: { prompt_tokens: inputs.length * 9, total_tokens: inputs.length * 9 } }) };
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([name]) => name !== 'chat')),
  };
}
