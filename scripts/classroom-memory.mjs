import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [labId, action] = process.argv.slice(2);
if (!['13-persistent-memory', '14-memory-lifecycle'].includes(labId)) throw new Error('Only isolated fictional classroom stores are allowed.');
const directory = new URL('../results/memory/', import.meta.url);
const file = new URL(`${labId}.json`, directory);
await mkdir(directory, { recursive: true });
if (['write', 'replace', 'forget'].includes(action)) {
  const memory = action === 'forget' ? {} : { mascot: action === 'replace' ? 'Falcon' : 'Otter' };
  await writeFile(file, JSON.stringify(memory, null, 2) + '\n');
} else if (action !== 'read') {
  throw new Error(`Unknown memory action: ${action}`);
}
const memory = JSON.parse(await readFile(file, 'utf8'));
if (!memory || Array.isArray(memory) || Object.keys(memory).some(key => key !== 'mascot') ||
    ('mascot' in memory && !['Otter', 'Falcon'].includes(memory.mascot))) {
  throw new Error('Invalid fictional classroom memory; do not use this store for personal data.');
}
console.log(JSON.stringify({ memory, processId: process.pid, action }));
