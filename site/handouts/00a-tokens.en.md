# 00a - What is a token?

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**7 minutes. Teach immediately after lab 00, before lab 01.**

Lab 00 used a tiny word-based dictionary. Real language models usually use
learned chunks of text instead. A tokenizer converts text to integer IDs;
the model reads those IDs. A token can be a word, part of a word, punctuation,
or even only part of a character's UTF-8 bytes. It is not necessarily a word.

## Predict

These are translations of the same sentence:

| Language | Sentence |
| --- | --- |
| Polish | Kot śpi na ciepłym parapecie. |
| English | The cat sleeps on the warm windowsill. |
| Spanish | El gato duerme en el alféizar cálido. |

Predict which needs the fewest tokens. Does having fewer characters guarantee
fewer tokens?

## Run and inspect

```sh
npm ci
npm run demo -- 00a-tokens
# Equivalent:
node labs/00a-tokens/demo.mjs
```

No Azure configuration, Python, API key, or model request is needed. After
installation, the tokenizer works offline. The script saves actual computed
results to [the result record](../../results/00a-tokens.json).

This uses [OpenAI's tiktoken tokenizer and encoding](https://github.com/openai/tiktoken)
through the community-maintained [JavaScript/WASM bindings](https://github.com/dqbd/tiktoken).
The npm package is a binding, not an official OpenAI JavaScript SDK.
The fixed encoding is **o200k_base**, used by GPT-4o.

For these exact sentences, the measured counts are **Polish: 11,
English: 9, Spanish: 12**. The gallery shows a comparison chart, character and
byte counts, and a table of every token's ID, quoted text piece, and exact bytes.
Rerunning computes these values; they are not hardcoded results.

Ask students to find:

- A space attached to the following word (`" cat"` is one token here).
- A word split across tokens (`" windows"` and `"ill"`).
- A punctuation token (`"."`).
- A shorter sentence in characters that still takes more tokens.

IDs are vocabulary entries, not scores, meanings, or word counts. Accents are
preserved. Individual tokens may split a Unicode character; decoding one
fragment alone can show a replacement character. The exact byte column avoids
claiming that fragment is the original text. The check joins all token bytes
and decodes the full sequence to recover each original sentence exactly.

## Explain and discuss

Tokenizers use a learned vocabulary of frequent byte patterns. Different
spellings, languages, spaces, and vocabularies produce different boundaries.
Equivalent meaning does not require the same number of tokens.

This one sentence is **not a ranking of languages**. Another sentence or
encoding can give different ratios. Tokenization does not translate, reason,
or train the model.

These counts cover **sentence text only**, with no chat wrappers, system
messages, tools, or generated response. They are not a complete API usage or
dollar estimate. Tokens matter for context limits and token-billed costs;
[lab 06](../06-token-budget/readme.md) explores output truncation, and
[lab 29](../29-tokenization/readme.md) explores BPE learning and broader comparisons.

## Change one thing

Replace the three entries in [tokenSentences](../../lib/tokenizer-lab.mjs)
with translations of another sentence. Rerun and inspect the new boundaries.
If the counts happen to tie, the explicit "three different counts" teaching
check will fail: that is an honest observation, not a tokenizer failure.

## Optional Azure execution and publishing

The existing job can run this same CPU computation. Its startup installs only
the locked production dependency when this lab is selected; it needs access
to the npm registry. Other lab selections do not install packages.

```sh
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 00a-tokens
npm run gallery
npm run deck -- --allow-missing-recordings
npm run publish -- --include-deck
npm run verify
```

Azure CPU execution and monitoring incur their normal charges, but this lab
makes zero model API requests. Existing lab IDs remain unchanged.
