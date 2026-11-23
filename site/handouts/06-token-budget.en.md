# 06 - Tokens, limits, and truncation

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**5 minutes.** Show why a short output cap is not the same as asking for brevity.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/06-token-budget/demo.mjs`.
3. Compare the same twelve-tip request with output caps of 24 and 280.
4. Inspect actual completion tokens and `finishReason`, not a word-count estimate.
5. Try a low cap of 40 in [the prompts](../../lib/labs.mjs).

**Expected:** the low cap ends with `length` and at most 24 completion tokens; the
higher cap stays at or below 280. The runner checks those exact thresholds.
The higher cap can also truncate if the answer is long enough.

Tokens may be words, word pieces, or punctuation. Ratios vary by language.
`max_tokens` does not limit input tokens or enforce a dollar budget.
GPT-5-mini instead uses `max_completion_tokens`, including reasoning tokens.

**Infrastructure:** shared Azure GPT-4o and static gallery.
**Evidence:** `results/06-token-budget.json`; gallery lab 06; corresponding deck video.
