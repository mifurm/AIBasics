# 16 - Compress context into a useful summary

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**7 minutes; three Azure chat requests.** Demonstrate a cheap form of working
memory compression rather than a maximum-context-window stress test.

1. Run `node labs/16-summary-memory/demo.mjs` after [setup](../../README.md#setup-and-deploy).
2. The first request summarizes long fictional meeting notes into final decisions.
3. A fresh request without the notes or summary must answer `UNKNOWN`.
4. Another fresh request receives the actual generated summary and recalls the
   project name Comet, budget 42 credits, and presentation day Friday.
5. Compare actual input token usage: summary-fed input must be smaller than the
   original summarization request. The instructions also differ, so the ratio
   is a demonstration, not a controlled universal savings estimate.

**Try:** add a fourth final decision in [the notes](../../lib/advanced-labs.mjs),
then ask whether it survived. Check the source, summary, and answer yourself.
Summarization has its own cost and can drop or distort facts. It is not lossless
compression or proof that the model remembers everything.

**Infrastructure:** shared GPT-4o; generated summary held by the client.
**Evidence:** `results/16-summary-memory.json` records the summary and measured
input-token reduction; both factual preservation and reduction are checked.
