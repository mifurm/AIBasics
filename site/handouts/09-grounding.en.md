# 09 - Ground answers in a source

[English](09-grounding.en.md) | [Polski](09-grounding.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**6 minutes.** Teach source-grounded answering and honest missing information.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/09-grounding/demo.mjs`.
3. Ask about a fictional club without a source, then with a short source.
4. Verify Tuesday at 16:00 against `[club-1]`. Notice the founder is not provided.
5. Edit the hours in [the source](../../lib/labs.mjs) and rerun.

**Expected:** the grounded answer cites `[club-1]`, gives the supplied meeting time,
and says the founder is "not in the source". Those behaviors are checked.
The no-source answer may already admit uncertainty; do not force a hallucination.

**A real iteration:** the first run gave the correct hours but omitted its requested
citation. The failed check stopped execution. That record is preserved in
`results/09-grounding-first-attempt.json`; the final prompt explicitly places the
citation after meeting details. The gallery and outcomes report show both attempts.

This shows the generation step of retrieval-augmented generation (RAG) with manual
source selection, not a full retriever, embedding model, or search index.

**Infrastructure:** shared Azure GPT-4o; no search service/database needed.
**Evidence:** `results/09-grounding.json`; gallery lab 09; corresponding deck video.
