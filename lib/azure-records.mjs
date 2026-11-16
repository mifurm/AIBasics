import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { managedToken } from './cloud.mjs';

export function encodeRecord(runId, name, record) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(runId) || !/^[a-zA-Z0-9-]+$/.test(name)) throw new Error('Invalid Azure record identifier.');
  const json = JSON.stringify(record);
  const hash = createHash('sha256').update(json).digest('hex');
  const encoded = gzipSync(json).toString('base64');
  const parts = encoded.match(/.{1,6000}/g);
  return parts.map((part, index) => `AIBASICS:${runId}:${name}:${index}:${parts.length}:${hash}:${part}`);
}

export function decodeRecords(runId, lines) {
  const groups = new Map();
  for (const line of lines) {
    if (!line.startsWith(`AIBASICS:${runId}:`)) continue;
    const [, , name, rawIndex, rawCount, hash, data] = line.split(':');
    const index = Number(rawIndex);
    const count = Number(rawCount);
    if (!/^[a-zA-Z0-9-]+$/.test(name) || !Number.isInteger(count) || count < 1 || count > 1000 ||
      !Number.isInteger(index) || index < 0 || index >= count || !/^[a-f0-9]{64}$/.test(hash) || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      throw new Error('Malformed Azure result chunk.');
    }
    const group = groups.get(name) ?? { count, hash, parts: new Map() };
    if (group.count !== count || group.hash !== hash || (group.parts.has(index) && group.parts.get(index) !== data)) {
      throw new Error(`Conflicting Azure result chunks: ${name}`);
    }
    group.parts.set(index, data);
    groups.set(name, group);
  }
  const records = new Map();
  for (const [name, group] of groups) {
    if (group.parts.size !== group.count) continue;
    const encoded = Array.from({ length: group.count }, (_, index) => group.parts.get(index)).join('');
    const json = gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 16 * 1024 * 1024 }).toString();
    if (createHash('sha256').update(json).digest('hex') !== group.hash) throw new Error(`Azure result hash mismatch: ${name}`);
    records.set(name, JSON.parse(json));
  }
  return records;
}

export async function persistRecord(runId, name, record) {
  const endpoint = process.env.INGESTION_ENDPOINT;
  const ruleId = process.env.INGESTION_RULE_ID;
  if (!endpoint || !ruleId) throw new Error('Azure Monitor ingestion endpoint and rule ID are required.');
  const token = await managedToken('https://monitor.azure.com');
  const url = new URL(`/dataCollectionRules/${encodeURIComponent(ruleId)}/streams/Custom-AIBasicsResults`, endpoint);
  url.searchParams.set('api-version', '2023-01-01');
  const rows = encodeRecord(runId, name, record).map(Log => ({
    TimeGenerated: new Date().toISOString(), RunId: runId, Log,
  }));
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(rows), signal: AbortSignal.timeout(120_000),
  });
  if (response.status !== 204) throw new Error(`Azure result ingestion failed: HTTP ${response.status}: ${await response.text()}`);
}
