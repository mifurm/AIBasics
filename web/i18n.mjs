import { basicLabs, ui, annotations, annotationPatterns, comparisonText, diagramText } from './polish.mjs';
import { localizeWalkthrough } from './polish-walkthrough.mjs';
import { advancedLabs } from './polish-advanced.mjs';
import { displayText, displayPatterns } from './polish-displays.mjs';

export const languages = ['en', 'pl'];
export const isBasicLab = lab => /^(00|00a|0[1-9]|1[0-2])-/.test(lab.id);
export const polishLabs = { ...basicLabs, ...advancedLabs };

export function assertLanguage(language) {
  if (!languages.includes(language)) throw new Error(`Unsupported language: ${language}`);
}

export function translate(source, language = 'en', values = {}) {
  assertLanguage(language);
  const template = language === 'en' ? source : ui[source];
  if (typeof template !== 'string') throw new Error(`Missing Polish interface translation: ${source}`);
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing translation value: ${key}`);
    return String(values[key]);
  });
}

export function localizeAnnotation(source) {
  if (typeof source !== 'string') return source;
  if (Object.hasOwn(annotations, source)) return annotations[source];
  if (Object.hasOwn(displayText, source)) return displayText[source];
  if (Object.hasOwn(ui, source)) return ui[source];
  const language = /^(Polish|English|Spanish): inspect every token$/.exec(source);
  if (language) return `${annotations[language[1]]}: każdy token z osobna`;
  for (const [pattern, replacement] of [...annotationPatterns, ...displayPatterns]) {
    if (pattern.test(source)) return source.replace(pattern, replacement);
  }
  return source;
}

export function localizeTeaching(source) {
  const localized = localizeAnnotation(source);
  if (localized === source && /[A-Za-z]{3}/.test(source) &&
    !/^(?:GPT-4o|GPT-5-mini|Model|Token|Prompt|URL|Hindi|<bos>|<eos>|the|robot|plant|blue|green|exp\([sz]\)|[\d.]+%|".*")$/.test(source)) {
    throw new Error(`Missing Polish teaching translation: ${source}`);
  }
  return localized;
}

export function localizeBlock(block) {
  const teachingRows = ['Measurement', 'Check', 'Quantity', 'Sentence pair', 'Content'].includes(block.headers?.[0]);
  return {
    ...block,
    ...(block.title ? { title: localizeTeaching(block.title) } : {}),
    ...(block.type === 'text' ? { text: localizeTeaching(block.text) } : {}),
    ...(block.caption ? { caption: localizeTeaching(block.caption) } : {}),
    ...(block.alt ? { alt: localizeTeaching(block.alt) } : {}),
    ...(block.headers ? { headers: block.headers.map(localizeTeaching) } : {}),
    ...(block.rows ? { rows: block.rows.map(row => row.map((cell, index) =>
      teachingRows && index === 0 ? localizeTeaching(cell) : localizeAnnotation(cell))) } : {}),
    ...(block.blocks ? { blocks: block.blocks.map(localizeBlock) } : {}),
    ...(block.items ? { items: block.items.map(item => ({
      ...item, label: localizeTeaching(item.label),
      ...(item.detail ? { detail: localizeTeaching(item.detail) } : {}),
    })) } : {}),
  };
}

export function localizeDiagram(svg) {
  for (const source of Object.keys(diagramText)) {
    if (!svg.includes(`>${source}<`)) throw new Error(`Missing diagram text: ${source}`);
  }
  return svg.replace('<svg ', '<svg xml:lang="pl" ').replace(/>([^<>]+)</g,
    (match, content) => Object.hasOwn(diagramText, content) ? `>${diagramText[content]}<` : match);
}

export function validateTranslations(labs) {
  for (const lab of labs) {
    const content = polishLabs[lab.id];
    if (!content || ['title', 'concept', 'question', 'caveat', 'exercise'].some(key => !content[key]?.trim())) {
      throw new Error(`Incomplete Polish teaching content: ${lab.id}`);
    }
    if (content.caseLabels.length !== lab.cases.length || content.caseLabels.some(label => !label.trim())) {
      throw new Error(`Incomplete Polish case labels: ${lab.id}`);
    }
    const needsPrompts = content.practice?.length > 0 || lab.cases.some(testCase => !testCase.computation && !testCase.experiment);
    if (needsPrompts && (content.practice.length !== lab.cases.length || content.practice.some(messages =>
      !messages.length || messages.some(message => !message.role || !message.content.trim())))) {
      throw new Error(`Incomplete Polish practice prompts: ${lab.id}`);
    }
  }
}

export function localizeLab(lab, language = 'en') {
  assertLanguage(language);
  if (language === 'en') return lab;
  const content = polishLabs[lab.id];
  if (!content) throw new Error(`Missing Polish lab: ${lab.id}`);
  return {
    ...lab,
    ...Object.fromEntries(['title', 'concept', 'question', 'caveat', 'exercise'].map(key => [key, content[key]])),
    practice: content.practice,
    ...(lab.diagram ? { diagram: 'transformer.pl.svg' } : {}),
    ...(lab.results ? { results: lab.results.map((result, index) => ({
      ...result, label: content.caseLabels[index],
      ...(result.display ? { display: result.display.map(localizeBlock) } : {}),
      ...(result.request.summary ? { request: { ...result.request, summary: localizeTeaching(result.request.summary) } } : {}),
      ...(result.comparison ? { comparison: {
        ...result.comparison,
        taskTitle: comparisonText[result.comparison.taskId].title,
        promptStyle: result.comparison.promptStyle === 'broad' ? 'ogólnie' : 'precyzyjnie',
        manualRubric: comparisonText[result.comparison.taskId].rubric,
      } } : {}),
      ...(result.computationTrace?.walkthrough ? { computationTrace: {
        ...result.computationTrace,
        walkthrough: localizeWalkthrough(result.computationTrace.walkthrough, localizeBlock),
      } } : {}),
    })) } : {}),
  };
}
