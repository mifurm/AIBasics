import { createHash } from 'node:crypto';

const TYPES = { png: 'image/png', wav: 'audio/wav', svg: 'image/svg+xml' };
export const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
export const MAX_LAB_ARTIFACT_BYTES = 8 * 1024 * 1024;
export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

function assertSignature(extension, buffer) {
  const ok = extension === 'png' ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
    extension === 'wav' ? buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WAVE' :
      /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(buffer.toString('utf8', 0, 200));
  if (!ok) throw new Error(`Artifact bytes are not a valid ${extension.toUpperCase()} file.`);
}

export function createArtifactStore(labId) {
  const items = new Map();
  let total = 0;
  return {
    labId,
    add({ id, extension, data, description }) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 60) throw new Error(`Invalid artifact id "${id}".`);
      if (!TYPES[extension]) throw new Error(`Unsupported artifact type "${extension}".`);
      if (typeof description !== 'string' || !description.trim()) throw new Error(`Artifact ${id} needs a description.`);
      if (items.has(id)) throw new Error(`Duplicate artifact id "${id}".`);
      const buffer = Buffer.from(data);
      if (!buffer.length || buffer.length > MAX_ARTIFACT_BYTES) throw new Error(`Artifact ${id} must be between 1 byte and ${MAX_ARTIFACT_BYTES} bytes.`);
      assertSignature(extension, buffer);
      total += buffer.length;
      if (total > MAX_LAB_ARTIFACT_BYTES) throw new Error(`Lab artifacts exceed ${MAX_LAB_ARTIFACT_BYTES} bytes.`);
      const ref = { id, file: `${id}.${extension}`, mime: TYPES[extension], bytes: buffer.length, sha256: sha256(buffer), description };
      items.set(id, { ref, buffer });
      return ref;
    },
    refs: () => [...items.values()].map(item => item.ref),
    entries: () => [...items.values()],
    has: id => items.has(id),
  };
}
