# 01 - From vague to useful

[English](01-specificity.en.md) | [Polski](01-specificity.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**5 minutes.** Learn to name the task, audience, constraints, and output format.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/01-specificity/demo.mjs` from the project root.
3. Compare the broad photosynthesis explanation with the three-bullet explanation
   for a ten-year-old. Ask students which could be used immediately.
4. Change the topic in [the prompts](../../lib/labs.mjs) and rerun.

**Expected:** the specific prompt tends to produce a more usable classroom answer.
Check the actual bullet count, included ingredients, and analogy yourself;
instruction following is not guaranteed. Longer prompts are not always better.

**Infrastructure:** shared Azure GPT-4o and static gallery; no per-lab resources.
**Evidence:** `results/01-specificity.json`; gallery lab 01; corresponding deck video.
