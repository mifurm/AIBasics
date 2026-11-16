# 03 - Teach a pattern with examples

**5 minutes.** Demonstrate few-shot learning inside a request.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/03-few-shot/demo.mjs`.
3. First ask for invented labels without definitions; then provide four examples.
4. Ask students to infer SUN = positive and RAIN = negative.
5. Add MIXED and an ambiguous example in [the prompts](../../lib/labs.mjs).

**Expected:** the example-based answer is exactly `SUN` for the wonderful robot kit.
The runner checks this. The no-example answer might coincidentally be correct.
Few-shot prompting does not update model weights and does not persist to future
requests unless the examples are sent again.

**Infrastructure:** shared Azure GPT-4o and static gallery.
**Evidence:** `results/03-few-shot.json`; gallery lab 03; corresponding deck video.
