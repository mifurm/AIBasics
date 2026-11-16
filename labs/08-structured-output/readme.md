# 08 - Turn language into validated data

**6 minutes.** Extract an order using strict JSON-schema output.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/08-structured-output/demo.mjs`.
3. Inspect the schema: exactly `item` (string) and `quantity` (integer).
4. Compare the note with the returned data.
5. Change the note in [the prompts](../../lib/labs.mjs) and update the corresponding
   expected values in [the evaluator](../../lib/evaluate.mjs).

**Expected:** `{"item":"notebooks","quantity":3}` (property order may differ).
The runner parses JSON, rejects extra properties, and checks the extracted values.
Schema validity is not factual correctness; refusals/API errors are also possible.

**Infrastructure:** shared Azure GPT-4o with structured-output support; static gallery.
**Evidence:** `results/08-structured-output.json`; gallery lab 08; corresponding deck video.
