# 11 - The model asks; code calculates

**7 minutes.** Follow the two-request tool-calling loop.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/11-tools/demo.mjs` (two model requests).
3. Inspect the model's `multiply` arguments: quantity 17 and unit price 23.
4. [Allowlisted local code](../../lib/tools.mjs) validates and calculates 391.
5. The runner sends that tool result back; the model writes a one-sentence answer.
6. Change the numbers in [the prompt](../../lib/labs.mjs) and update expected values
   in [the evaluator](../../lib/evaluate.mjs).

**Expected:** tool trace total = 391; final answer includes 391. Both are checked.
The model chooses structured arguments but does not execute arbitrary code.
Unknown tools, extra fields, negative/fractional values, and values over 10,000
are rejected. All prices are fictional credits. There are no purchases.

**Infrastructure:** shared Azure GPT-4o; deterministic tool runs on the client.
**Evidence:** `results/11-tools.json` includes both request usages and tool trace;
gallery lab 11; corresponding deck video.
