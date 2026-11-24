# 33 - What a vision model sees

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**12 minutes.** Prerequisites: labs 08 and 12; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether a model can count nineteen colored shapes and read a code only 7 pixels tall.
2. Run `npm run azure:agents -- 33-vision`.
3. Compare each model's JSON answer with the ground truth, field by field.
4. Compare low and high image detail: accuracy against input tokens.

**What happens:** our own code draws three images with known answers (seeded shapes with distractors, a bar chart,
a large and a tiny text code). Both GPT-4o and GPT-5-mini receive the same image and prompt with a strict JSON
schema (eight requests). Every field is scored automatically, and the image's token cost is recorded.

**Expected:** miscounting similar objects and misreading tiny text are real errors you can see, not opinions. Higher
image detail costs more input tokens (in our latest run 5.4x for GPT-4o and 2.0x for GPT-5-mini) and does not always
help: it fixed the tiny code for GPT-5-mini but not for GPT-4o. A model can be right on one run and wrong on the next.

**Try:** add more distractors to `SHAPES_SPEC` in `lib/genai/vision-lab.mjs` and watch the counts.

**Limits:** three synthetic images and one run per model; real photographs behave differently. Results vary between runs.
