# 32 - From prompt to pixels

**12 minutes.** Prerequisites: lab 01; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether two samples of the same prompt will be the same picture.
2. Run `npm run azure:agents -- 32-image-generation`.
3. Compare the pixel measurements, the two samples, and the vague prompt.

**What happens:** `gpt-image-1.5` generates three 1024x1024 low-quality PNGs: a specific layout prompt twice
("a red circle on the left, a blue square on the right, plain white background") and a vague prompt. Our own
code decodes each PNG and **measures** it: how much is red or blue, where the centres are, how much is white,
and how different the two samples are. GPT-4o separately describes each image, as a second, independent
check. The lab also reads the PNG container and reports its C2PA Content Credentials chunk (`caBX`).

**Expected:** each image call reports image tokens, the same prompt gives visibly different images, the vague
prompt makes the model choose style, colors, and objects, and the pixel checks and GPT-4o's description can be
compared against what you asked for.

**Try:** change `specificPrompt` in `lib/genai/image-generation-lab.mjs` and update the color checks in
`lib/media/color-layout.mjs`.

**Limits:** three images are not a statistical test; simple color checks only suit simple prompts; a model that
describes an image can be wrong too. Each execution generates three images (billed per image). Oversized
images are re-encoded smaller for the gallery; the measurements always use the original.
