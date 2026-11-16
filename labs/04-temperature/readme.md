# 04 - Temperature: explore or repeat

**7 minutes.** Observe sampling variability, not a guaranteed result.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/04-temperature/demo.mjs` (six requests).
3. Compare three robot-club names at temperature 0 and three at 1.2.
4. Count unique answers in each group; the runner records the counts.
5. Repeat using [the same prompts](../../lib/labs.mjs) and discuss the sample size.

**Expected:** higher temperature often increases variety. Three samples cannot
prove that effect. Zero can still vary; temperature does not improve intelligence
or guarantee factual correctness. Top-p stays at the API default throughout.

**Infrastructure:** shared Azure GPT-4o; GPT-5-mini does not support these controls.
**Evidence:** `results/04-temperature.json`; gallery lab 04; corresponding deck video.
