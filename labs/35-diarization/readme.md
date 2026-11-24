# 35 - Who spoke when

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**12 minutes.** Prerequisites: lab 34; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict whether three voices are harder than two, and whether an interruption is harder than taking turns.
2. Run `npm run azure:agents -- 35-diarization`.
3. Play each recording and compare the true timeline with the model's.

**What happens:** six synthetic speech turns (three voices) are assembled into three conversations with exactly known
timing: two speakers, three speakers, and two speakers where one interrupts. Voice activity detection finds when each
voice is really speaking. Only the audio goes to `gpt-4o-transcribe-diarize`. Code matches the model's arbitrary
speaker labels (A, B...) to voices by overlap and reports coverage, accuracy where covered, and overall attribution.

**Expected:** the transcript can be accurate while attribution is not, because they are separate measurements; the
model's segments skip natural pauses (coverage below 100%); and an interruption is the hard case. In our latest run
two clean speakers and three speakers were attributed 100% correctly where covered, but during the interruption
attribution accuracy fell to 84% and the transcript lost words (29% word error rate). Merging two voices into one
speaker is another real failure that varies between runs.

**Try:** change the interruption overlap in `scenarios` (`lib/genai/diarization-lab.mjs`) from 2 to 4 seconds.

**Limits:** only three synthetic voices and three conversations, one run each. Real meetings add noise, similar voices,
and more speakers.
