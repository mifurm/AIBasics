# 29 - Tokens: learned chunks, uneven costs

**10 minutes.** Prerequisites: labs 06 and 00; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict which of eight translations of one sentence will cost the most tokens.
2. Run `npm run azure:agents -- 29-tokenization`.
3. Read the toy byte-pair-encoding merges, then the measured token counts.
4. Compare the same sentences in GPT-4o and GPT-5-mini.

**What happens:** a deterministic byte-pair-encoding (BPE) trainer learns merges from eleven
classroom words, so you can see how frequent pairs become single tokens and how an unseen word
falls apart into smaller pieces. Then 27 tiny Azure chat requests (`max_tokens` 1) measure real token
counts: the reported prompt tokens minus a constant chat overhead calibrated with the one-token
message `a`. Eight languages, numbers, code, emoji, URLs, repeated letters, and whitespace are compared.

**Expected:** the same meaning does not cost the same number of tokens in every language, and
characters are a poor guide to cost (one run: Japanese used 1.33x English's tokens with about 2.7x fewer
characters). Both models gave identical counts in our run, but do not assume that for other models.

**Try:** add a sentence in your own language to `languageSentences` in
`lib/genai/tokenization-lab.mjs`, redeploy, and compare its cost with English.

**Limits:** the toy tokenizer learns from eleven words; real tokenizers learn from enormous corpora.
Counts are measured, not prices, and they say nothing about quality in a language.
`node labs/29-tokenization/demo.mjs` is an optional local-runner alternative with Azure inference,
not an all-Azure execution.
