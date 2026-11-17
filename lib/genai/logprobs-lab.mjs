import { buildRequest, AzureRequestError } from '../azure.mjs';
import { entropyBits } from '../media/linear-algebra.mjs';
import { experimentResult, table, bars, text } from './contract.mjs';

export const logprobPrompts = [
  { id: 'capital', label: 'A confident answer', prompt: 'What is the capital of France? Answer with one word.' },
  { id: 'number10', label: 'A "random" choice from 1 to 10', prompt: 'Pick a random whole number from 1 to 10. Answer with only the number.' },
  { id: 'number100', label: 'A "random" choice from 1 to 100', prompt: 'Pick a random whole number from 1 to 100. Answer with only the number.' },
  { id: 'story', label: 'An open-ended story start', prompt: 'Write a one-sentence story about a robot. Begin the story directly.' },
];
export const SWEEP_PROMPT_ID = 'number100';
export const SWEEP_TEMPERATURES = [0.3, 1, 2];
export const SWEEP_SAMPLES = 100;

export function distributionFromLogprobs(top) {
  const tokens = top.map(entry => ({ token: entry.token, probability: Math.exp(entry.logprob) })).sort((a, b) => b.probability - a.probability);
  const coveredMass = tokens.reduce((sum, entry) => sum + entry.probability, 0);
  return { tokens, coveredMass, entropyBits: entropyBits(tokens.map(entry => entry.probability / coveredMass)) };
}

export function applyTemperature(probabilities, temperature) {
  if (!(temperature > 0)) throw new Error('Temperature must be positive.');
  const scaled = probabilities.map(probability => probability ** (1 / temperature));
  const total = scaled.reduce((sum, value) => sum + value, 0);
  return scaled.map(value => value / total);
}

export function empiricalFrequencies(samples, tokens) {
  const counts = tokens.map(token => samples.filter(sample => sample === token).length);
  const matched = counts.reduce((sum, count) => sum + count, 0);
  return { frequencies: counts.map(count => count / samples.length), outside: (samples.length - matched) / samples.length };
}

export function distanceToPrediction(predicted, empirical) {
  return 0.5 * (predicted.reduce((sum, value, index) => sum + Math.abs(value - empirical.frequencies[index]), 0) + empirical.outside);
}

const labels = [
  'Four prompts, four real next-token distributions',
  'Temperature reshapes the same probabilities',
  'A reasoning model does not expose its distribution',
];
const pct = value => `${(100 * value).toFixed(value < 0.001 ? 4 : 2)}%`;
const quoted = token => JSON.stringify(token);

export const logprobsLab = {
  id: '30-logprobs', title: 'The model\'s real probabilities', minutes: 10, series: 'genai',
  concept: 'At every step a language model scores every possible next token. Sampling picks from that distribution; temperature reshapes it. Lab 00 showed this in a toy; here it is in a production model.',
  question: 'Why is the answer "Paris" almost certain, a "random" number from 1 to 10 dominated by a single choice, and a random number from 1 to 100 spread over a few favorites?',
  caveat: 'Probabilities describe the model\'s next-token scores, not factual truth or calibrated confidence. Only the top 10 alternatives are returned, so a small tail is missing. Reasoning models do not return log probabilities.',
  exercise: 'Add a prompt to logprobPrompts in lib/genai/logprobs-lab.mjs. Predict whether its distribution will be sharp or flat before you redeploy.',
  cases: labels.map(label => ({ label, experiment: true })),
  async run(ctx) {
    let started = performance.now();
    const calls = [];
    const probes = [];
    for (const prompt of logprobPrompts) {
      const response = await ctx.azure.chat(buildRequest({
        model: 'standard', messages: [{ role: 'user', content: prompt.prompt }],
        parameters: { max_tokens: 1, temperature: 1, logprobs: true, top_logprobs: 10 },
      }, ctx.config));
      calls.push(response.call);
      const entry = response.choices[0].logprobs?.content?.[0];
      if (!entry?.top_logprobs?.length) throw new Error(`Azure returned no log probabilities for ${prompt.id}.`);
      probes.push({ ...prompt, sampledToken: response.choices[0].message.content, ...distributionFromLogprobs(entry.top_logprobs) });
    }
    ctx.addResult(experimentResult({
      label: labels[0], startedAt: started, calls,
      summary: 'Ask GPT-4o for exactly one token with temperature 1, logprobs enabled, and the ten most likely alternatives. Convert each log probability to a probability with exp().',
      output: probes.map(probe => `${probe.label}: sampled ${quoted(probe.sampledToken)}; top choice ${quoted(probe.tokens[0].token)} at ${pct(probe.tokens[0].probability)}; entropy ${probe.entropyBits.toFixed(2)} bits over the top 10.`).join('\n'),
      measurements: { model: 'gpt-4o', probes },
      display: [
        ...probes.flatMap(probe => [
          bars(`${probe.label}: "${probe.prompt}"`, probe.tokens.slice(0, 6).map(entry => ({ label: quoted(entry.token), value: Number((100 * entry.probability).toFixed(4)), max: 100, detail: pct(entry.probability) }))),
          text(`Sampled token: ${quoted(probe.sampledToken)}. Top-10 probability mass: ${pct(probe.coveredMass)}. Entropy: ${probe.entropyBits.toFixed(2)} bits (0 means certain; log2(10)=3.32 means ten equally likely choices).`),
        ]),
        table('All ten alternatives', ['Prompt', 'Rank', 'Token', 'Probability'],
          probes.flatMap(probe => probe.tokens.map((entry, rank) => [probe.label, rank + 1, quoted(entry.token), pct(entry.probability)]))),
      ],
    }));
    started = performance.now();
    const spread = probes.find(probe => probe.id === SWEEP_PROMPT_ID);
    const tokens = spread.tokens.map(entry => entry.token);
    const raw = spread.tokens.map(entry => entry.probability / spread.coveredMass);
    const sweep = [];
    const sweepCalls = [];
    for (const temperature of SWEEP_TEMPERATURES) {
      const response = await ctx.azure.chat(buildRequest({
        model: 'standard', messages: [{ role: 'user', content: spread.prompt }],
        parameters: { max_tokens: 1, temperature, n: SWEEP_SAMPLES },
      }, ctx.config));
      sweepCalls.push(response.call);
      const samples = response.choices.map(choice => choice.message.content);
      const predicted = applyTemperature(raw, temperature);
      const empirical = empiricalFrequencies(samples, tokens);
      sweep.push({ temperature, samples: samples.length, predicted, empirical: empirical.frequencies, outside: empirical.outside, distance: distanceToPrediction(predicted, empirical) });
    }
    ctx.addResult(experimentResult({
      label: labels[1], startedAt: started, calls: sweepCalls,
      summary: `Predict each temperature's distribution as p^(1/T), renormalized, from the temperature-1 probabilities of the "${spread.label.toLowerCase()}" prompt. Then draw ${SWEEP_SAMPLES} real samples at each temperature in one request (n=${SWEEP_SAMPLES}, max_tokens=1) and compare.`,
      output: sweep.map(row => `T=${row.temperature}: predicted top ${pct(Math.max(...row.predicted))}, sampled top ${pct(Math.max(...row.empirical))}, distance between prediction and ${row.samples} samples ${row.distance.toFixed(3)} (0 identical, 1 disjoint).`).join('\n'),
      measurements: { model: 'gpt-4o', prompt: spread.prompt, tokens, rawTop10: raw, sweep },
      display: [
        text(`Only ${SWEEP_SAMPLES} samples per temperature are drawn, so empirical frequencies are noisy. The question is whether the prediction is close, not exact.`),
        table('Predicted versus sampled probability', ['Token', 'Raw (T=1)', ...sweep.flatMap(row => [`T=${row.temperature} predicted`, `T=${row.temperature} sampled`])],
          tokens.map((token, index) => [quoted(token), pct(raw[index]), ...sweep.flatMap(row => [pct(row.predicted[index]), pct(row.empirical[index])])])),
        table('How close was the prediction?', ['Temperature', 'Samples', 'Sampled outside the top 10', 'Distance (0 identical, 1 disjoint)'],
          sweep.map(row => [row.temperature, row.samples, pct(row.outside), row.distance.toFixed(3)])),
      ],
    }));
    started = performance.now();
    const reasoningRequest = buildRequest({
      model: 'reasoning', messages: [{ role: 'user', content: logprobPrompts[0].prompt }],
      parameters: { logprobs: true, top_logprobs: 5, max_completion_tokens: 400 },
    }, ctx.config);
    let outcome;
    let call;
    try {
      const response = await ctx.azure.chat(reasoningRequest);
      call = response.call;
      outcome = { accepted: true, logprobsReturned: Boolean(response.choices[0].logprobs?.content?.length) };
    } catch (error) {
      // Only Azure's documented refusal of this parameter is a finding; throttling, authorization, or outages are failures.
      if (!(error instanceof AzureRequestError) || error.status !== 400 || error.azureCode !== 'unsupported_parameter') throw error;
      call = { operation: 'chat.completions', deployment: reasoningRequest.model, model: reasoningRequest.model, latencyMs: error.latencyMs ?? 0, attempts: error.attempts ?? 1, waitedMs: error.waitedMs ?? 0, usage: null, httpStatus: error.status, error: error.azureCode };
      outcome = { accepted: false, status: error.status, code: error.azureCode, message: error.message };
    }
    ctx.addResult(experimentResult({
      label: labels[2], startedAt: started, calls: [call],
      summary: 'Send the same one-word question to the GPT-5-mini reasoning deployment with logprobs enabled. The result, success or refusal, is recorded exactly as Azure returned it.',
      output: outcome.accepted ? `Azure accepted the request; log probabilities returned: ${outcome.logprobsReturned}.` : `Azure refused with HTTP ${outcome.status} ${outcome.code}: ${outcome.message}`,
      measurements: { model: 'gpt-5-mini', outcome },
      display: [text(outcome.accepted ? `Azure accepted logprobs for this deployment (returned: ${outcome.logprobsReturned}).` :
        'The reasoning deployment rejects this parameter. A capability that exists in one model may be absent in another, so choose models for the features you need, not only for answer quality.')],
    }));
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [distributions, temperatures, reasoning] = results;
    const probes = distributions.measurements.probes;
    const sweep = temperatures.measurements.sweep;
    const entropy = id => probes.find(probe => probe.id === id).entropyBits;
    const peak = row => Math.max(...row.predicted);
    return [
      check('Each prompt returned ten ordered, valid probabilities', probes.length === logprobPrompts.length && probes.every(probe => probe.tokens.length === 10 && probe.coveredMass <= 1.0001 &&
        probe.tokens.every((entry, index) => entry.probability > 0 && (index === 0 || entry.probability <= probe.tokens[index - 1].probability))), probes.map(probe => `${probe.id}: ${pct(probe.coveredMass)} covered`).join('; ')),
      check('The factual question is sharper than the spread-out random choice', entropy('capital') < entropy(SWEEP_PROMPT_ID), `${entropy('capital').toFixed(3)} < ${entropy(SWEEP_PROMPT_ID).toFixed(3)} bits`),
      check('Every temperature drew the planned number of samples', sweep.length === SWEEP_TEMPERATURES.length && sweep.every(row => row.samples === SWEEP_SAMPLES), `${SWEEP_SAMPLES} samples at each temperature.`),
      check('Predicted distributions are normalized and sharper at lower temperature', sweep.every(row => Math.abs(row.predicted.reduce((a, b) => a + b, 0) - 1) < 1e-9) && peak(sweep[0]) >= peak(sweep[1]) && peak(sweep[1]) >= peak(sweep[2]),
        sweep.map(row => `T=${row.temperature}: ${pct(peak(row))}`).join(', ')),
      check('Prediction-versus-sample distances are measured', sweep.every(row => row.distance >= 0 && row.distance <= 1), sweep.map(row => `T=${row.temperature}: ${row.distance.toFixed(3)}`).join(', ')),
      check('Real samples are more concentrated at low temperature than at high temperature', Math.max(...sweep[0].empirical) > Math.max(...sweep[2].empirical),
        `Leading token share ${pct(Math.max(...sweep[0].empirical))} at T=${sweep[0].temperature} versus ${pct(Math.max(...sweep[2].empirical))} at T=${sweep[2].temperature}.`),
      check('Samples at temperature 1 match the reported probabilities', sweep.find(row => row.temperature === 1).distance < 0.3,
        `Distance ${sweep.find(row => row.temperature === 1).distance.toFixed(3)} (0 identical, 1 disjoint) from ${SWEEP_SAMPLES} samples.`),
      check('The reasoning-model outcome is a real acceptance or Azure\'s documented refusal, not an unrelated failure', reasoning.measurements.outcome.accepted === true ||
        (reasoning.measurements.outcome.status === 400 && reasoning.measurements.outcome.code === 'unsupported_parameter'), JSON.stringify(reasoning.measurements.outcome).slice(0, 220)),
    ];
  },
};
