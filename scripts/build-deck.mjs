import pptxgen from 'pptxgenjs';
import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { labs } from '../lib/labs.mjs';
import { loadConfig } from '../lib/azure.mjs';

const { values } = parseArgs({ options: {
  'media-directory': { type: 'string' },
  'allow-missing-recordings': { type: 'boolean', default: false },
} });
if (!values['media-directory'] && !values['allow-missing-recordings']) throw new Error(`Provide --media-directory with ${labs.length} actual MP4 recordings, or explicitly --allow-missing-recordings for a draft.`);
const mediaDirectory = values['media-directory'] ? path.resolve(values['media-directory']) : null;
const config = await loadConfig();
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'AI Basics classroom';
pptx.subject = 'Beginner prompt engineering with real Azure outcomes';
pptx.title = `AI Basics - ${labs.length} Classroom Labs`;
pptx.company = 'Classroom teaching kit';
pptx.lang = 'en-GB';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-GB' };
const C = { ink: '152C40', navy: '112B43', teal: '19777B', pale: 'DEF2ED', white: 'FFFFFF', gray: '526C7E' };

let slideCount = 0;
function slide(title, kicker = 'AI BASICS | CLASSROOM LABS') {
  const s = pptx.addSlide();
  s.background = { color: 'F2F5F8' };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText(kicker, { x: 0.5, y: 0.36, w: 12.3, h: 0.25, fontFace: 'Aptos', fontSize: 10, bold: true, color: C.teal, charSpacing: 2 });
  s.addText(title, { x: 0.5, y: 0.84, w: 12.3, h: 0.55, fontSize: 28, bold: true, color: C.ink, breakLine: false });
  s.addText('Real observations, not guarantees. Only fictional classroom data.', { x: 0.5, y: 7.04, w: 11.7, h: 0.22, fontSize: 9, color: C.gray });
  s.addText(String(++slideCount), { x: 12.3, y: 7.04, w: 0.45, h: 0.22, fontSize: 9, color: C.gray, align: 'right' });
  return s;
}
function body(s, text, x, y, w, h, fontSize = 20) {
  s.addText(text, { x, y, w, h, fontSize, color: C.ink, margin: 0, valign: 'top', breakLine: false });
}
function link(s, text, url, x, y, w = 7) {
  s.addText(text, { x, y, w, h: 0.34, fontSize: 13, color: C.teal, underline: true, hyperlink: { url } });
}

{
  const s = slide(`AI Basics: ${labs.length} small experiments`, 'A BEGINNER\'S FIELD GUIDE');
  body(s, 'Prompt clearly.\nSupply context.\nMeasure the outcome.\nCheck before trusting.', 0.6, 1.8, 7.3, 3.7, 33);
  s.addShape(pptx.ShapeType.roundRect, { x: 8.5, y: 1.8, w: 4.1, h: 3.7, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText(`${labs.length} LABS\nCHAT + REASONING\n+ EMBEDDINGS`, { x: 8.8, y: 2.4, w: 3.5, h: 2.3, fontSize: 24, bold: true, color: C.white, align: 'center', valign: 'mid' });
  link(s, 'Open the deployed teaching gallery', config.website, 0.6, 6.15);
  s.addNotes('Audience: beginners. Split into five lessons: prompting; reliable outputs and tools; memory; agent loops; safe and testable execution. Ask students to predict the result before showing it. The browser displays saved Azure API results; videos, when available, do not claim to show live inference.');
}
{
  const s = slide('How does a language model produce an answer?');
  const boxes = ['TEXT\nSplit into tokens', 'CONTEXT\nAttend to supplied tokens', 'PREDICT\nScore next-token choices', 'DECODE\nChoose, append, repeat'];
  boxes.forEach((text, i) => {
    const x = 0.55 + i * 3.2;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 2.75, h: 1.6, fill: { color: i === 3 ? C.navy : C.pale }, line: { color: C.teal } });
    s.addText(text, { x: x + 0.16, y: 2.28, w: 2.43, h: 1.1, fontSize: 19, color: i === 3 ? C.white : C.ink, align: 'center', valign: 'mid' });
    if (i < 3) s.addText('>', { x: x + 2.85, y: 2.5, w: 0.3, h: 0.5, fontSize: 27, color: C.teal });
  });
  body(s, 'Training changes network weights. Prompting supplies context.\nThe model is not a search engine, a database, or a calculator by default.\nA fluent answer can still be wrong.', 0.7, 4.25, 11.9, 2.0, 23);
  s.addNotes('This is a simplified autoregressive language-model explanation, not a claim to reveal internal computations. Modern systems add retrieval, tools, and reasoning. Next-token prediction can produce powerful learned capabilities, but it does not guarantee truth.');
}
{
  const s = slide('The basic knobs - and what they cannot do');
  body(s, 'PROMPT / ROLES\nTask, audience, constraints, format', 0.7, 1.85, 5.8, 1.0);
  body(s, 'CONTEXT\nRelevant facts and explicitly sent history', 6.9, 1.85, 5.6, 1.0);
  body(s, 'TEMPERATURE / TOP-P\nControl sampling, not intelligence', 0.7, 3.3, 5.8, 1.0);
  body(s, 'OUTPUT TOKEN LIMIT\nCan truncate; does not cap total dollars', 6.9, 3.3, 5.6, 1.0);
  body(s, 'Different models support different parameters.\nReasoning tokens can cost money even when the visible answer is short.', 0.7, 5.05, 11.9, 1.3, 22);
}
{
  const s = slide('Predict, run, inspect, discuss');
  const split = Math.ceil(labs.length / 2);
  body(s, labs.slice(0, split).map(lab => `${lab.id.slice(0, 2)}  ${lab.title}`).join('\n'), 0.7, 1.8, 5.9, 4.9, 16);
  body(s, labs.slice(split).map(lab => `${lab.id.slice(0, 2)}  ${lab.title}`).join('\n'), 6.9, 1.8, 5.8, 4.9, 16);
  s.addNotes('For every lab: predict before the video, inspect actual prompts and output, discuss the caution, then change one variable. The gallery includes a retained failed citation attempt and an Azure-blocked request.');
}
const report = [
  '# Actual Azure teaching outcomes', '',
  `Gallery: ${config.website}`, '',
  mediaDirectory ? 'Videos show saved actual API outputs, not a live request reenactment. Failed and blocked outcomes are retained.' :
    'Recording is pending: the integrated browser remained hidden and the user was unavailable to reveal it. No videos were fabricated. The draft deck contains actual text outcomes and gallery links.', '',
  '| Lab | Status | Requests represented | Total tokens reported |', '| --- | --- | ---: | ---: |',
];
let totalTokens = 0;
let representedRequests = 0;
const detailed = [];
for (let i = 0; i < labs.length; i++) {
  const lab = labs[i];
  const record = JSON.parse(await readFile(`results/${lab.id}.json`, 'utf8'));
  const media = mediaDirectory ? path.join(mediaDirectory, `${lab.id}.mp4`) : null;
  if (media && (await stat(media)).size === 0) throw new Error(`Empty recording: ${media}`);
  const tokens = record.results.reduce((sum, result) => sum + (result.usage?.total_tokens ?? 0) + (result.toolRequestUsage?.total_tokens ?? 0) +
    (result.extraRequests ?? []).reduce((extraSum, entry) => extraSum + entry.usage.total_tokens, 0), 0);
  const requests = record.results.reduce((sum, result) => sum +
    (result.kind === 'computation' ? 0 : (result.toolTrace ? 2 : 1) + (result.extraRequests?.length ?? 0)), 0);
  totalTokens += tokens;
  representedRequests += requests;
  report.push(`| ${lab.id.slice(0, 2)}. ${lab.title} | ${record.status ?? 'completed'} | ${requests} | ${tokens}${record.status === 'blocked' ? ' (usage not reported)' : ''} |`);
  const s = slide(lab.title, `LAB ${lab.id.slice(0, 2)} | ${lab.minutes} MINUTES`);
  body(s, lab.concept, 0.6, 1.7, 3.5, 1.3, 18);
  body(s, `ASK THE CLASS\n${lab.question}`, 0.6, 3.25, 3.5, 1.4, 16);
  body(s, `CAUTION\n${lab.caveat}`, 0.6, 4.8, 3.5, 1.7, 13);
  if (media) {
    s.addMedia({ type: 'video', path: media, x: 4.5, y: 1.7, w: 8.2, h: 4.61 });
    link(s, 'Watch recording in browser', `${config.website}recordings/${lab.id}.mp4`, 4.5, 6.5, 3.8);
  } else if (lab.modelComparison) {
    body(s, 'SAME BROAD EXPLANATION PROMPT', 4.5, 1.7, 8.2, 0.4, 14);
    record.results.slice(0, 2).forEach((result, offset) => {
      const x = 4.5 + offset * 4.2;
      s.addShape(pptx.ShapeType.roundRect, { x, y: 2.2, w: 4.0, h: 3.9, fill: { color: C.white }, line: { color: 'D5E0E7' } });
      body(s, result.comparison.modelLabel, x + 0.15, 2.4, 3.7, 0.35, 18);
      body(s, result.output.length > 320 ? `${result.output.slice(0, 320)}\n[Excerpt; full output in gallery]` : result.output,
        x + 0.15, 3.0, 3.7, 2.25, 13);
      body(s, `${result.latencyMs} ms | ${result.usage.total_tokens} tokens`, x + 0.15, 5.55, 3.7, 0.35, 12);
    });
  } else {
    s.addShape(pptx.ShapeType.roundRect, { x: 4.5, y: 1.7, w: 8.2, h: 4.61, fill: { color: C.white }, line: { color: 'D5E0E7' } });
    const last = record.results.at(-1);
    body(s, last.kind === 'computation' ? 'MEASURED TEACHING-MODEL COMPUTATION' : 'ACTUAL AZURE OUTCOME', 4.8, 1.95, 7.6, 0.4, 14);
    body(s, last.status === 'blocked' ? `HTTP ${last.error.status}: ${last.error.code}\nNo model answer was generated.\nThe second variant was not executed.` :
      last.output.length > 650 ? `${last.output.slice(0, 650)}\n[Excerpt: full output in the gallery]` : last.output,
      4.8, 2.55, 7.6, 2.9, 16);
    body(s, 'Recording pending: integrated browser was hidden and the user was unavailable to reveal it.', 4.8, 5.65, 7.6, 0.48, 11);
  }
  if (lab.diagram) link(s, 'Open the transformer architecture', `${config.website}${lab.diagram}`, 0.6, 6.5, 3.8);
  link(s, 'Explore prompts and all outputs', `${config.website}#${lab.id}`, 8.55, 6.5, 4.15);
  s.addNotes([
    `Run: node labs/${lab.id}/demo.mjs`, `Try it: ${lab.exercise}`,
    `Recorded: ${record.recordedAt}. Status: ${record.status ?? 'completed'}.`,
    lab.id === '09-grounding' ? 'First attempt omitted the citation and failed evaluation; retained separately and in the gallery. When recorded, the video includes that actual first attempt alongside the refined result.' : '',
    record.status === 'blocked' ? 'Azure returned HTTP 400 content_filter; no model completion and no second variant. No filter bypass attempted.' : '',
    ...record.results.map(result => result.status === 'blocked' ? result.error.message :
      `${result.label}: ${result.actualModel}; ${result.latencyMs} ms; ${result.kind === 'computation' ? 'no model API requests' : `${result.usage.total_tokens} API tokens`}. Actual output:\n${result.output}`),
  ].filter(Boolean).join('\n\n'));
  detailed.push(`\n## ${lab.id.slice(0, 2)}. ${lab.title}\n\n${lab.concept}\n\nRecorded: ${record.recordedAt}\n\nCaution: ${lab.caveat}\n`);
  for (const result of record.results) {
    detailed.push(`\n### ${result.label}\n`);
    if (result.status === 'blocked') {
      detailed.push(`\n**Blocked**: ${result.error.message}\n\nNo completion was generated. Remaining variants were not executed.\n`);
    } else {
      detailed.push(`\nModel: ${result.actualModel}; latency: ${result.latencyMs} ms; finish: ${result.finishReason}.\n\n` +
        (result.kind === 'computation' ? 'No model API requests. Toy training tokens are not API billing tokens.\n' : `Usage: \`${JSON.stringify(result.usage)}\`\n`) +
        `\n\`\`\`text\n${result.output}\n\`\`\`\n`);
      if (result.toolTrace) detailed.push(`\nTool trace: \`${JSON.stringify(result.toolTrace)}\`\n\nAdditional first-request usage: \`${JSON.stringify(result.toolRequestUsage)}\`\n`);
      for (const key of ['comparison', 'computationTrace', 'memoryTrace', 'summaryTrace', 'toolSteps', 'retrievalTrace', 'agentTrace', 'extraRequests']) {
        if (result[key]) detailed.push(`\n${key}:\n\n\`\`\`json\n${JSON.stringify(result[key], null, 2)}\n\`\`\`\n`);
      }
    }
  }
  for (const check of record.observations) detailed.push(`\n- ${check.passed ? 'Passed / observed' : 'FAILED'}: ${check.name}: ${check.detail}\n`);
}
{
  const s = slide('What should students take away?');
  body(s, '1. Clear tasks and relevant context beat vague instructions.\n2. Examples guide patterns; they do not retrain the model.\n3. Sampling controls variety, not truth.\n4. Ground, validate, and allowlist tools.\n5. Measure representative tasks before choosing a model.', 0.7, 1.8, 11.7, 3.3, 24);
  body(s, 'A missing citation and a blocked request are learning outcomes, too.', 0.7, 5.6, 11.7, 0.9, 24);
  s.addNotes('Actual observed failures are preserved. Do not teach students to bypass provider controls. All examples use fictional data; keep private student information out of public recordings.');
}
{
  const s = slide('Instructor setup and official references');
  body(s, 'Scripts + per-lab READMEs + Bicep infrastructure\nEntra authentication; shared existing models; low-cost static hosting\nPublic synthetic results only; remove classroom hosting when finished', 0.7, 1.7, 11.8, 1.6, 20);
  const sources = [
    ['Chat completions', 'https://learn.microsoft.com/azure/ai-foundry/openai/how-to/chatgpt'],
    ['Reasoning model settings', 'https://learn.microsoft.com/azure/ai-foundry/openai/how-to/reasoning'],
    ['Structured outputs', 'https://learn.microsoft.com/azure/ai-foundry/openai/how-to/structured-outputs'],
    ['Tool calling', 'https://learn.microsoft.com/azure/ai-foundry/openai/how-to/function-calling'],
    ['Static Web Apps deployment', 'https://learn.microsoft.com/azure/static-web-apps/static-web-apps-cli-deploy'],
  ];
  sources.forEach(([text, url], i) => link(s, text, url, 0.7, 3.7 + i * 0.43, 11.8));
  link(s, 'Open the deployed gallery', config.website, 0.7, 6.1);
  s.addNotes('Embedded MP4 playback depends on the presentation viewer. Use desktop PowerPoint or public per-lab links when recordings are available. Output limits reduce usage but are not a dollar cap. Model requests are billed; Free-tier hosting has storage and bandwidth limits.');
}
const first = JSON.parse(await readFile('results/09-grounding-first-attempt.json', 'utf8'));
detailed.push('\n## Retained first grounding attempt\n\nThe original prompt requested a citation but did not obtain one. The evaluator failed and stopped the runner. The prompt was refined, not the output edited.\n');
detailed.push(`\nOriginal output:\n\n\`\`\`text\n${first.results[1].output}\n\`\`\`\n`);
for (const check of first.observations) detailed.push(`\n- ${check.passed ? 'Passed' : 'FAILED'}: ${check.name}\n`);
const firstTokens = first.results.reduce((sum, result) => sum + result.usage.total_tokens, 0);
report.push('', `Final records represent ${representedRequests} attempted requests and ${totalTokens} reported tokens.`, '',
  `The retained failed grounding attempt adds 2 requests and ${firstTokens} tokens. Total captured execution: ${representedRequests + 2} attempted requests and ${totalTokens + firstTokens} reported tokens. The blocked request supplied no usage; these totals are not a billing statement.`, '',
  'Latency is wall-clock request time from this machine; tool latency sums both model requests. Token usage includes tool-request tokens and reported reasoning tokens. Cost depends on current per-model pricing and storage/egress.', ...detailed);
await mkdir('deliverables', { recursive: true });
await writeFile('deliverables/outcomes.md', report.join('\n') + '\n');
await pptx.writeFile({ fileName: 'deliverables/AI-Basics.pptx' });
console.log(mediaDirectory ? `Created ${slideCount}-slide deck with ${labs.length} embedded videos and actual-outcomes report.` :
  `Created ${slideCount}-slide draft deck with actual outcomes and explicit recording-pending notices; no videos fabricated.`);
