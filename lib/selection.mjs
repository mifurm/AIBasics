import { labs, getLab } from './labs.mjs';

export const selectionGroups = ['all', 'agents', 'genai'];

// A group name, one lab id, or several lab ids separated by commas (run in the order given, each at most once).
export function selectLabs(selection) {
  if (selection === 'all') return labs;
  if (selection === 'agents') return labs.filter(lab => lab.cases[0].agent);
  if (selection === 'genai') return labs.filter(lab => lab.series === 'genai');
  const ids = selection.split(',');
  if (new Set(ids).size !== ids.length) throw new Error('List each lab only once.');
  return ids.map(getLab);
}
