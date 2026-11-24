# 34 - Sound is samples: speech out, speech in

[English](34-speech-roundtrip.en.md) | [Polski](34-speech-roundtrip.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**12 minutes.** Prerequisites: labs 06 and 31; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict at what noise level a speech recognizer starts to fail, and how it will fail.
2. Run `npm run azure:agents -- 34-speech-roundtrip`.
3. Play each recording, inspect its spectrogram, and compare the transcript with the original sentence.

**What happens:** the Azure `tts` model speaks one sentence in two voices and at 1.5x speed (WAV, 24 kHz). Our
code measures the samples: duration, level, silence, speaking rate, and pitch. Spectrograms are drawn with an FFT.
Seeded white noise is then added to the clean recording at 10, 0, and -10 dB signal-to-noise, and Whisper transcribes
everything. The word error rate (substitutions, deletions, insertions) is computed against the sentence we sent.

**Expected:** a higher speed shortens the audio by about that factor; clean speech is recognized almost perfectly;
moderate noise barely matters; and in very heavy noise a recognizer can fail by *inventing fluent text* rather than
returning nothing (we saw an entirely different sentence at -10 dB).

**Try:** change `speechText` in `lib/genai/speech-lab.mjs` to include a rare name or a number.

**Limits:** synthetic speech, one sentence, one run per condition; white noise simplifies reality. The Standard `tts`
and `whisper` deployments are rate limited (3 requests per window), so the client waits and retries using the
`Retry-After` header.
