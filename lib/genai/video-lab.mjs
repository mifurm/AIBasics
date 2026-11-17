import { buildRequest } from '../azure.mjs';
import { renderBallFrame, ballPositions, renderWheelFrame, contactSheet, crossingFrame, apparentWheelMotion } from '../media/scenes.mjs';
import { canvasToPng } from '../media/raster.mjs';
import { mulberry32, shuffled } from '../media/random.mjs';
import { sha256 } from './artifacts.mjs';
import { experimentResult, table, image, text } from './contract.mjs';

export const SHUFFLE_SEED = 77;
export const DENSE_DEGREES = 20;
export const SPARSE_DEGREES = 100;
const LETTERS = 'ABCDEF';
const strictSchema = (name, properties) => ({
  type: 'json_schema', json_schema: { name, strict: true, schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } },
});

const pngOf = canvas => canvasToPng(canvas);

export function buildClips() {
  const six = ballPositions(6, 'right_to_left');
  const twelve = ballPositions(12, 'right_to_left');
  const forward = ballPositions(6, 'left_to_right');
  const presentation = shuffled([0, 1, 2, 3, 4, 5], mulberry32(SHUFFLE_SEED));
  const shuffledFrames = presentation.map((chronological, index) => renderBallFrame(forward[chronological], LETTERS[index]));
  const chronologicalLetters = [0, 1, 2, 3, 4, 5].map(step => LETTERS[presentation.indexOf(step)]).join('');
  const wheel = degrees => Array.from({ length: 6 }, (_, i) => renderWheelFrame(i * degrees, `F${i + 1}`));
  const ball = (positions) => positions.map((x, i) => renderBallFrame(x, `F${i + 1}`));
  const clips = {
    six: { frames: ball(six), columns: 3, truth: { direction: 'right_to_left', crossing_frame: crossingFrame(six, 'right_to_left') } },
    twelve: { frames: ball(twelve), columns: 4, truth: { direction: 'right_to_left', crossing_frame: crossingFrame(twelve, 'right_to_left') } },
    shuffled: { frames: shuffledFrames, columns: 3, truth: { order: chronologicalLetters } },
    'wheel-dense': { frames: wheel(DENSE_DEGREES), columns: 3, truth: { generated: 'clockwise', apparent: apparentWheelMotion(DENSE_DEGREES).direction, degreesPerFrame: DENSE_DEGREES } },
    'wheel-sparse': { frames: wheel(SPARSE_DEGREES), columns: 3, truth: { generated: 'clockwise', apparent: apparentWheelMotion(SPARSE_DEGREES).direction, degreesPerFrame: SPARSE_DEGREES } },
  };
  for (const clip of Object.values(clips)) {
    const sheet = contactSheet(clip.frames, clip.columns);
    clip.sheet = pngOf(sheet);
    // PNG bytes can differ between zlib builds, so reproducibility is proven with a hash of the drawn pixels.
    clip.sheetPixelSha256 = sha256(Buffer.from(sheet.data));
    clip.pngs = clip.frames.map(pngOf);
  }
  return clips;
}

export function wheelNote(degrees) {
  const apparent = apparentWheelMotion(degrees);
  const looks = apparent.direction === 'stationary' ? 'a wheel that is not turning at all' :
    apparent.direction === 'ambiguous' ? 'a wheel turning either way (clockwise and counterclockwise look identical)' :
      `a wheel turning ${Math.abs(apparent.step)} degrees ${apparent.direction} per frame`;
  return `Generated at ${degrees} degrees clockwise per frame. The spokes repeat every 120 degrees, so these frames ${degrees < 60 ? 'show the true motion' : `are identical to ${looks}`}.`;
}

export function kendallScore(order, truth) {
  let concordant = 0;
  let pairs = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pairs++;
      if (truth.indexOf(order[i]) < truth.indexOf(order[j])) concordant++;
    }
  }
  return pairs ? concordant / pairs : 0;
}

const ballPrompt = n => `These ${n} frames come from a short video, shown in time order and labelled F1 to F${n}. A dashed vertical line marks the center of every frame. Return JSON with direction (the ball's overall direction: left_to_right, right_to_left, or stationary) and crossing_frame (the number of the first frame in which the center of the ball is already past the dashed line, in the direction the ball travels).`;
const variants = [
  {
    id: 'six', label: 'Six frames, in order: which way does the ball go?', prompt: ballPrompt(6), frames: 6,
    format: strictSchema('ball_motion', { direction: { type: 'string', enum: ['left_to_right', 'right_to_left', 'stationary'] }, crossing_frame: { type: 'integer' } }),
    score: (answer, truth) => [
      { field: 'direction', truth: truth.direction, answer: answer?.direction ?? null, correct: answer?.direction === truth.direction },
      { field: 'crossing_frame', truth: truth.crossing_frame, answer: answer?.crossing_frame ?? null, correct: answer?.crossing_frame === truth.crossing_frame },
    ],
  },
  {
    id: 'twelve', label: 'Twelve frames of the same motion: more frames, more tokens', prompt: ballPrompt(12), frames: 12,
    format: strictSchema('ball_motion', { direction: { type: 'string', enum: ['left_to_right', 'right_to_left', 'stationary'] }, crossing_frame: { type: 'integer' } }),
    score: (answer, truth) => [
      { field: 'direction', truth: truth.direction, answer: answer?.direction ?? null, correct: answer?.direction === truth.direction },
      { field: 'crossing_frame', truth: truth.crossing_frame, answer: answer?.crossing_frame ?? null, correct: answer?.crossing_frame === truth.crossing_frame },
    ],
  },
  {
    id: 'shuffled', label: 'Six shuffled frames: restore the order', frames: 6,
    prompt: 'These six frames come from a short video but are shuffled and labelled A to F. In the original video a ball rolls steadily from the left edge toward the right edge. Return JSON with order: the six letters in the order the frames happened, earliest first, using each letter exactly once (for example "CAFBED").',
    format: strictSchema('frame_order', { order: { type: 'string' } }),
    score: (answer, truth) => {
      const given = String(answer?.order ?? '').toUpperCase().replace(/[^A-F]/g, '');
      return [
        { field: 'exact order', truth: truth.order, answer: given || null, correct: given === truth.order },
        { field: 'letters in the right position', truth: 6, answer: [...given].filter((letter, i) => letter === truth.order[i]).length, correct: given === truth.order },
        { field: 'pairs in the right order (of 15)', truth: 15, answer: given.length === 6 && new Set(given).size === 6 ? Math.round(15 * kendallScore(given, truth.order)) : null, correct: given === truth.order },
      ];
    },
  },
  ...[['wheel-dense', 'A wheel turning slowly between frames'], ['wheel-sparse', 'The same wheel sampled too sparsely']].map(([id, label]) => ({
    id, label, frames: 6,
    prompt: 'These six frames are consecutive samples from a video of a spinning wheel with three identical spokes, shown in time order and labelled F1 to F6. Return JSON with rotation: clockwise, counterclockwise, or unclear.',
    format: strictSchema('rotation', { rotation: { type: 'string', enum: ['clockwise', 'counterclockwise', 'unclear'] } }),
    score: (answer, truth) => {
      // Frames that show no single direction (stationary or ambiguous) can only be answered honestly with "unclear".
      const shown = ['stationary', 'ambiguous'].includes(truth.apparent) ? 'unclear' : truth.apparent;
      return [
        { field: 'matches how we generated it', truth: truth.generated, answer: answer?.rotation ?? null, correct: answer?.rotation === truth.generated },
        { field: 'matches what the frames show', truth: shown, answer: answer?.rotation ?? null, correct: answer?.rotation === shown },
      ];
    },
  })),
];

const models = [{ key: 'standard', label: 'GPT-4o' }, { key: 'reasoning', label: 'GPT-5-mini' }];
const sheetNotes = {
  six: 'The ball moves from right to left across six frames.', twelve: 'The same right-to-left motion, sampled twice as densely.',
  shuffled: 'Frames are shuffled; the letters carry no time information.',
  'wheel-dense': wheelNote(DENSE_DEGREES),
  'wheel-sparse': wheelNote(SPARSE_DEGREES),
};

export const videoLab = {
  id: '37-video-frames', title: 'Video is frames over time', minutes: 12, series: 'genai',
  concept: 'A video model sees a video as a short list of still frames. How many frames you sample decides what it can know about motion and how many tokens you pay. Sample too sparsely and the video can be genuinely ambiguous, no matter how smart the model is.',
  question: 'Which questions about motion can be answered from a handful of frames, and which are impossible no matter how good the model is?',
  caveat: 'The video is drawn by our own code, so the right answers are exact, but there are only five tiny clips and one run per model. Azure\'s only video-generation model (Sora 2) passed its retirement date on 2026-11-02, so this lab studies video understanding from frames, not video generation.',
  exercise: 'Change SPARSE_DEGREES in lib/genai/video-lab.mjs from 100 to 60, then predict what the three-spoke wheel will look like (at exactly 60 degrees clockwise and counterclockwise are identical; at 120 it looks stationary) before you redeploy.',
  cases: variants.map(variant => ({ label: variant.label, experiment: true })),
  async run(ctx) {
    const clips = buildClips();
    const tokensBy = {};
    for (const variant of variants) {
      const started = performance.now();
      const clip = clips[variant.id];
      const sheet = ctx.artifacts.add({ id: `${variant.id}-frames`, extension: 'png', data: clip.sheet, description: `${variant.label}: the ${variant.frames} frames sent to the models, in the order sent. ${sheetNotes[variant.id]}` });
      const calls = [];
      const answers = [];
      for (const model of models) {
        const content = [{ type: 'text', text: variant.prompt }, ...clip.pngs.map(png => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}`, detail: 'low' } }))];
        const request = buildRequest({ model: model.key, messages: [{ role: 'user', content }], parameters: { response_format: variant.format, ...(model.key === 'standard' ? { temperature: 0 } : {}) } }, ctx.config);
        const response = await ctx.azure.chat(request);
        calls.push(response.call);
        let answer = null;
        let parseError = null;
        try { answer = JSON.parse(response.choices[0].message.content); } catch (error) { parseError = error.message; }
        const rows = variant.score(answer, clip.truth);
        answers.push({ model: model.label, answer, parseError, rows, correct: rows.filter(row => row.correct).length, promptTokens: response.usage.prompt_tokens, completionTokens: response.usage.completion_tokens, reasoningTokens: response.usage.completion_tokens_details?.reasoning_tokens ?? null, latencyMs: response.call.latencyMs });
        tokensBy[`${variant.id}:${model.label}`] = response.usage.prompt_tokens;
      }
      const growth = variant.id === 'twelve' ? models.map(model => `${model.label}: ${tokensBy[`six:${model.label}`]} input tokens for 6 frames, ${tokensBy[`twelve:${model.label}`]} for 12`).join('; ') : null;
      ctx.addResult(experimentResult({
        label: variant.label, startedAt: started, calls, artifacts: [sheet],
        summary: `Prompt: "${variant.prompt}" Each model received the ${variant.frames} frames as separate images (detail "low") plus this text, with a strict JSON schema.`,
        parameters: { prompt: variant.prompt, frames: variant.frames, detail: 'low', sheetSha256: sheet.sha256 },
        output: answers.map(entry => `${entry.model}: ${entry.rows.map(row => `${row.field}: ${row.answer} (truth ${row.truth})`).join('; ')}. ${entry.promptTokens} input tokens for ${variant.frames} frames.`).join('\n') + (growth ? `\n${growth}.` : ''),
        measurements: { variant: variant.id, frames: variant.frames, truth: clip.truth, sheetSha256: sheet.sha256, sheetPixelSha256: clip.sheetPixelSha256, answers, tokenGrowth: growth ? models.map(model => ({ model: model.label, six: tokensBy[`six:${model.label}`], twelve: tokensBy[`twelve:${model.label}`] })) : null },
        display: [
          image(sheet, `The frames in the order sent. ${sheetNotes[variant.id]}`, `Contact sheet of ${variant.frames} frames: ${variant.label}`),
          table('Ground truth versus each model', ['Field', 'Truth', ...answers.flatMap(entry => [entry.model, 'Correct?'])],
            answers[0].rows.map((row, index) => [row.field, row.truth, ...answers.flatMap(entry => [entry.rows[index].answer, entry.rows[index].correct ? 'yes' : 'NO'])])),
          table('What the frames cost', ['Model', 'Frames', 'Input tokens', 'Input tokens per frame', 'Output tokens', 'Reasoning tokens', 'Latency (ms)'],
            answers.map(entry => [entry.model, variant.frames, entry.promptTokens, Number((entry.promptTokens / variant.frames).toFixed(1)), entry.completionTokens, entry.reasoningTokens ?? 'not reported', entry.latencyMs])),
          ...(growth ? [text(`More frames cost more input tokens, roughly in proportion. ${growth}.`)] : []),
          ...(variant.id === 'wheel-sparse' ? [text(`Aliasing: ${wheelNote(SPARSE_DEGREES)} The frames alone cannot say which happened. An answer of "clockwise" matches how we generated the clip but is not supported by the frames, and "${apparentWheelMotion(SPARSE_DEGREES).direction}" is what the frames literally show. Compare the answers above with the slowly turning wheel: if a model also errs there, its answers are weak evidence either way. The fix is a higher frame rate, not a bigger model.`)] : []),
        ],
      }));
    }
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const clips = buildClips();
    const byId = Object.fromEntries(results.map(result => [result.measurements.variant, result]));
    const tokens = (id, model) => byId[id].measurements.answers.find(entry => entry.model === model).promptTokens;
    const shuffledTruth = clips.shuffled.truth.order;
    return [
      check('Every clip is redrawn pixel-for-pixel, so the ground truth is exact', results.length === 5 && results.every(result => result.measurements.sheetPixelSha256 === clips[result.measurements.variant].sheetPixelSha256), 'Seeded drawing reproduces the pixel hash of all five recorded contact sheets.'),
      check('Every model returned parseable JSON for every clip', results.every(result => result.measurements.answers.length === 2 && result.measurements.answers.every(entry => entry.answer && !entry.parseError)), '10 of 10 answers parsed against the strict schema.'),
      check('More frames cost more input tokens', tokens('twelve', 'GPT-4o') > tokens('six', 'GPT-4o') && tokens('twelve', 'GPT-5-mini') > tokens('six', 'GPT-5-mini'),
        `GPT-4o ${tokens('six', 'GPT-4o')} to ${tokens('twelve', 'GPT-4o')}; GPT-5-mini ${tokens('six', 'GPT-5-mini')} to ${tokens('twelve', 'GPT-5-mini')}.`),
      check('The shuffled clip really is shuffled', shuffledTruth.length === 6 && new Set(shuffledTruth).size === 6 && shuffledTruth !== 'ABCDEF', `Chronological order of the lettered frames: ${shuffledTruth}.`),
      check('The sparse wheel really is aliased while the dense wheel is not', clips['wheel-sparse'].truth.apparent !== clips['wheel-sparse'].truth.generated && clips['wheel-dense'].truth.apparent === clips['wheel-dense'].truth.generated,
        `Sparse: generated ${clips['wheel-sparse'].truth.generated}, frames show ${clips['wheel-sparse'].truth.apparent}.`),
      check('Correctness is reported per field for both models', results.every(result => result.measurements.answers.every(entry => entry.rows.every(row => typeof row.correct === 'boolean'))),
        results.map(result => `${result.measurements.variant}: ${result.measurements.answers.map(entry => `${entry.model} ${entry.correct}/${entry.rows.length}`).join(', ')}`).join('; ')),
    ];
  },
};
