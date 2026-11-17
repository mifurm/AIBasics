# 30 - The model's real probabilities

**10 minutes.** Prerequisites: labs 04, 05 and 00; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether "pick a random number from 1 to 10" is spread evenly across the ten numbers.
2. Run `npm run azure:agents -- 30-logprobs`.
3. Read the real top-10 next-token probabilities for four prompts.
4. Check the temperature prediction against 100 real samples per temperature.

**What happens:** GPT-4o is asked for exactly one token with `logprobs` enabled. Each log probability becomes
a probability with `exp()`. For the "random 1 to 100" prompt the lab then **predicts** what temperature
0.3, 1, and 2 should do (raise each probability to the power 1/T and renormalize) and compares that
with 100 real samples at each temperature (one request each, `n=100`). GPT-5-mini is asked for log
probabilities too; Azure's refusal is recorded exactly as returned.

**Expected:** "Paris" is almost certain; a "random" number from 1 to 10 is not random at all (one number
dominates), a random number from 1 to 100 is spread over several favorites, and an open-ended story has a
long tail of possible first words. The temperature prediction is close but not exact: only the top ten
tokens are known, so the unseen tail is missing, and higher temperature also lifts that tail.

**Try:** add a prompt to `logprobPrompts` in `lib/genai/logprobs-lab.mjs` and predict whether it will be sharp or flat.

**Limits:** probabilities are next-token scores, not facts or calibrated confidence. Reasoning models do not
expose log probabilities. Results vary slightly between runs.
