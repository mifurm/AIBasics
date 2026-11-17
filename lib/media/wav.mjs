import { hannWindow, magnitudeSpectrum } from './fft.mjs';
import { createCanvas, drawText, fillRect, colors } from './raster.mjs';
import { gaussian } from './random.mjs';

export function parseWav(buffer) {
  if (buffer.length < 12 || buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.toString('latin1', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file.');
  }
  let offset = 12;
  let format;
  let data;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('latin1', offset, offset + 4);
    let size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4), bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      // Streaming encoders may leave the size unset; the sample data then runs to the end of the file.
      if (size === 0xffffffff || size === 0 || start + size > buffer.length) size = buffer.length - start;
      data = buffer.subarray(start, start + size);
      break;
    }
    offset = start + size + (size % 2);
  }
  if (!format || !data) throw new Error('WAV file has no fmt or data chunk.');
  if (![1, 0xfffe].includes(format.audioFormat) || format.bitsPerSample !== 16 || format.channels < 1) {
    throw new Error('Only 16-bit PCM WAV audio is supported.');
  }
  const frames = Math.floor(data.length / (2 * format.channels));
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel++) sum += data.readInt16LE((frame * format.channels + channel) * 2) / 32768;
    samples[frame] = sum / format.channels;
  }
  return { sampleRate: format.sampleRate, channels: format.channels, bitsPerSample: 16, samples, durationSeconds: frames / format.sampleRate };
}

export function encodeWav(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0, 'latin1');
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8, 'latin1');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'latin1');
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}

export const silence = (seconds, sampleRate) => new Float32Array(Math.round(seconds * sampleRate));

export function concatSamples(parts) {
  const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function mixInto(target, source, offset, gain = 1) {
  const out = Float32Array.from(target);
  for (let i = 0; i < source.length && offset + i < out.length; i++) if (offset + i >= 0) out[offset + i] += source[i] * gain;
  return out;
}

export function rms(samples) {
  if (!samples.length) return 0;
  let total = 0;
  for (const value of samples) total += value * value;
  return Math.sqrt(total / samples.length);
}

export function peakAmplitude(samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  return peak;
}

export function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return Float32Array.from(samples);
  const length = Math.floor((samples.length * toRate) / fromRate);
  return Float32Array.from({ length }, (_, i) => {
    const position = (i * fromRate) / toRate;
    const index = Math.floor(position);
    const fraction = position - index;
    return samples[index] * (1 - fraction) + (samples[Math.min(samples.length - 1, index + 1)] ?? samples[index]) * fraction;
  });
}

export function addNoiseAtSnr(samples, snrDb, random) {
  const signalPower = rms(samples) ** 2;
  if (!signalPower) throw new Error('Cannot add noise at a signal-to-noise ratio to silent audio.');
  const noiseSigma = Math.sqrt(signalPower / 10 ** (snrDb / 10));
  const noise = Float32Array.from(samples, () => gaussian(random) * noiseSigma);
  const noisy = Float32Array.from(samples, (value, i) => value + noise[i]);
  const peak = peakAmplitude(noisy);
  const scale = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < noisy.length; i++) noisy[i] *= scale;
  return { samples: noisy, measuredSnrDb: 10 * Math.log10(signalPower / (rms(noise) ** 2)) };
}

export function silenceRatio(samples, sampleRate, { windowSeconds = 0.02, thresholdRatio = 0.04 } = {}) {
  const window = Math.round(windowSeconds * sampleRate);
  const peak = peakAmplitude(samples);
  if (!peak || samples.length < window) return 1;
  let quiet = 0;
  let total = 0;
  for (let start = 0; start + window <= samples.length; start += window) {
    total++;
    if (rms(samples.subarray(start, start + window)) < thresholdRatio * peak) quiet++;
  }
  return quiet / total;
}

function heat(value) {
  const stops = [[0, [8, 10, 40]], [0.35, [30, 70, 160]], [0.7, [240, 170, 40]], [1, [255, 255, 225]]];
  const v = Math.max(0, Math.min(1, value));
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (v - t0) / (t1 - t0);
      return c0.map((component, index) => Math.round(component + (c1[index] - component) * f));
    }
  }
  return stops.at(-1)[1];
}

export function spectrogramCanvas(samples, sampleRate, { windowSize = 512, hop = 256, maxHz = 8000, dynamicRangeDb = 70 } = {}) {
  if (samples.length < windowSize) throw new Error('Audio is too short for a spectrogram.');
  const window = hannWindow(windowSize);
  const bins = Math.min(windowSize / 2, Math.floor((maxHz * windowSize) / sampleRate));
  const frames = Math.floor((samples.length - windowSize) / hop) + 1;
  const columns = [];
  let maximum = 0;
  for (let frame = 0; frame < frames; frame++) {
    const spectrum = magnitudeSpectrum(samples.subarray(frame * hop, frame * hop + windowSize), window);
    columns.push(spectrum);
    for (let bin = 0; bin < bins; bin++) maximum = Math.max(maximum, spectrum[bin]);
  }
  const left = 34;
  const bottom = 16;
  const canvas = createCanvas(left + frames, bins + bottom, colors.white);
  for (let frame = 0; frame < frames; frame++) {
    for (let bin = 0; bin < bins; bin++) {
      const db = 20 * Math.log10((columns[frame][bin] + 1e-12) / (maximum + 1e-12));
      const [r, g, b] = heat((db + dynamicRangeDb) / dynamicRangeDb);
      const offset = ((bins - 1 - bin) * canvas.width + left + frame) * 4;
      canvas.data.set([r, g, b, 255], offset);
    }
  }
  for (let hz = 0; hz <= maxHz; hz += 2000) {
    const y = bins - 1 - Math.round((hz * windowSize) / sampleRate);
    if (y >= 0 && y < bins) {
      fillRect(canvas, left - 4, y, 4, 1, colors.black);
      drawText(canvas, hz === 0 ? '0' : `${hz / 1000}K`, hz === 0 ? 22 : 10, Math.max(0, Math.min(bins - 7, y - 3)), 1, colors.black);
    }
  }
  const seconds = samples.length / sampleRate;
  for (let second = 1; second < seconds; second++) {
    const x = left + Math.round((second * sampleRate - windowSize / 2) / hop);
    if (x >= left && x < canvas.width) {
      fillRect(canvas, x, bins, 1, 4, colors.black);
      drawText(canvas, `${second}`, x - 2, bins + 6, 1, colors.black);
    }
  }
  drawText(canvas, 'SEC', canvas.width - 20, bins + 6, 1, colors.gray);
  return canvas;
}

export function estimatePitch(samples, sampleRate, { minHz = 60, maxHz = 500, frameSeconds = 0.05, hopSeconds = 0.02, threshold = 0.55 } = {}) {
  const frame = Math.round(frameSeconds * sampleRate);
  const hop = Math.round(hopSeconds * sampleRate);
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / minHz);
  const peak = peakAmplitude(samples);
  const values = [];
  let frames = 0;
  if (!peak) return { medianHz: null, voicedFrames: 0, frames: 0 };
  for (let start = 0; start + frame + maxLag + 1 <= samples.length; start += hop) {
    frames++;
    let energy = 0;
    for (let i = 0; i < frame; i++) energy += samples[start + i] ** 2;
    if (Math.sqrt(energy / frame) < 0.05 * peak) continue;
    const correlation = new Float64Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let cross = 0;
      let shifted = 0;
      for (let i = 0; i < frame; i++) {
        const b = samples[start + i + lag];
        cross += samples[start + i] * b;
        shifted += b * b;
      }
      correlation[lag] = cross / Math.sqrt(energy * shifted || 1);
    }
    let best = minLag;
    for (let lag = minLag; lag <= maxLag; lag++) if (correlation[lag] > correlation[best]) best = lag;
    if (correlation[best] < threshold) continue;
    let chosen = best;
    for (let lag = minLag + 1; lag < best; lag++) {
      if (correlation[lag] >= 0.9 * correlation[best] && correlation[lag] >= correlation[lag - 1] && correlation[lag] >= correlation[lag + 1]) {
        chosen = lag;
        break;
      }
    }
    const a = correlation[chosen - 1];
    const b = correlation[chosen];
    const c = correlation[chosen + 1];
    const denominator = a - 2 * b + c;
    const refined = chosen + (denominator ? (0.5 * (a - c)) / denominator : 0);
    values.push(sampleRate / refined);
  }
  values.sort((x, y) => x - y);
  return { medianHz: values.length ? values[Math.floor(values.length / 2)] : null, voicedFrames: values.length, frames };
}
