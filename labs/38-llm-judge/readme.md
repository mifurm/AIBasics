# 38 - Can a model grade a model?

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**14 minutes.** Prerequisites: labs 12 and 24; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether a judge model can be fooled by a longer, more confident wrong answer.
2. Run `npm run azure:agents -- 38-llm-judge`.
3. Compare each judge's scorecard, then the forced-choice position test.

**What happens:** two judges (GPT-4o and GPT-5-mini) grade 10 answer pairs, each in both orders (20 verdicts each):
six questions with one correct and one wrong answer (three where the wrong answer is longer and sounds sure of
itself) and four with two equally good answers. The truth is verified by independent arithmetic. A final condition
removes the "tie" option and forces a choice between equally good answers, which measures position bias directly
(16 more verdicts). The whole lab makes 56 requests.

**Expected:** a judge can be fooled by a wrong answer that looks authoritative; a judge may look unbiased when it can
say "tie" yet lean toward the first-listed answer when forced to choose (in our runs 50-88% of forced picks went to
the first-listed answer, from only eight verdicts per judge, so treat that as an illustration, not a measured rate);
and the two judges differ.

**Try:** add a pair to `truthPairs` in `lib/genai/judge-lab.mjs` where the correct answer is longer.

**Limits:** ten simple pairs and one run per judge: enough to illustrate the checks, not to rank the models.
Keep a human-checked sample when you use a model as a grader, and judge both orders.
