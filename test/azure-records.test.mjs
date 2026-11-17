import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encodeBlob, decodeBlobs, encodeRecord, decodeRecords, batchRows } from '../lib/azure-records.mjs';

const runId = 'run-1';

test('binary artifacts survive chunking, duplication and reordering with exact bytes', () => {
  const data = Buffer.concat([randomBytes(40_000), Buffer.alloc(20_000, 7)]);
  const lines = encodeBlob(runId, '32-image-generation--sample', data);
  assert.ok(lines.length > 5);
  const shuffled = [...lines, lines[0], lines[2]].sort(() => 0.5 - Math.random());
  const blobs = decodeBlobs(runId, shuffled);
  assert.ok(blobs.get('32-image-generation--sample').equals(data));
});

test('incomplete, other-run, conflicting and corrupted artifact chunks are never accepted', () => {
  const data = randomBytes(30_000);
  const lines = encodeBlob(runId, 'lab--art', data);
  assert.equal(decodeBlobs(runId, lines.slice(1)).size, 0);
  assert.equal(decodeBlobs('other-run', lines).size, 0);
  const [prefix, id, name, index, count, hash, part] = lines[0].split(':');
  const conflicting = [lines[0], [prefix, id, name, index, count, hash, part.slice(0, -4) + 'AAAA'].join(':')];
  assert.throws(() => decodeBlobs(runId, conflicting), /Conflicting/);
  const tampered = lines.map(line => line.replace(/:[a-f0-9]{64}:/, `:${'0'.repeat(64)}:`));
  assert.throws(() => decodeBlobs(runId, tampered), /hash mismatch|Unexpected|incorrect|invalid/i);
  assert.throws(() => decodeBlobs(runId, ['AIBASICSB:run-1:x:0:1:notahash:AAAA']), /Malformed/);
  assert.throws(() => encodeBlob('bad id!', 'name', data), /Invalid/);
  assert.throws(() => encodeBlob(runId, 'bad:name', data), /Invalid/);
  assert.throws(() => decodeBlobs(runId, encodeBlob(runId, 'big', Buffer.alloc(200_000, 1)), { maxBytes: 1000 }));
});

test('records and artifacts share one table without confusing each other', () => {
  const record = { labId: 'x', value: [1, 2, 3] };
  const blob = randomBytes(9000);
  const lines = [...encodeRecord(runId, 'x', record), ...encodeBlob(runId, 'x--art', blob)];
  assert.deepEqual(decodeRecords(runId, lines).get('x'), record);
  assert.ok(decodeBlobs(runId, lines).get('x--art').equals(blob));
  assert.equal(decodeRecords(runId, lines).size, 1);
  assert.equal(decodeBlobs(runId, lines).size, 1);
});

test('ingestion rows are batched below the one-megabyte request limit and nothing is lost', () => {
  const rows = encodeBlob(runId, 'lab--big', randomBytes(900_000)).map(Log => ({ TimeGenerated: new Date().toISOString(), RunId: runId, Log }));
  const batches = batchRows(rows);
  assert.ok(batches.length >= 2);
  assert.ok(batches.every(batch => Buffer.byteLength(JSON.stringify(batch)) < 1_000_000));
  assert.equal(batches.flat().length, rows.length);
  assert.deepEqual(batches.flat(), rows);
  assert.throws(() => batchRows([{ Log: 'x'.repeat(800_000) }]), /exceeds/);
});
