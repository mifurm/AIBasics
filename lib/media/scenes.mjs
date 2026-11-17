import { createCanvas, fillCircle, fillRect, fillTriangle, drawText, drawLine, strokeCircle, blit, textWidth, colors } from './raster.mjs';
import { mulberry32, shuffled } from './random.mjs';

const shapeColors = { red: colors.red, blue: colors.blue, green: colors.green };

function drawShape(canvas, shape, color, x, y, radius) {
  if (shape === 'circle') fillCircle(canvas, x, y, radius, color);
  else if (shape === 'square') fillRect(canvas, x - radius * 0.85, y - radius * 0.85, radius * 1.7, radius * 1.7, color);
  else fillTriangle(canvas, [x, y - radius], [x + radius * 0.95, y + radius * 0.8], [x - radius * 0.95, y + radius * 0.8], color);
}

export function renderShapesScene(seed, spec) {
  const random = mulberry32(seed);
  const canvas = createCanvas(512, 512);
  const items = [];
  const wanted = Object.entries(spec).flatMap(([key, count]) => {
    const [color, shape] = key.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ');
    return Array.from({ length: count }, () => ({ color, shape: shape.replace(/s$/, '') }));
  });
  for (const item of shuffled(wanted, random)) {
    let placed = false;
    for (let attempt = 0; attempt < 4000 && !placed; attempt++) {
      const radius = 20 + Math.floor(random() * 8);
      const x = 40 + random() * 432;
      const y = 40 + random() * 432;
      if (items.every(other => Math.hypot(other.x - x, other.y - y) > other.radius + radius + 14)) {
        items.push({ ...item, x, y, radius });
        placed = true;
      }
    }
    if (!placed) throw new Error('Could not place all shapes without overlap.');
  }
  for (const item of items) drawShape(canvas, item.shape, shapeColors[item.color], item.x, item.y, item.radius);
  const count = (color, shape) => items.filter(item => item.color === color && item.shape === shape).length;
  return { canvas, items, truth: { red_circles: count('red', 'circle'), blue_squares: count('blue', 'square'), green_triangles: count('green', 'triangle') } };
}

export function renderBarChart(values) {
  const canvas = createCanvas(512, 384);
  const left = 78;
  const right = 492;
  const top = 24;
  const bottom = 318;
  for (const tick of [0, 25, 50, 75, 100]) {
    const y = bottom - ((bottom - top) * tick) / 100;
    fillRect(canvas, left, y, right - left, 1, colors.light);
    drawText(canvas, String(tick), left - 12 - textWidth(String(tick), 2), y - 7, 2, colors.gray);
  }
  fillRect(canvas, left, top, 2, bottom - top, colors.black);
  fillRect(canvas, left, bottom, right - left, 2, colors.black);
  const slot = (right - left) / values.length;
  values.forEach(([label, value], index) => {
    const height = ((bottom - top) * value) / 100;
    fillRect(canvas, left + index * slot + slot * 0.2, bottom - height, slot * 0.6, height, colors.blue);
    drawText(canvas, label, left + index * slot + slot / 2 - 9, bottom + 14, 3, colors.black);
  });
  const tallest = values.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  return { canvas, truth: { tallest_bar: tallest, values: Object.fromEntries(values) } };
}

export function renderTextSample(largeCode, smallCode, smallScale = 1) {
  const canvas = createCanvas(1024, 1024);
  drawText(canvas, largeCode, (1024 - textWidth(largeCode, 14)) / 2, 150, 14, colors.black);
  fillRect(canvas, 64, 560, 896, 2, colors.light);
  drawText(canvas, smallCode, 700, 930, smallScale, colors.black);
  return { canvas, truth: { large_code: largeCode, small_code: smallCode } };
}

const FRAME = 256;
const fontLabel = (canvas, label, color = colors.black) => drawText(canvas, label, 8, 8, 3, color);

export function renderBallFrame(x, label) {
  const canvas = createCanvas(FRAME, FRAME);
  for (let y = 0; y < FRAME; y += 12) fillRect(canvas, FRAME / 2 - 1, y, 2, 6, colors.gray);
  fillRect(canvas, 20, 196, 40, 40, colors.blue);
  fillCircle(canvas, x, 122, 18, colors.red);
  fontLabel(canvas, label);
  return canvas;
}

export function ballPositions(count, direction) {
  const left = 24;
  const right = 232;
  const positions = Array.from({ length: count }, (_, index) => left + ((right - left) * index) / (count - 1));
  return direction === 'right_to_left' ? positions.reverse() : positions;
}

export function renderWheelFrame(angleDegrees, label) {
  const canvas = createCanvas(FRAME, FRAME);
  strokeCircle(canvas, FRAME / 2, FRAME / 2 + 8, 90, 6, colors.black);
  for (let spoke = 0; spoke < 3; spoke++) {
    const radians = ((angleDegrees + spoke * 120 - 90) * Math.PI) / 180;
    drawLine(canvas, FRAME / 2, FRAME / 2 + 8, FRAME / 2 + 86 * Math.cos(radians), FRAME / 2 + 8 + 86 * Math.sin(radians), 6, colors.black);
  }
  fillCircle(canvas, FRAME / 2, FRAME / 2 + 8, 10, colors.red);
  fontLabel(canvas, label);
  return canvas;
}

export function contactSheet(frames, columns) {
  const rows = Math.ceil(frames.length / columns);
  const sheet = createCanvas(columns * (FRAME + 8) + 8, rows * (FRAME + 8) + 8, colors.light);
  frames.forEach((frame, index) => blit(sheet, frame, 8 + (index % columns) * (FRAME + 8), 8 + Math.floor(index / columns) * (FRAME + 8)));
  return sheet;
}

export function crossingFrame(positions, direction) {
  const index = positions.findIndex(x => (direction === 'right_to_left' ? x < FRAME / 2 : x > FRAME / 2));
  return index < 0 ? null : index + 1;
}

export function apparentWheelMotion(degreesPerFrame) {
  const wrapped = ((degreesPerFrame % 120) + 120) % 120;
  if (wrapped === 0) return { step: 0, direction: 'stationary' };
  if (wrapped === 60) return { step: 60, direction: 'ambiguous' };
  const step = wrapped > 60 ? wrapped - 120 : wrapped;
  return { step, direction: step > 0 ? 'clockwise' : 'counterclockwise' };
}

export const frameSize = FRAME;
