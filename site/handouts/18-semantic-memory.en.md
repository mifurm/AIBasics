# 18 - Find a memory by meaning, not keywords

[English](18-semantic-memory.en.md) | [Polski](18-semantic-memory.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**8 minutes; two chat requests and one batched embedding request.**

1. Complete [setup](../../README.md#setup-and-deploy). This lab additionally needs
   an existing `text-embedding-3-small` deployment, or the kit's optional model
   infrastructure which creates it for a new account.
2. Run `node labs/18-semantic-memory/demo.mjs`.
3. Without supplied memory, the weekday question should return `UNKNOWN`.
4. Embed three fictional cards plus "On which weekday should we hydrate the
   classroom plant?" in one Azure request.
5. Local cosine similarity ranks the cards. The selected watering card says the
   fern needs a drink every Monday, despite different question wording.
6. Supply only that card to GPT-4o. Expected answer: Monday with `[watering]`.

**Two kinds of model:** the embedding model produces numerical vectors, not a
chat answer; the chat model turns the retrieved source into a response. Ranking
is ordinary application code. The runner records scores, vector dimensions,
selected card, embedding usage, and actual chat output.

**Try:** add another card or ask about returning books. Inspect whether retrieval
selects the right card and whether the answer really follows it.
Similarity is not confidence, truth, or a universal threshold. This tiny index
is rebuilt on each run; it is not persistent vector storage or full production RAG.

**Infrastructure:** shared GPT-4o and existing text-embedding-3-small; no search
service or database required. `embeddingDeployment` may override its name in
local configuration.
**Evidence:** `results/18-semantic-memory.json`; checks validate the selected card,
weekday, and citation, not merely a positive similarity score.
