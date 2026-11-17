import { estimatePitch } from './wav.mjs';
import { createCanvas, fillRect, drawText, colors } from './raster.mjs';
import { mulberry32, sampleWeighted } from './random.mjs';

export const PITCHES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
export const DURATIONS = [1, 2, 3, 4];
export const TOTAL_SLOTS = 32;
export const BPM = 120;
export const SLOT_SECONDS = 60 / BPM / 2;
const SEMITONES = { C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2, C5: 3 };

export const frequencyOf = pitch => 440 * 2 ** (SEMITONES[pitch] / 12);
export const degreeOf = pitch => PITCHES.indexOf(pitch);
export const tokenOf = event => `${event.pitch}:${event.duration}`;

export function extractTokens(text) {
  return text.match(/[A-Za-z]+[0-9]*:\d+/g) ?? [];
}

export function parseEvents(tokens) {
  const events = [];
  const rejected = [];
  for (const token of tokens) {
    const [pitch, rawDuration] = token.split(':');
    const duration = Number(rawDuration);
    if ((PITCHES.includes(pitch) || pitch === 'R') && DURATIONS.includes(duration)) events.push({ pitch, duration });
    else rejected.push(token);
  }
  return { events, rejected };
}

export const totalSlots = events => events.reduce((sum, event) => sum + event.duration, 0);

export function fitToBar(events) {
  const fitted = [];
  let used = 0;
  for (const event of events) {
    if (used >= TOTAL_SLOTS) break;
    fitted.push({ pitch: event.pitch, duration: Math.min(event.duration, TOTAL_SLOTS - used) });
    used += fitted.at(-1).duration;
  }
  while (used < TOTAL_SLOTS) {
    const duration = Math.min(4, TOTAL_SLOTS - used);
    fitted.push({ pitch: 'R', duration });
    used += duration;
  }
  return fitted;
}

export function melodyFeatures(events) {
  const pitched = events.filter(event => event.pitch !== 'R');
  const steps = pitched.slice(1).map((event, i) => Math.abs(degreeOf(event.pitch) - degreeOf(pitched[i].pitch)));
  const degrees = pitched.map(event => degreeOf(event.pitch));
  const bigrams = pitched.slice(1).map((event, i) => `${pitched[i].pitch}>${event.pitch}`);
  const share = (count, total) => (total ? count / total : 0);
  return {
    events: events.length, uniqueTokens: new Set(events.map(tokenOf)).size,
    stepwiseRatio: share(steps.filter(step => step <= 1).length, steps.length),
    leapRatio: share(steps.filter(step => step >= 4).length, steps.length),
    rangeSteps: degrees.length ? Math.max(...degrees) - Math.min(...degrees) : 0,
    endsOnTonic: pitched.length > 0 && ['C4', 'C5'].includes(pitched.at(-1).pitch),
    repetition: bigrams.length ? 1 - new Set(bigrams).size / bigrams.length : 0,
    restShare: share(events.filter(event => event.pitch === 'R').reduce((sum, event) => sum + event.duration, 0), totalSlots(events)),
    rhythmVariety: new Set(events.map(event => event.duration)).size,
  };
}

export function meanFeatures(featureList) {
  const keys = Object.keys(featureList[0]);
  return Object.fromEntries(keys.map(key => [key, featureList.reduce((sum, features) => sum + Number(features[key]), 0) / featureList.length]));
}

const grams = (tokens, n) => Array.from({ length: Math.max(0, tokens.length - n + 1) }, (_, i) => tokens.slice(i, i + n).join(' '));

export function copiedShare(events, phrases, n = 4) {
  const known = new Set(phrases.flatMap(phrase => grams(phrase.map(tokenOf), n)));
  const mine = grams(events.map(tokenOf), n);
  return mine.length ? mine.filter(gram => known.has(gram)).length / mine.length : 0;
}

export function randomMelody(seed) {
  const random = mulberry32(seed);
  const events = [];
  let used = 0;
  while (used < TOTAL_SLOTS) {
    const pitch = [...PITCHES, 'R'][Math.floor(random() * 9)];
    const duration = Math.min(DURATIONS[Math.floor(random() * 4)], TOTAL_SLOTS - used);
    events.push({ pitch, duration });
    used += duration;
  }
  return events;
}

export function trainBigram(phrases) {
  const bigram = new Map();
  const unigram = new Map();
  const bump = (map, key, token) => {
    const counts = map.get(key) ?? new Map();
    counts.set(token, (counts.get(token) ?? 0) + 1);
    map.set(key, counts);
  };
  for (const phrase of phrases) {
    const tokens = ['<s>', ...phrase.map(tokenOf)];
    for (let i = 1; i < tokens.length; i++) {
      bump(bigram, tokens[i - 1], tokens[i]);
      bump(unigram, '', tokens[i]);
    }
  }
  return { bigram, unigram };
}

export function sampleBigram(model, temperature, seed) {
  if (!(temperature > 0)) throw new Error('Temperature must be positive.');
  const random = mulberry32(seed);
  let previous = '<s>';
  const events = [];
  let used = 0;
  while (used < TOTAL_SLOTS) {
    const counts = model.bigram.get(previous) ?? model.unigram.get('');
    const entries = [...counts.entries()];
    const token = entries[sampleWeighted(entries.map(([, count]) => count ** (1 / temperature)), random)][0];
    const [pitch, duration] = token.split(':');
    const event = { pitch, duration: Math.min(Number(duration), TOTAL_SLOTS - used) };
    events.push(event);
    previous = token;
    used += event.duration;
  }
  return events;
}

const HARMONICS = [1, 0.5, 0.25, 0.125];

export function synthesizeMelody(events, sampleRate = 16000) {
  const slot = Math.round(SLOT_SECONDS * sampleRate);
  const samples = new Float32Array(totalSlots(events) * slot);
  let cursor = 0;
  for (const event of events) {
    const length = event.duration * slot;
    if (event.pitch !== 'R') {
      const hz = frequencyOf(event.pitch);
      const seconds = length / sampleRate;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.min(1, t / 0.01) * (t < 0.07 ? 1 - 0.3 * Math.min(1, Math.max(0, (t - 0.01) / 0.06)) : 0.7) * Math.min(1, (seconds - t) / 0.04);
        let value = 0;
        HARMONICS.forEach((weight, h) => { value += weight * Math.sin(2 * Math.PI * hz * (h + 1) * t); });
        samples[cursor + i] += 0.45 * envelope * (value / 1.875);
      }
    }
    cursor += length;
  }
  return samples;
}

export function verifyRender(samples, events, sampleRate = 16000) {
  const slot = Math.round(SLOT_SECONDS * sampleRate);
  const rows = [];
  let cursor = 0;
  for (const event of events) {
    const length = event.duration * slot;
    if (event.pitch !== 'R') {
      const part = samples.subarray(cursor + Math.round(length * 0.25), cursor + Math.round(length * 0.75));
      const measured = estimatePitch(part, sampleRate, { minHz: 200, maxHz: 1100, frameSeconds: 0.05, hopSeconds: 0.02, threshold: 0.6 }).medianHz;
      const target = frequencyOf(event.pitch);
      const cents = measured ? 1200 * Math.log2(measured / target) : null;
      rows.push({ pitch: event.pitch, targetHz: target, measuredHz: measured, cents, ok: cents !== null && Math.abs(cents) <= 50 });
    }
    cursor += length;
  }
  return { checked: rows.length, verified: rows.filter(row => row.ok).length, worstCents: rows.length ? Math.max(...rows.map(row => Math.abs(row.cents ?? 9999))) : 0, rows };
}

export function renderPianoRoll(events) {
  const rows = [...PITCHES].reverse();
  const left = 30;
  const slotWidth = 16;
  const rowHeight = 14;
  const canvas = createCanvas(left + TOTAL_SLOTS * slotWidth + 6, 8 + rows.length * rowHeight + 6, colors.white);
  rows.forEach((pitch, row) => {
    fillRect(canvas, left, 6 + row * rowHeight + rowHeight - 1, TOTAL_SLOTS * slotWidth, 1, colors.light);
    drawText(canvas, pitch, 2, 6 + row * rowHeight + 3, 1, colors.gray);
  });
  for (let bar = 0; bar <= 4; bar++) fillRect(canvas, left + bar * 8 * slotWidth, 4, 1, rows.length * rowHeight + 2, colors.gray);
  let slot = 0;
  for (const event of events) {
    const x = left + slot * slotWidth + 1;
    if (event.pitch === 'R') fillRect(canvas, x, 6 + (rows.length * rowHeight) / 2 - 1, event.duration * slotWidth - 2, 2, colors.gray);
    else fillRect(canvas, x, 6 + rows.indexOf(event.pitch) * rowHeight + 1, event.duration * slotWidth - 2, rowHeight - 3, colors.green);
    slot += event.duration;
  }
  return canvas;
}
