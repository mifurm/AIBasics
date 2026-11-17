import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePng({ width, height, data, channels = 4 }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('Invalid PNG dimensions.');
  const colorType = { 1: 0, 3: 2, 4: 6 }[channels];
  if (colorType === undefined) throw new Error('PNG encoder supports 1, 3, or 4 channels.');
  if (data.length !== width * height * channels) throw new Error('Pixel data does not match PNG dimensions.');
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const base = y * (stride + 1);
    raw[base] = 1;
    for (let i = 0; i < stride; i++) {
      const current = data[y * stride + i];
      const left = i >= channels ? data[y * stride + i - channels] : 0;
      raw[base + 1 + i] = (current - left) & 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function pngChunks(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file.');
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error('Truncated PNG chunk header.');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (offset + 12 + length > buffer.length) throw new Error(`Truncated PNG chunk ${type}.`);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (buffer.readUInt32BE(offset + 8 + length) !== crc32(buffer.subarray(offset + 4, offset + 8 + length))) {
      throw new Error(`Corrupt PNG chunk ${type}.`);
    }
    chunks.push({ type, length, data });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  if (chunks.at(-1)?.type !== 'IEND') throw new Error('PNG has no IEND chunk.');
  return chunks;
}

export function decodePng(buffer) {
  const chunks = pngChunks(buffer);
  const header = chunks.find(entry => entry.type === 'IHDR')?.data;
  if (!header || header.length !== 13) throw new Error('PNG has no valid IHDR chunk.');
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [bitDepth, colorType, , , interlace] = header.subarray(8);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (bitDepth !== 8 || interlace !== 0 || !channels) throw new Error('Unsupported PNG variant: only non-interlaced 8-bit gray, RGB, and RGBA are supported.');
  if (width < 1 || height < 1 || width * height > 64_000_000) throw new Error('Unreasonable PNG dimensions.');
  const raw = inflateSync(Buffer.concat(chunks.filter(entry => entry.type === 'IDAT').map(entry => entry.data)));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error('PNG pixel data has the wrong length.');
  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error(`Invalid PNG filter ${filter}.`);
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? data[y * stride + i - channels] : 0;
      const up = y > 0 ? data[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? data[(y - 1) * stride + i - channels] : 0;
      const value = raw[y * (stride + 1) + 1 + i];
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceUp = Math.abs(estimate - up);
        const distanceUpLeft = Math.abs(estimate - upLeft);
        predictor = distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft;
      }
      data[y * stride + i] = (value + predictor) & 255;
    }
  }
  return { width, height, channels, data, chunks: chunks.map(({ type, length }) => ({ type, length })) };
}

export function toRgba(image) {
  const channels = image.channels ?? 4;
  if (channels === 4) return { width: image.width, height: image.height, data: image.data };
  const out = new Uint8Array(image.width * image.height * 4);
  for (let p = 0; p < image.width * image.height; p++) {
    const source = p * channels;
    const [r, g, b, a] = channels === 1 ? [image.data[source], image.data[source], image.data[source], 255] :
      channels === 2 ? [image.data[source], image.data[source], image.data[source], image.data[source + 1]] :
        [image.data[source], image.data[source + 1], image.data[source + 2], 255];
    out.set([r, g, b, a], p * 4);
  }
  return { width: image.width, height: image.height, data: out };
}

export function resizeBox(image, width, height) {
  const source = toRgba(image);
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * source.height) / height);
    const y1 = Math.max(y0 + 1, Math.ceil(((y + 1) * source.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * source.width) / width);
      const x1 = Math.max(x0 + 1, Math.ceil(((x + 1) * source.width) / width));
      const sums = [0, 0, 0, 0];
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) for (let c = 0; c < 4; c++) sums[c] += source.data[(sy * source.width + sx) * 4 + c];
      }
      const count = (y1 - y0) * (x1 - x0);
      for (let c = 0; c < 4; c++) out[(y * width + x) * 4 + c] = Math.round(sums[c] / count);
    }
  }
  return { width, height, data: out };
}

export function meanAbsoluteDifference(a, b) {
  const left = toRgba(a);
  const right = toRgba(b);
  if (left.width !== right.width || left.height !== right.height) throw new Error('Images must have the same dimensions.');
  let total = 0;
  for (let p = 0; p < left.width * left.height; p++) {
    for (let c = 0; c < 3; c++) total += Math.abs(left.data[p * 4 + c] - right.data[p * 4 + c]);
  }
  return total / (left.width * left.height * 3);
}
