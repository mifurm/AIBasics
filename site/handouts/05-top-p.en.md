# 05 - Top-p: narrow the candidate pool

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**7 minutes.** Explain nucleus sampling using cumulative token probabilities.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/05-top-p/demo.mjs` (six requests).
3. Compare three story openings at top-p 0.1 and three at 1.
4. Count variety, then try 0.5 in [the prompts](../../lib/labs.mjs).

**Mental model:** if candidate probabilities were 0.6, 0.3, and 0.1, p=0.8 would
keep the first two candidates, whose cumulative probability is 0.9. These numbers
are illustrative, not token probabilities measured from Azure.

**Expected:** a narrower pool can reduce variety, but this small sample might not
show it. Temperature stays at the API default. Normally tune one sampling control
at a time; top-p is not a truth or intelligence setting.

**Infrastructure:** shared Azure GPT-4o and static gallery.
**Evidence:** `results/05-top-p.json`; gallery lab 05; corresponding deck video.
