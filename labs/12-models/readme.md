# 12 - General chat versus a reasoning model

**8 minutes.** Compare two models with the same task and evaluation rubric.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/12-models/demo.mjs`.
3. Compare the same three-demo scheduling problem on GPT-4o and GPT-5-mini.
4. Inspect actual model version, latency, prompt/completion tokens, and the
   reasoning-token count when Azure reports it.
5. Add a constraint in [the prompts](../../lib/labs.mjs) and use the same rubric.

**Manual rubric:** exactly three distinct slots; plant immediately before robot;
art not first; correct schedule is **1 plant, 2 robot, 3 art**; brief constraint
check; at most 70 words. Score both outputs, including any mistakes.

**Expected:** both may solve this easy task. This is not a benchmark or a claim
that newer models always win. Compare suitability, quality, latency, and current
pricing across repeated representative tasks before choosing a model.

GPT-4o accepts temperature; this GPT-5-mini configuration does not accept
temperature/top-p. Its `reasoning_effort=low` and `max_completion_tokens=1400`
control reasoning work and the total completion budget, including internal
reasoning. We display a concise answer, never hidden chain-of-thought.

**Infrastructure:** shared Azure GPT-4o and GPT-5-mini; no extra service per model.
**Evidence:** `results/12-models.json`; gallery lab 12; corresponding deck video.
