import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'aibasics-'));
const archive = Buffer.from(process.env.SOURCE_ARCHIVE, 'base64');
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
