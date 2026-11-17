export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(random) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

export function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

export function sampleWeighted(weights, random) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!(total > 0) || weights.some(weight => !(weight >= 0))) throw new Error('Weights must be nonnegative with a positive sum.');
  let threshold = random() * total;
  for (let index = 0; index < weights.length; index++) {
    threshold -= weights[index];
    if (threshold < 0) return index;
  }
  return weights.length - 1;
}
