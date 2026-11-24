# 37 - Video is frames over time

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**12 minutes.** Prerequisites: lab 33; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether a model can tell which way a three-spoke wheel turns from six frames.
2. Run `npm run azure:agents -- 37-video-frames`.
3. Compare the contact sheet, each model's answers, and the input-token cost of six versus twelve frames.

**An honest note:** Azure's only video-generation model (Sora 2) passed its retirement date on 2026-11-02, so
generating video is not possible here. This lab studies video *understanding*, which is how today's models see video:
as a short list of sampled frames.

**What happens:** our code draws five clips with exactly known motion: a ball moving right to left in six frames and
in twelve; six shuffled frames of a ball moving left to right; a wheel turning slowly (20 degrees per frame); and the
same wheel sampled too sparsely (100 degrees per frame, indistinguishable from 20 degrees the other way because the
spokes repeat every 120 degrees). GPT-4o and GPT-5-mini see each frame as a separate image (ten requests).

**Expected:** more frames cost more input tokens in proportion; ordering and direction questions have exact right
answers; and for the aliased wheel the frames themselves are ambiguous, so no model can be trusted to recover what
happened between them. In our latest run GPT-5-mini answered every ordering and direction question correctly while
GPT-4o missed most of them, and both models called the sparse wheel clockwise: that is how we drew it, but not what
the frames literally show. In an earlier run GPT-5-mini said counterclockwise for the same frames, so answers vary
between runs.

**Try:** change `SPARSE_DEGREES` in `lib/genai/video-lab.mjs` from 100 to 60 and predict what the three-spoke wheel looks like
(at exactly 60 degrees clockwise and counterclockwise are identical; at 120 degrees it looks stationary).

**Limits:** five tiny synthetic clips and one run per model.
