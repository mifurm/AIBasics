import { encodePng } from './png.mjs';

export const colors = {
  white: [255, 255, 255], black: [20, 20, 20], red: [220, 30, 30], blue: [30, 60, 220],
  green: [30, 160, 60], gray: [120, 130, 140], light: [225, 230, 235], orange: [235, 130, 20],
};

// Classic 5x7 glyphs, one 5-bit row per entry (most significant bit is the left pixel).
const glyphs = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [30, 1, 1, 14, 1, 1, 30],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '.': [0, 0, 0, 0, 0, 12, 12], ':': [0, 12, 12, 0, 12, 12, 0], '=': [0, 0, 31, 0, 31, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0],
  '%': [24, 25, 2, 4, 8, 19, 3], ' ': [0, 0, 0, 0, 0, 0, 0],
};

export const supportedGlyphs = Object.keys(glyphs).join('');

export function createCanvas(width, height, background = colors.white) {
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([background[0], background[1], background[2], 255], p * 4);
  return { width, height, data };
}

export function setPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  canvas.data.set([color[0], color[1], color[2], 255], (y * canvas.width + x) * 4);
}

export function fillRect(canvas, x, y, width, height, color) {
  for (let py = Math.max(0, Math.floor(y)); py < Math.min(canvas.height, Math.ceil(y + height)); py++) {
    for (let px = Math.max(0, Math.floor(x)); px < Math.min(canvas.width, Math.ceil(x + width)); px++) setPixel(canvas, px, py, color);
  }
}

export function fillCircle(canvas, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2) setPixel(canvas, x, y, color);
    }
  }
}

export function strokeCircle(canvas, cx, cy, radius, thickness, color) {
  const inner = radius - thickness;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const distance = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
      if (distance <= radius ** 2 && distance >= inner ** 2) setPixel(canvas, x, y, color);
    }
  }
}

export function fillTriangle(canvas, a, b, c, color) {
  const sign = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  for (let y = Math.floor(Math.min(a[1], b[1], c[1])); y <= Math.ceil(Math.max(a[1], b[1], c[1])); y++) {
    for (let x = Math.floor(Math.min(a[0], b[0], c[0])); x <= Math.ceil(Math.max(a[0], b[0], c[0])); x++) {
      const p = [x + 0.5, y + 0.5];
      const d1 = sign(p, a, b);
      const d2 = sign(p, b, c);
      const d3 = sign(p, c, a);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) setPixel(canvas, x, y, color);
    }
  }
}

export function drawLine(canvas, x0, y0, x1, y1, thickness, color) {
  const half = thickness / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = Math.floor(Math.min(y0, y1) - half); y <= Math.ceil(Math.max(y0, y1) + half); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - half); x <= Math.ceil(Math.max(x0, x1) + half); x++) {
      const t = lengthSquared ? Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / lengthSquared)) : 0;
      if ((x + 0.5 - (x0 + t * dx)) ** 2 + (y + 0.5 - (y0 + t * dy)) ** 2 <= half ** 2) setPixel(canvas, x, y, color);
    }
  }
}

export function textWidth(text, scale) {
  return text.length ? text.length * 6 * scale - scale : 0;
}

export function drawText(canvas, text, x, y, scale, color = colors.black) {
  [...text.toUpperCase()].forEach((character, index) => {
    const rows = glyphs[character];
    if (!rows) throw new Error(`Unsupported bitmap-font character "${character}".`);
    rows.forEach((bits, row) => {
      for (let column = 0; column < 5; column++) {
        if (bits & (1 << (4 - column))) fillRect(canvas, x + (index * 6 + column) * scale, y + row * scale, scale, scale, color);
      }
    });
  });
}

export function blit(target, source, dx, dy) {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const from = (y * source.width + x) * 4;
      setPixel(target, dx + x, dy + y, [source.data[from], source.data[from + 1], source.data[from + 2]]);
    }
  }
}

export const canvasToPng = canvas => encodePng({ width: canvas.width, height: canvas.height, data: canvas.data, channels: 4 });
