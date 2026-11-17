import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// The archive is split across SOURCE_ARCHIVE_0, SOURCE_ARCHIVE_1, ... because one Linux environment variable is limited to about 128 KB.
const parts = [];
while (process.env[`SOURCE_ARCHIVE_${parts.length}`] !== undefined) parts.push(process.env[`SOURCE_ARCHIVE_${parts.length}`]);
if (!parts.length) throw new Error('No source archive was supplied to the job.');
const directory = await mkdtemp(join(tmpdir(), 'aibasics-'));
const archive = Buffer.from(parts.join(''), 'base64');
if (createHash('sha256').update(archive).digest('hex') !== process.env.SOURCE_SHA256) {
  throw new Error('Source archive SHA-256 does not match the deployed release.');
}
await writeFile(join(directory, 'source.tgz'), archive);
execFileSync('tar', ['-xzf', join(directory, 'source.tgz'), '-C', directory]);
const child = spawnSync(process.execPath, ['scripts/azure-entry.mjs'], {
  cwd: directory, stdio: 'inherit', env: process.env,
});
if (child.error) throw child.error;
if (child.signal) throw new Error(`Azure runner terminated with ${child.signal}`);
process.exitCode = child.status;
