export function fft(real, imaginary) {
  const n = real.length;
  if (n < 2 || (n & (n - 1)) !== 0 || imaginary.length !== n) throw new Error('FFT length must be a power of two.');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let wReal = 1;
      let wImaginary = 0;
      for (let k = 0; k < length / 2; k++) {
        const a = start + k;
        const b = a + length / 2;
        const tReal = real[b] * wReal - imaginary[b] * wImaginary;
        const tImaginary = real[b] * wImaginary + imaginary[b] * wReal;
        real[b] = real[a] - tReal;
        imaginary[b] = imaginary[a] - tImaginary;
        real[a] += tReal;
        imaginary[a] += tImaginary;
        const nextReal = wReal * stepReal - wImaginary * stepImaginary;
        wImaginary = wReal * stepImaginary + wImaginary * stepReal;
        wReal = nextReal;
      }
    }
  }
}

export function hannWindow(size) {
  return Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
}

export function magnitudeSpectrum(frame, window) {
  const real = Float64Array.from(frame, (value, i) => value * window[i]);
  const imaginary = new Float64Array(frame.length);
  fft(real, imaginary);
  return Float64Array.from({ length: frame.length / 2 + 1 }, (_, i) => Math.hypot(real[i], imaginary[i]));
}
