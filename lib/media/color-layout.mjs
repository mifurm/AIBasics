import { toRgba } from './png.mjs';

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta + 6) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return { hue: hue * 60, saturation: max ? delta / max : 0, value: max / 255 };
}

const isRed = c => (c.hue <= 20 || c.hue >= 340) && c.saturation > 0.5 && c.value > 0.35;
const isBlue = c => c.hue >= 200 && c.hue <= 260 && c.saturation > 0.5 && c.value > 0.35;

export function colorName({ hue, saturation, value }) {
  if (value < 0.2) return 'black';
  if (saturation < 0.15) return value > 0.85 ? 'white' : 'gray';
  const names = [[15, 'red'], [45, 'orange'], [70, 'yellow'], [170, 'green'], [200, 'cyan'], [260, 'blue'], [300, 'purple'], [345, 'pink']];
  return names.find(([limit]) => hue < limit)?.[1] ?? 'red';
}

export function analyzeColorLayout(decoded) {
  const { width, height, data } = toRgba(decoded);
  const total = width * height;
  const stats = { red: { count: 0, x: 0, y: 0 }, blue: { count: 0, x: 0, y: 0 } };
  const palette = new Map();
  let white = 0;
  for (let p = 0; p < total; p++) {
    const r = data[p * 4];
    const g = data[p * 4 + 1];
    const b = data[p * 4 + 2];
    const color = hsv(r, g, b);
    palette.set(colorName(color), (palette.get(colorName(color)) ?? 0) + 1);
    if (Math.min(r, g, b) > 225) white++;
    const key = isRed(color) ? 'red' : isBlue(color) ? 'blue' : undefined;
    if (key) {
      stats[key].count++;
      stats[key].x += (p % width) / width;
      stats[key].y += Math.floor(p / width) / height;
    }
  }
  const summarize = entry => ({ fraction: entry.count / total, centerX: entry.count ? entry.x / entry.count : null, centerY: entry.count ? entry.y / entry.count : null });
  const red = summarize(stats.red);
  const blue = summarize(stats.blue);
  return {
    width, height, red, blue, white: white / total, other: Math.max(0, 1 - white / total - red.fraction - blue.fraction),
    dominantColors: [...palette.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, fraction: count / total })),
  };
}

export function layoutChecks(analysis) {
  const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
  const pct = value => `${(100 * value).toFixed(1)}%`;
  return [
    check('A red region is present', analysis.red.fraction > 0.005, `${pct(analysis.red.fraction)} of pixels.`),
    check('A blue region is present', analysis.blue.fraction > 0.005, `${pct(analysis.blue.fraction)} of pixels.`),
    check('The red shape is in the left half', analysis.red.centerX !== null && analysis.red.centerX < 0.5, `Red centre at ${analysis.red.centerX === null ? 'n/a' : pct(analysis.red.centerX)} of the width.`),
    check('The blue shape is in the right half', analysis.blue.centerX !== null && analysis.blue.centerX > 0.5, `Blue centre at ${analysis.blue.centerX === null ? 'n/a' : pct(analysis.blue.centerX)} of the width.`),
    check('The background is mostly plain white', analysis.white > 0.6, `${pct(analysis.white)} near-white pixels.`),
    check('Almost nothing else is drawn', analysis.other < 0.05, `${pct(analysis.other)} of pixels are neither white, red, nor blue (edges and shading count).`),
  ];
}

export function differingPixelFraction(a, b, threshold = 32) {
  const left = toRgba(a);
  const right = toRgba(b);
  if (left.width !== right.width || left.height !== right.height) throw new Error('Images must have the same dimensions.');
  let differing = 0;
  for (let p = 0; p < left.width * left.height; p++) {
    if (Math.max(Math.abs(left.data[p * 4] - right.data[p * 4]), Math.abs(left.data[p * 4 + 1] - right.data[p * 4 + 1]), Math.abs(left.data[p * 4 + 2] - right.data[p * 4 + 2])) > threshold) differing++;
  }
  return differing / (left.width * left.height);
}

export function c2paLabels(buffer, limit = 8) {
  const found = buffer.toString('latin1').match(/urn:c2pa:[0-9a-f-]{36}|c2pa\.[a-z0-9.]+/g) ?? [];
  return [...new Set(found)].slice(0, limit);
}
