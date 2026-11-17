const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function normalizeWords(text) {
  return text.toLowerCase().replace(/['\u2019]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    .map(word => (/^\d+$/.test(word) && Number(word) <= 20 ? numberWords[Number(word)] : word));
}

export function wordErrorRate(reference, hypothesis) {
  const ref = normalizeWords(reference);
  const hyp = normalizeWords(hypothesis);
  if (!ref.length) throw new Error('Reference text has no words.');
  const table = Array.from({ length: ref.length + 1 }, (_, i) => Array.from({ length: hyp.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= hyp.length; j++) {
      table[i][j] = Math.min(table[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1), table[i - 1][j] + 1, table[i][j - 1] + 1);
    }
  }
  let i = ref.length;
  let j = hyp.length;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && table[i][j] === table[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      if (ref[i - 1] !== hyp[j - 1]) substitutions++;
      i--;
      j--;
    } else if (i > 0 && table[i][j] === table[i - 1][j] + 1) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }
  return { wer: (substitutions + deletions + insertions) / ref.length, substitutions, deletions, insertions, referenceWords: ref.length, hypothesisWords: hyp.length };
}
