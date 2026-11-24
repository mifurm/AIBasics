# 36 - Music is tokens

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**12 minutes.** Prerequisites: lab 00 and lab 04; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict which composer moves most stepwise, and what a higher temperature will change.
2. Run `npm run azure:agents -- 36-music-tokens`.
3. Listen to the four melodies, read the piano rolls, and compare the music-theory measurements.

**An honest note:** Azure offers no music-generation model in this subscription's catalog. This lab therefore teaches
the shared idea (write the music as tokens, predict the next token) with symbolic notes: it is **not** how audio models
such as MusicGen or Lyria work.

**What happens:** melodies are lists of `PITCH:eighth-note-duration` events filling exactly 32 slots (four bars). Four
composers write them: random notes; a tiny next-note (bigram) model trained on nine simplified public-domain phrases
at temperatures 0.7 and 1.6 (30 seeded melodies each); and GPT-4o prompted in the same format (five samples in one
request, the only API call). A synthesizer renders each melody to a WAV file, and a pitch tracker checks that the
**audio** matches the written notes. The nine tunes' statistics are the yardstick.

**Expected:** random notes leap about, the trained model moves mostly by step like its training tunes, and a higher
temperature adds variety (more distinct tokens, less verbatim copying) without inventing a new style.

**Try:** replace one of the nine phrases in `corpus` in `lib/genai/music-lab.mjs` with another public-domain phrase of
exactly 32 eighth-note slots.

**Limits:** nine phrases, a basic synthesizer, and measurements that say nothing about whether a melody is beautiful.
