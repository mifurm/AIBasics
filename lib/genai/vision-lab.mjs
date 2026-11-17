import { buildRequest } from '../azure.mjs';
import { renderShapesScene, renderBarChart, renderTextSample } from '../media/scenes.mjs';
import { canvasToPng } from '../media/raster.mjs';
import { sha256 } from './artifacts.mjs';
import { experimentResult, table, image, text } from './contract.mjs';

export const SHAPES_SEED = 2024;
export const SHAPES_SPEC = { redCircles: 6, blueSquares: 4, greenTriangles: 4, blueCircles: 3, redSquares: 2 };
export const CHART_VALUES = [['A', 35], ['B', 80], ['C', 55], ['D', 20]];
export const CODES = { large: 'R4X9', small: 'M7K2P5' };

export function buildScenes() {
  const shapes = renderShapesScene(SHAPES_SEED, SHAPES_SPEC);
  const chart = renderBarChart(CHART_VALUES);
  const codes = renderTextSample(CODES.large, CODES.small);
  // Pixel hashes prove the drawing is reproducible; PNG bytes can differ between zlib builds.
  const entry = (scene, truth) => ({ png: canvasToPng(scene.canvas), pixelSha256: sha256(Buffer.from(scene.canvas.data)), truth });
  return { shapes: entry(shapes, shapes.truth), chart: entry(chart, chart.truth), text: entry(codes, codes.truth) };
}

const strictSchema = (name, properties) => ({
  type: 'json_schema', json_schema: { name, strict: true, schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } },
});

export const visionTasks = [
  {
    id: 'shapes', scene: 'shapes', detail: 'high', label: 'Count colored shapes',
    prompt: 'Count the shapes in this image. Count only shapes that match both the stated color and the stated shape exactly. Return JSON with integer fields red_circles, blue_squares and green_triangles.',
    format: strictSchema('shape_counts', { red_circles: { type: 'integer' }, blue_squares: { type: 'integer' }, green_triangles: { type: 'integer' } }),
    score: (answer, truth) => Object.keys(truth).map(field => ({ field, truth: truth[field], answer: answer?.[field] ?? null, correct: answer?.[field] === truth[field] })),
  },
  {
    id: 'chart', scene: 'chart', detail: 'high', label: 'Read a bar chart',
    prompt: 'This bar chart has four bars labelled A, B, C and D and a vertical axis from 0 to 100. Return JSON with tallest_bar (the label of the tallest bar) and value_of_c (your best estimate of bar C, as a number).',
    format: strictSchema('chart_reading', { tallest_bar: { type: 'string', enum: ['A', 'B', 'C', 'D'] }, value_of_c: { type: 'number' } }),
    score: (answer, truth) => [
      { field: 'tallest_bar', truth: truth.tallest_bar, answer: answer?.tallest_bar ?? null, correct: answer?.tallest_bar === truth.tallest_bar },
      { field: 'value_of_c (within 5)', truth: truth.values.C, answer: answer?.value_of_c ?? null, correct: Number.isFinite(answer?.value_of_c) && Math.abs(answer.value_of_c - truth.values.C) <= 5 },
    ],
  },
  ...['low', 'high'].map(detail => ({
    id: `text-${detail}`, scene: 'text', detail, label: `Read a large and a tiny code (${detail} image detail)`,
    prompt: 'This image contains two codes made of capital letters and digits: one large and one very small. Return JSON with large_code and small_code, using exactly the characters shown.',
    format: strictSchema('codes', { large_code: { type: 'string' }, small_code: { type: 'string' } }),
    score: (answer, truth) => Object.keys(truth).map(field => ({ field, truth: truth[field], answer: answer?.[field] ?? null, correct: String(answer?.[field] ?? '').replace(/\s/g, '').toUpperCase() === truth[field] })),
  })),
];

const models = [{ key: 'standard', label: 'GPT-4o' }, { key: 'reasoning', label: 'GPT-5-mini' }];
const sceneArtifacts = { shapes: ['shapes-scene', 'A seeded scene with six red circles, four blue squares, four green triangles, and distractor blue circles and red squares.'], chart: ['bar-chart', 'A bar chart with four bars labelled A to D on a 0 to 100 axis.'], text: ['text-sample', 'A 1024 by 1024 image with one large code and one very small code whose letters are 7 pixels tall.'] };

export const visionLab = {
  id: '33-vision', title: 'What a vision model sees', minutes: 12, series: 'genai',
  concept: 'A vision model turns an image into tokens before it reasons about it. Because we draw the images ourselves, we know the right answers exactly and can measure where models miscount, misread, or lose tiny detail. Images cost tokens too.',
  question: 'Which kind of visual question was easy, which went wrong, and does paying for more image detail fix it?',
  caveat: 'These are three synthetic images and one run per model, not a benchmark. A model can be right by luck and wrong on the next run. Counting many similar objects and reading tiny text are known weak spots; real photographs behave differently.',
  exercise: 'Change SHAPES_SPEC in lib/genai/vision-lab.mjs to add more distractors, redeploy, and watch the counts change.',
  cases: visionTasks.map(task => ({ label: task.label, experiment: true })),
  async run(ctx) {
    const scenes = buildScenes();
    const refs = {};
    for (const [scene, [id, description]] of Object.entries(sceneArtifacts)) refs[scene] = ctx.artifacts.add({ id, extension: 'png', data: scenes[scene].png, description });
    for (const task of visionTasks) {
      const started = performance.now();
      const scene = scenes[task.scene];
      const calls = [];
      const answers = [];
      for (const model of models) {
        const request = buildRequest({
          model: model.key,
          messages: [{ role: 'user', content: [{ type: 'text', text: task.prompt }, { type: 'image_url', image_url: { url: `data:image/png;base64,${scene.png.toString('base64')}`, detail: task.detail } }] }],
          parameters: { response_format: task.format, ...(model.key === 'standard' ? { temperature: 0 } : {}) },
        }, ctx.config);
        const response = await ctx.azure.chat(request);
        calls.push(response.call);
        let answer = null;
        let parseError = null;
        try { answer = JSON.parse(response.choices[0].message.content); } catch (error) { parseError = error.message; }
        const rows = task.score(answer, scene.truth);
        answers.push({
          model: model.label, actualModel: response.model, answer, parseError, rows, correct: rows.filter(row => row.correct).length,
          promptTokens: response.usage.prompt_tokens, completionTokens: response.usage.completion_tokens, reasoningTokens: response.usage.completion_tokens_details?.reasoning_tokens ?? null, latencyMs: response.call.latencyMs,
        });
      }
      ctx.addResult(experimentResult({
        label: task.label, startedAt: started, calls, artifacts: [refs[task.scene]],
        summary: `Prompt: "${task.prompt}" The same image (${refs[task.scene].sha256.slice(0, 12)}...) was sent to both models with image detail "${task.detail}" and a strict JSON schema.`,
        parameters: { prompt: task.prompt, detail: task.detail, imageSha256: refs[task.scene].sha256 },
        output: answers.map(entry => `${entry.model}: ${entry.correct}/${entry.rows.length} correct. ${entry.rows.map(row => `${row.field} ${row.answer} (truth ${row.truth}) ${row.correct ? 'OK' : 'WRONG'}`).join('; ')}. ${entry.promptTokens} input tokens.`).join('\n'),
        measurements: { task: task.id, detail: task.detail, truth: scene.truth, imageSha256: refs[task.scene].sha256, pixelSha256: scene.pixelSha256, answers },
        display: [
          image(refs[task.scene], 'The exact image sent to both models.', task.label),
          table('Ground truth versus each model', ['Field', 'Truth', ...answers.flatMap(entry => [entry.model, 'Correct?'])],
            answers[0].rows.map((row, index) => [row.field, row.truth, ...answers.flatMap(entry => [entry.rows[index].answer, entry.rows[index].correct ? 'yes' : 'NO'])])),
          table('What the image cost', ['Model', 'Image detail', 'Input tokens (image + text)', 'Output tokens', 'Reasoning tokens', 'Latency (ms)'],
            answers.map(entry => [entry.model, task.detail, entry.promptTokens, entry.completionTokens, entry.reasoningTokens ?? 'not reported', entry.latencyMs])),
          text('We drew this image, so the truth is exact. A wrong answer here is a real error, not a matter of opinion.'),
        ],
      }));
    }
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const scenes = buildScenes();
    const byTask = Object.fromEntries(results.map(result => [result.measurements.task, result]));
    const tokens = (taskId, model) => byTask[taskId].measurements.answers.find(entry => entry.model === model)?.promptTokens;
    return [
      check('Images are redrawn pixel-for-pixel, so the ground truth is exact', results.every(result => result.measurements.pixelSha256 === scenes[visionTasks.find(task => task.id === result.measurements.task).scene].pixelSha256) &&
        JSON.stringify(scenes.shapes.truth) === JSON.stringify(byTask.shapes.measurements.truth), 'Seeded drawing reproduces every recorded pixel hash and shape count.'),
      check('Every model returned parseable JSON for every task', results.every(result => result.measurements.answers.length === 2 && result.measurements.answers.every(entry => entry.answer && !entry.parseError)), '8 of 8 answers parsed against the strict schema.'),
      check('Both models saw identical images and prompts', results.every(result => result.apiCalls.length === 2), 'One request per model per task, same image and wording.'),
      check('Low image detail costs fewer input tokens than high detail', tokens('text-low', 'GPT-4o') < tokens('text-high', 'GPT-4o'), `GPT-4o: ${tokens('text-low', 'GPT-4o')} (low) versus ${tokens('text-high', 'GPT-4o')} (high) input tokens for the same image.`),
      check('Correctness is reported per field, not summarized away', results.every(result => result.measurements.answers.every(entry => entry.rows.every(row => typeof row.correct === 'boolean'))),
        results.map(result => `${result.measurements.task}: ${result.measurements.answers.map(entry => `${entry.model} ${entry.correct}/${entry.rows.length}`).join(', ')}`).join('; ')),
    ];
  },
};
