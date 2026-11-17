import { buildRequest } from '../azure.mjs';
import { experimentResult, table, bars, text } from './contract.mjs';

export const truthPairs = [
  { id: 'train', question: 'A train leaves at 14:20 and arrives at 17:05. How long is the journey?', answer: 2 * 60 + 45, unit: 'minutes', longer: 'wrong',
    correct: 'The journey takes 2 hours 45 minutes.',
    wrong: 'The journey takes 2 hours 35 minutes. From 14:20 to 16:20 is exactly 2 hours, and from 16:20 to 17:05 is 35 minutes, so the total is 2 hours and 35 minutes.' },
  { id: 'pencils', question: 'A box holds 12 pencils. How many boxes are needed to hold 100 pencils?', answer: 9, unit: 'boxes', longer: 'correct',
    correct: '9 boxes. Eight boxes hold only 96 pencils, which leaves 4 pencils over, so a ninth box is needed.',
    wrong: '8 boxes.' },
  { id: 'percent', question: 'What is 15% of 240?', answer: 36, unit: '', longer: 'wrong',
    correct: '15% of 240 is 36.',
    wrong: '15% of 240 is 24. Ten percent of 240 is 24, and fifteen percent follows the same pattern, so the answer is 24.' },
  { id: 'notebooks', question: 'If 3 notebooks cost 4.50, how much do 7 notebooks cost?', answer: 10.5, unit: '', longer: 'correct',
    correct: '10.50. One notebook costs 4.50 divided by 3, which is 1.50, and 7 times 1.50 is 10.50.',
    wrong: '10.00.' },
  { id: 'decimals', question: 'Which is larger, 0.8 or 0.75?', answer: 0.8, unit: '', longer: 'wrong',
    correct: '0.8 is larger.',
    wrong: '0.75 is larger, because 75 is bigger than 8. Comparing the digits after the decimal point confirms that 0.75 is greater than 0.8.' },
  { id: 'club', question: 'A class has 28 students and 3/7 of them are in the robot club. How many students are in the club?', answer: 12, unit: 'students', longer: 'correct',
    correct: '12 students. One seventh of 28 is 4, and 3 times 4 is 12.',
    wrong: '9 students.' },
];

export const equalPairs = [
  { id: 'japan', question: 'What is the capital of Japan?', a: 'Tokyo is the capital of Japan.', b: 'The capital of Japan is Tokyo.' },
  { id: 'minutes', question: 'How many minutes are in two hours?', a: 'Two hours is 120 minutes.', b: 'There are 120 minutes in two hours.' },
  { id: 'product', question: 'What is 9 times 7?', a: '9 times 7 equals 63.', b: 'The product of 9 and 7 is 63.' },
  { id: 'planet', question: 'Name the largest planet in our solar system.', a: 'Jupiter is the largest planet in the solar system.', b: 'The largest planet in our solar system is Jupiter.' },
];

// Independent arithmetic that proves each "correct" answer is correct and each "wrong" answer is not.
export const truthChecks = {
  train: { marker: '2 hours 45 minutes', verify: () => 14 * 60 + 20 + (2 * 60 + 45) === 17 * 60 + 5 },
  pencils: { marker: '9 boxes', verify: () => Math.ceil(100 / 12) === 9 && 8 * 12 === 96 },
  percent: { marker: 'is 36', verify: () => (15 * 240) / 100 === 36 },
  notebooks: { marker: '10.50', verify: () => (450 / 3) * 7 === 1050 },
  decimals: { marker: '0.8 is larger', verify: () => 0.8 > 0.75 },
  club: { marker: '12 students', verify: () => (28 / 7) * 3 === 12 },
};

export const judgeSystem = 'You are a strict grader. You will see a question and two candidate answers. Decide which answer is better. An answer is better only if it is correct. If both answers are equally correct and equally good, reply tie. Respond with JSON only.';
export const forcedSystem = 'You are a strict grader. You will see a question and two candidate answers. Decide which answer is better, even if they seem equally good. You must choose exactly one winner. Respond with JSON only.';
export const judgePrompt = (question, first, second) => `Question: ${question}\n\nResponse 1: ${first}\n\nResponse 2: ${second}\n\nWhich response is better? Return JSON with winner ("1", "2" or "tie") and reason (at most 20 words).`;
export const forcedPrompt = (question, first, second) => `Question: ${question}\n\nResponse 1: ${first}\n\nResponse 2: ${second}\n\nWhich response is better? Return JSON with winner ("1" or "2") and reason (at most 20 words).`;
const verdictSchema = enumeration => ({ type: 'json_schema', json_schema: { name: 'verdict', strict: true, schema: { type: 'object', properties: { winner: { type: 'string', enum: enumeration }, reason: { type: 'string' } }, required: ['winner', 'reason'], additionalProperties: false } } });
const schema = verdictSchema(['1', '2', 'tie']);
const forcedFormat = verdictSchema(['1', '2']);

export function tasks() {
  const list = [];
  truthPairs.forEach((pair, index) => {
    const canonical = index % 2 === 0 ? ['correct', 'wrong'] : ['wrong', 'correct'];
    for (const swapped of [false, true]) {
      const order = swapped ? [...canonical].reverse() : canonical;
      list.push({ pair: pair.id, kind: 'truth', question: pair.question, slots: order, texts: order.map(slot => pair[slot]), swapped, longer: pair.longer });
    }
  });
  equalPairs.forEach(pair => {
    for (const swapped of [false, true]) {
      const order = swapped ? ['b', 'a'] : ['a', 'b'];
      list.push({ pair: pair.id, kind: 'equal', question: pair.question, slots: order, texts: order.map(slot => pair[slot]), swapped });
    }
  });
  return list;
}

const share = (count, total) => (total ? count / total : null);

export function summarizeJudge(judgments) {
  const truth = judgments.filter(entry => entry.kind === 'truth');
  const equal = judgments.filter(entry => entry.kind === 'equal');
  const byPair = rows => Object.values(Object.groupBy(rows, entry => entry.pair));
  const consistent = rows => share(byPair(rows).filter(group => new Set(group.map(entry => entry.winnerContent)).size === 1).length, byPair(rows).length);
  const decided = judgments.filter(entry => entry.winnerSlot !== 'tie');
  const nonTieEqual = equal.filter(entry => entry.winnerSlot !== 'tie');
  const wrongLonger = truth.filter(entry => entry.longer === 'wrong');
  const correctLonger = truth.filter(entry => entry.longer === 'correct');
  return {
    judgments: judgments.length,
    accuracy: share(truth.filter(entry => entry.winnerContent === 'correct').length, truth.length),
    truthConsistency: consistent(truth),
    foolishWhenWrongIsLonger: share(wrongLonger.filter(entry => entry.winnerContent === 'wrong').length, wrongLonger.length),
    accuracyWhenCorrectIsLonger: share(correctLonger.filter(entry => entry.winnerContent === 'correct').length, correctLonger.length),
    equalTieRate: share(equal.filter(entry => entry.winnerSlot === 'tie').length, equal.length),
    equalFirstSlotShare: share(nonTieEqual.filter(entry => entry.winnerSlot === '1').length, nonTieEqual.length),
    equalConsistency: consistent(equal),
    firstSlotShareOverall: share(decided.filter(entry => entry.winnerSlot === '1').length, decided.length),
  };
}

const judges = [{ key: 'standard', label: 'GPT-4o' }, { key: 'reasoning', label: 'GPT-5-mini' }];
const pct = value => (value === null ? 'n/a' : `${(100 * value).toFixed(0)}%`);
const labels = ['GPT-4o as the judge', 'GPT-5-mini as the judge', 'Forced to choose between equally good answers', 'The two judges compared'];

export function summarizeForced(judgments) {
  const groups = Object.values(Object.groupBy(judgments, entry => entry.pair));
  return {
    judgments: judgments.length,
    firstSlotShare: share(judgments.filter(entry => entry.winnerSlot === '1').length, judgments.length),
    consistency: share(groups.filter(group => new Set(group.map(entry => entry.winnerContent)).size === 1).length, groups.length),
    sameSlotBothOrders: share(groups.filter(group => new Set(group.map(entry => entry.winnerSlot)).size === 1).length, groups.length),
  };
}

export const judgeLab = {
  id: '38-llm-judge', title: 'Can a model grade a model?', minutes: 14, series: 'genai',
  concept: 'Teams often use one model to grade another model\'s answers because human review is slow. A judge is itself a model with biases. Because we know the right answers, we can measure whether the judge is accurate, whether it favors the first response it reads, and whether it is fooled by a confident, longer answer.',
  question: 'If the same two answers are shown in the opposite order, does the judge change its mind, and what does that mean for using a model as a grader?',
  caveat: 'Six simple arithmetic pairs and four equal-quality pairs, one run per judge: enough to illustrate the checks, not to rank the models. Judges can also be wrong in ways that fit their own errors. Always keep a human-checked sample, and swap positions to expose bias.',
  exercise: 'Add a pair to truthPairs in lib/genai/judge-lab.mjs where the correct answer is longer and the wrong one is confident. Predict whether each judge notices before you redeploy.',
  cases: labels.map(label => ({ label, experiment: true })),
  async run(ctx) {
    const list = tasks();
    const all = {};
    for (const judge of judges) {
      const started = performance.now();
      const calls = [];
      const judgments = [];
      for (const task of list) {
        const request = buildRequest({
          model: judge.key, messages: [{ role: 'system', content: judgeSystem }, { role: 'user', content: judgePrompt(task.question, task.texts[0], task.texts[1]) }],
          parameters: { response_format: schema, ...(judge.key === 'standard' ? { temperature: 0, max_tokens: 120 } : {}) },
        }, ctx.config);
        const response = await ctx.azure.chat(request);
        calls.push(response.call);
        const verdict = JSON.parse(response.choices[0].message.content);
        judgments.push({
          pair: task.pair, kind: task.kind, swapped: task.swapped, longer: task.longer ?? null, slots: task.slots, winnerSlot: verdict.winner,
          winnerContent: verdict.winner === 'tie' ? 'tie' : task.slots[Number(verdict.winner) - 1], reason: verdict.reason,
        });
      }
      const summary = summarizeJudge(judgments);
      all[judge.label] = summary;
      ctx.addResult(experimentResult({
        label: judge.key === 'standard' ? labels[0] : labels[1], startedAt: started, calls,
        summary: `${judge.label} judged ${list.length} prompts: six questions with one correct and one wrong answer (three where the wrong answer is longer), and four questions with two equally good answers, each shown in both orders. System instruction: "${judgeSystem}"`,
        parameters: { judge: judge.label, judgments: list.length },
        output: `Accuracy on questions with a right answer: ${pct(summary.accuracy)}. Same verdict when the order was swapped: ${pct(summary.truthConsistency)}.\nFooled when the wrong answer was longer: ${pct(summary.foolishWhenWrongIsLonger)}.\nTwo equally good answers: said tie ${pct(summary.equalTieRate)} of the time; among non-tie verdicts, picked the first-listed answer ${pct(summary.equalFirstSlotShare)}; kept the same winner after swapping ${pct(summary.equalConsistency)}.`,
        measurements: { judge: judge.label, summary, judgments },
        display: [
          bars('Judge scorecard (percent)', [
            { label: 'Accuracy where one answer is correct', value: Number(((summary.accuracy ?? 0) * 100).toFixed(1)), max: 100, detail: pct(summary.accuracy) },
            { label: 'Same verdict after swapping order', value: Number(((summary.truthConsistency ?? 0) * 100).toFixed(1)), max: 100, detail: pct(summary.truthConsistency) },
            { label: 'Fooled by a longer wrong answer', value: Number(((summary.foolishWhenWrongIsLonger ?? 0) * 100).toFixed(1)), max: 100, detail: pct(summary.foolishWhenWrongIsLonger) },
            { label: 'Calls equal answers a tie', value: Number(((summary.equalTieRate ?? 0) * 100).toFixed(1)), max: 100, detail: pct(summary.equalTieRate) },
          ]),
          table('Every judgment', ['Question', 'Kind', 'Response 1', 'Response 2', 'Winner', 'Judge reason'],
            judgments.map(entry => [entry.pair, entry.kind === 'truth' ? `right answer; ${entry.longer} answer is longer` : 'equally good', entry.slots[0], entry.slots[1], entry.winnerContent === 'tie' ? 'tie' : `${entry.winnerSlot} (${entry.winnerContent})`, entry.reason])),
          text('For right-or-wrong pairs, a correct judge always chooses the response labelled "correct", whichever position it is in. For equal pairs there is no right winner, so a fair judge should say tie or at least stay consistent when the order is swapped.'),
        ],
      }));
    }
    const [first, second] = judges.map(judge => all[judge.label]);
    const forcedList = tasks().filter(task => task.kind === 'equal');
    const forcedSummaries = {};
    const forcedStarted = performance.now();
    const forcedCalls = [];
    const forcedJudgments = {};
    for (const judge of judges) {
      forcedJudgments[judge.label] = [];
      for (const task of forcedList) {
        const request = buildRequest({
          model: judge.key, messages: [{ role: 'system', content: forcedSystem }, { role: 'user', content: forcedPrompt(task.question, task.texts[0], task.texts[1]) }],
          parameters: { response_format: forcedFormat, ...(judge.key === 'standard' ? { temperature: 0, max_tokens: 120 } : {}) },
        }, ctx.config);
        const response = await ctx.azure.chat(request);
        forcedCalls.push(response.call);
        const verdict = JSON.parse(response.choices[0].message.content);
        forcedJudgments[judge.label].push({ pair: task.pair, kind: 'forced', swapped: task.swapped, slots: task.slots, winnerSlot: verdict.winner, winnerContent: task.slots[Number(verdict.winner) - 1], reason: verdict.reason });
      }
      forcedSummaries[judge.label] = summarizeForced(forcedJudgments[judge.label]);
    }
    const [forcedFirst, forcedSecond] = judges.map(judge => forcedSummaries[judge.label]);
    ctx.addResult(experimentResult({
      label: labels[2], startedAt: forcedStarted, calls: forcedCalls,
      summary: `Show each judge the four pairs of equally good answers, in both orders, but remove the tie option: "${forcedSystem}" With no right answer, a fair judge picks each position about half the time and keeps the same winner after a swap.`,
      parameters: { judgments: forcedList.length * judges.length },
      output: judges.map(judge => `${judge.label}: chose the first-listed answer ${pct(forcedSummaries[judge.label].firstSlotShare)} of the time; same winner after swapping for ${pct(forcedSummaries[judge.label].consistency)} of pairs; same position in both orders for ${pct(forcedSummaries[judge.label].sameSlotBothOrders)} of pairs.`).join('\n'),
      measurements: { judgments: forcedJudgments, summaries: forcedSummaries },
      display: [
        table('Position bias when there is no right answer', ['Measurement', 'GPT-4o', 'GPT-5-mini'], [
          ['Chose the first-listed answer', pct(forcedFirst.firstSlotShare), pct(forcedSecond.firstSlotShare)],
          ['Kept the same winner after swapping order', pct(forcedFirst.consistency), pct(forcedSecond.consistency)],
          ['Chose the same position in both orders (pure position bias)', pct(forcedFirst.sameSlotBothOrders), pct(forcedSecond.sameSlotBothOrders)],
        ]),
        table('Every forced choice', ['Judge', 'Question', 'Response 1', 'Response 2', 'Winner', 'Reason'],
          judges.flatMap(judge => forcedJudgments[judge.label].map(entry => [judge.label, entry.pair, entry.slots[0], entry.slots[1], `${entry.winnerSlot} (answer ${entry.winnerContent})`, entry.reason]))),
        text('If a judge picks position 1 every time, it is reacting to where an answer appears, not to its quality. Averaging a verdict over both orders cancels that bias.'),
      ],
    }));
    const started = performance.now();
    const rows = [
      ['Accuracy where one answer is correct', pct(first.accuracy), pct(second.accuracy)],
      ['Same verdict after swapping order (right-or-wrong pairs)', pct(first.truthConsistency), pct(second.truthConsistency)],
      ['Fooled when the wrong answer is longer', pct(first.foolishWhenWrongIsLonger), pct(second.foolishWhenWrongIsLonger)],
      ['Accurate when the correct answer is longer', pct(first.accuracyWhenCorrectIsLonger), pct(second.accuracyWhenCorrectIsLonger)],
      ['Equal answers with a tie option: called a tie', pct(first.equalTieRate), pct(second.equalTieRate)],
      ['Equal answers, forced choice: picked the first-listed one', pct(forcedFirst.firstSlotShare), pct(forcedSecond.firstSlotShare)],
      ['Equal answers, forced choice: same winner after swapping', pct(forcedFirst.consistency), pct(forcedSecond.consistency)],
    ];
    ctx.addResult(experimentResult({
      label: labels[3], startedAt: started,
      summary: 'No new API request: compare the two judges\' recorded verdicts side by side.',
      output: rows.map(row => `${row[0]}: GPT-4o ${row[1]}, GPT-5-mini ${row[2]}`).join('\n'),
      measurements: { gpt4o: first, gpt5mini: second, forced: forcedSummaries },
      display: [
        table('Two judges, side by side', ['Check', 'GPT-4o', 'GPT-5-mini'], rows),
        text('How to use a model as a grader responsibly: test it on answers whose truth you know, judge every comparison in both orders, require agreement, and keep a human-reviewed sample. A single verdict is a hint, not evidence.'),
      ],
    }));
  },
  evaluate(results) {
    const check = (name, passed, detail) => ({ name, passed: Boolean(passed), detail });
    const [first, second, forced, compared] = results;
    const judged = [first, second];
    const planned = tasks();
    const forcedAll = Object.values(forced.measurements.judgments).flat();
    return [
      check('Each judge issued every planned judgment in both orders', judged.every(result => result.measurements.judgments.length === planned.length && result.measurements.judgments.every(entry => ['1', '2', 'tie'].includes(entry.winnerSlot))), `${planned.length} judgments each: 6 right-or-wrong questions and 4 equal questions, each in two orders.`),
      check('Every pair appears with both orderings of its two answers', judged.every(result => Object.values(Object.groupBy(result.measurements.judgments, entry => entry.pair)).every(group => group.length === 2 && group[0].slots.join() !== group[1].slots.join())), '10 pairs, each shown in both positions.'),
      check('Both judges saw the same prompts', JSON.stringify(first.measurements.judgments.map(entry => [entry.pair, entry.slots])) === JSON.stringify(second.measurements.judgments.map(entry => [entry.pair, entry.slots])), 'Identical questions, answers, and order.'),
      check('Scorecards are valid proportions', judged.every(result => ['accuracy', 'truthConsistency', 'foolishWhenWrongIsLonger', 'equalTieRate', 'equalConsistency'].every(key => result.measurements.summary[key] === null || (result.measurements.summary[key] >= 0 && result.measurements.summary[key] <= 1))),
        judged.map(result => `${result.measurements.judge}: accuracy ${pct(result.measurements.summary.accuracy)}`).join('; ')),
      check('The forced-choice condition made every judge pick a position for all equal pairs in both orders', forcedAll.length === 16 && forcedAll.every(entry => ['1', '2'].includes(entry.winnerSlot)),
        `${forcedAll.length} forced verdicts; GPT-4o first-slot share ${pct(forced.measurements.summaries['GPT-4o'].firstSlotShare)}, GPT-5-mini ${pct(forced.measurements.summaries['GPT-5-mini'].firstSlotShare)}.`),
      check('The comparison reuses recorded verdicts, with no hidden requests', compared.apiCalls.length === 0 && compared.measurements.gpt4o.judgments === planned.length, 'Zero additional API requests.'),
    ];
  },
};
