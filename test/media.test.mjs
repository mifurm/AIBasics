import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { encodePng, decodePng, pngChunks, crc32, resizeBox, meanAbsoluteDifference } from '../lib/media/png.mjs';
import { createCanvas, fillCircle, fillTriangle, drawText, canvasToPng, colors } from '../lib/media/raster.mjs';
import { parseWav, encodeWav, addNoiseAtSnr, estimatePitch, rms, spectrogramCanvas, silenceRatio, concatSamples, silence } from '../lib/media/wav.mjs';
import { fft } from '../lib/media/fft.mjs';
import { wordErrorRate, normalizeWords } from '../lib/media/text-metrics.mjs';
import { pca2d, cosine, entropyBits, totalVariationDistance } from '../lib/media/linear-algebra.mjs';
import { mulberry32, shuffled, sampleWeighted } from '../lib/media/random.mjs';

const tone = (hz, seconds, sampleRate, harmonics = [1]) => Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, i) =>
  harmonics.reduce((sum, weight, h) => sum + (weight / harmonics.length) * Math.sin((2 * Math.PI * hz * (h + 1) * i) / sampleRate), 0));

test('PNG codec round-trips every supported layout, and detects corruption', () => {
  for (const channels of [1, 3, 4]) {
    const data = Uint8Array.from({ length: 5 * 4 * channels }, (_, i) => (i * 37 + channels) & 255);
    const decoded = decodePng(encodePng({ width: 5, height: 4, data, channels }));
    assert.equal(decoded.channels, channels);
    assert.deepEqual([...decoded.data], [...data]);
  }
  const png = encodePng({ width: 2, height: 2, data: new Uint8Array(16), channels: 4 });
  assert.deepEqual(pngChunks(png).map(entry => entry.type), ['IHDR', 'IDAT', 'IEND']);
  const corrupted = Buffer.from(png);
  corrupted[corrupted.length - 20] ^= 0xff;
  assert.throws(() => decodePng(corrupted), /Corrupt|wrong length|inflate|invalid/i);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('PNG decoder reverses every filter type that other encoders may use', () => {
  const rows = [[10, 20, 30, 40, 50, 60], [11, 22, 33, 44, 55, 66], [90, 80, 70, 60, 50, 40], [5, 15, 25, 35, 45, 55], [100, 110, 120, 130, 140, 150]];
  const stride = 6;
  const raw = [];
  rows.forEach((row, y) => {
    const filter = y;
    raw.push(filter);
    row.forEach((value, i) => {
      const left = i >= 3 ? row[i - 3] : 0;
      const up = y > 0 ? rows[y - 1][i] : 0;
      const upLeft = y > 0 && i >= 3 ? rows[y - 1][i - 3] : 0;
      const paeth = () => {
        const estimate = left + up - upLeft;
        const [dl, du, dul] = [left, up, upLeft].map(candidate => Math.abs(estimate - candidate));
        return dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      };
      const predictor = [0, left, up, (left + up) >> 1, paeth()][filter];
      raw.push((value - predictor) & 255);
    });
  });
  const png = encodePng({ width: 2, height: 5, data: new Uint8Array(30), channels: 3 });
  const chunks = pngChunks(png);
  const idat = deflateSync(Buffer.from(raw));
  const rebuilt = Buffer.concat([png.subarray(0, 8), ...['IHDR', 'IDAT', 'IEND'].map(type => {
    const data = type === 'IDAT' ? idat : chunks.find(entry => entry.type === type).data;
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'latin1');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  })]);
  assert.deepEqual([...decodePng(rebuilt).data], rows.flat());
  assert.equal(stride, 6);
});

test('rasterizer draws measurable shapes and text, and rejects unsupported glyphs', () => {
  const canvas = createCanvas(100, 100);
  fillCircle(canvas, 50, 50, 20, colors.red);
  const red = [...Array(100 * 100).keys()].filter(p => canvas.data[p * 4] === 220 && canvas.data[p * 4 + 1] === 30).length;
  assert.ok(Math.abs(red - Math.PI * 400) < 40);
  const triangle = createCanvas(100, 100);
  fillTriangle(triangle, [10, 10], [90, 10], [10, 90], colors.blue);
  assert.ok(Math.abs([...Array(10000).keys()].filter(p => triangle.data[p * 4 + 2] === 220).length - 3200) < 160);
  const text = createCanvas(40, 12);
  drawText(text, 'A7', 1, 1, 1, colors.black);
  assert.ok([...Array(480).keys()].some(p => text.data[p * 4] === 20));
  assert.throws(() => drawText(text, 'a~', 0, 0, 1), /Unsupported/);
  assert.deepEqual(decodePng(canvasToPng(canvas)).data.slice(0, 4), Uint8Array.from([255, 255, 255, 255]));
});

test('resizing preserves average colour and image difference is measured', () => {
  const left = { width: 4, height: 4, data: Uint8Array.from({ length: 64 }, (_, i) => (i % 4 === 3 ? 255 : 100)) };
  const small = resizeBox({ ...left, channels: 4 }, 2, 2);
  assert.equal(small.data[0], 100);
  const right = { width: 4, height: 4, data: Uint8Array.from(left.data, (value, i) => (i % 4 === 3 ? 255 : value + 10)) };
  assert.equal(meanAbsoluteDifference(left, right), 10);
  assert.throws(() => meanAbsoluteDifference(left, small));
});

test('WAV codec handles real-world headers: extra chunks, streaming sizes, and unsupported formats', () => {
  const samples = tone(440, 0.1, 8000);
  const wav = encodeWav(samples, 8000);
  const parsed = parseWav(wav);
  assert.equal(parsed.sampleRate, 8000);
  assert.ok(Math.abs(parsed.durationSeconds - 0.1) < 1e-9);
  assert.ok(Math.abs(parsed.samples[10] - samples[10]) < 1e-3);
  const list = Buffer.concat([Buffer.from('LIST'), Buffer.from([4, 0, 0, 0]), Buffer.from('abcd')]);
  const withList = Buffer.concat([wav.subarray(0, 36), list, wav.subarray(36)]);
  assert.equal(parseWav(withList).samples.length, samples.length);
  const streaming = Buffer.from(wav);
  streaming.writeUInt32LE(0xffffffff, 40);
  assert.equal(parseWav(streaming).samples.length, samples.length);
  const eightBit = Buffer.from(wav);
  eightBit.writeUInt16LE(8, 34);
  assert.throws(() => parseWav(eightBit), /16-bit/);
  assert.throws(() => parseWav(Buffer.from('nonsense')), /RIFF/);
});

test('FFT places a pure tone in the expected frequency bin', () => {
  const n = 256;
  const real = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 16 * i) / n));
  const imaginary = new Float64Array(n);
  fft(real, imaginary);
  const magnitudes = Array.from({ length: n / 2 }, (_, i) => Math.hypot(real[i], imaginary[i]));
  assert.equal(magnitudes.indexOf(Math.max(...magnitudes)), 16);
  assert.throws(() => fft(new Float64Array(6), new Float64Array(6)));
});

test('pitch estimation recovers harmonic tones, including a weak fundamental, and rejects noise', () => {
  for (const [hz, harmonics] of [[120, [1, 0.5, 0.25]], [220, [1]], [300, [0.4, 1, 0.6]], [440, [1, 0.5]]]) {
    const result = estimatePitch(tone(hz, 0.5, 16000, harmonics), 16000, { minHz: 80, maxHz: 900 });
    assert.ok(Math.abs(result.medianHz - hz) / hz < 0.02, `${hz} Hz estimated as ${result.medianHz}`);
  }
  const random = mulberry32(3);
  const noise = Float32Array.from({ length: 8000 }, () => random() * 2 - 1);
  assert.ok(estimatePitch(noise, 16000, { minHz: 80, maxHz: 900 }).voicedFrames < 5);
  assert.equal(estimatePitch(new Float32Array(8000), 16000).medianHz, null);
});

test('added noise reaches the requested signal-to-noise ratio and never clips', () => {
  const clean = tone(200, 1, 16000);
  for (const snr of [20, 5, -5]) {
    const { samples, measuredSnrDb } = addNoiseAtSnr(clean, snr, mulberry32(7));
    assert.ok(Math.abs(measuredSnrDb - snr) < 0.5, `${snr}: ${measuredSnrDb}`);
    assert.ok(Math.max(...samples.map(Math.abs)) <= 0.9801);
  }
  assert.throws(() => addNoiseAtSnr(new Float32Array(100), 10, mulberry32(1)), /silent/);
  assert.ok(rms(clean) > 0.6 && rms(clean) < 0.8);
});

test('spectrogram shows where the energy is, and silence is measured', () => {
  const sampleRate = 16000;
  const canvas = spectrogramCanvas(tone(2000, 1, sampleRate), sampleRate, { maxHz: 8000 });
  assert.equal(canvas.height, 256 + 16);
  const column = 34 + 20;
  let brightestRow = 0;
  let brightest = -1;
  for (let row = 0; row < 256; row++) {
    const brightness = canvas.data[(row * canvas.width + column) * 4] + canvas.data[(row * canvas.width + column) * 4 + 1];
    if (brightness > brightest) { brightest = brightness; brightestRow = row; }
  }
  assert.ok(Math.abs((255 - brightestRow) * (sampleRate / 512) - 2000) < 120);
  assert.ok(decodePng(canvasToPng(canvas)).width === canvas.width);
  const gap = concatSamples([tone(300, 0.5, sampleRate), silence(0.5, sampleRate)]);
  assert.ok(Math.abs(silenceRatio(gap, sampleRate) - 0.5) < 0.05);
  assert.throws(() => spectrogramCanvas(new Float32Array(10), sampleRate), /short/);
});

test('word error rate counts substitutions, deletions and insertions, ignoring case, punctuation and digit form', () => {
  assert.equal(wordErrorRate('The robot club meets at four.', 'the Robot club meets at 4').wer, 0);
  const result = wordErrorRate('bring three notebooks today', 'bring tree notebooks');
  assert.deepEqual([result.substitutions, result.deletions, result.insertions], [1, 1, 0]);
  assert.equal(result.wer, 0.5);
  assert.equal(wordErrorRate('a b', 'a b c d').insertions, 2);
  assert.equal(wordErrorRate('a b', '').wer, 1);
  assert.throws(() => wordErrorRate('', 'x'));
  assert.deepEqual(normalizeWords("Don't stop, 3 times!"), ['dont', 'stop', 'three', 'times']);
});

test('PCA finds the dominant direction, cosine and distribution distances behave', () => {
  const line = Array.from({ length: 8 }, (_, i) => [i, 2 * i + (i % 2) * 0.01, -i]);
  const { coordinates, explainedVariance } = pca2d(line);
  assert.ok(explainedVariance[0] > 0.999);
  assert.ok(coordinates[7][0] > coordinates[0][0] || coordinates[7][0] < coordinates[0][0]);
  assert.deepEqual(pca2d(line).coordinates, coordinates);
  assert.ok(Math.abs(cosine([1, 0], [1, 1]) - Math.SQRT1_2) < 1e-12);
  assert.throws(() => cosine([0, 0], [1, 1]));
  assert.ok(Math.abs(entropyBits([0.5, 0.5]) - 1) < 1e-12);
  assert.equal(totalVariationDistance([1, 0], [0, 1]), 1);
});

test('seeded randomness is reproducible and weighted sampling respects weights', () => {
  assert.deepEqual([mulberry32(5)(), mulberry32(5)()], [mulberry32(5)(), mulberry32(5)()]);
  assert.deepEqual([...shuffled([1, 2, 3, 4, 5, 6], mulberry32(9))].sort(), [1, 2, 3, 4, 5, 6]);
  const random = mulberry32(2);
  const counts = [0, 0];
  for (let i = 0; i < 4000; i++) counts[sampleWeighted([1, 3], random)]++;
  assert.ok(Math.abs(counts[1] / 4000 - 0.75) < 0.03);
  assert.throws(() => sampleWeighted([0, 0], random));
});
