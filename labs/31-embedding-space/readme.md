# 31 - Meaning as geometry

**10 minutes.** Prerequisites: lab 18; [Azure setup](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Predict which sentences will land near each other on a 2D map.
2. Run `npm run azure:agents -- 31-embedding-space`.
3. Study the map, the translation table, the "bank" trap, and the shorter-vector comparison.

**What happens:** two embedding requests turn 28 sentences (12 English, their 12 Polish translations, and 4
probe sentences) into vectors, once at full length and once with `dimensions=256`. Code measures cosine
similarity, finds each sentence's nearest neighbour, retrieves each translation across languages, and projects
the vectors to two dimensions with PCA into an SVG map.

**Expected:** same-topic sentences are closer than different-topic ones; each Polish sentence is nearest to
its English translation; a sentence that shares *meaning* with the query outranks one that merely shares the
word "bank"; language leaves its own signature (same-language pairs are closer than cross-language pairs);
and 256 numbers keep most of the similarity structure.

**Try:** replace one topic with your own and write translations in a language you know.

**Limits:** twelve hand-written sentences are an illustration, not a benchmark. The 2D map discards most
of the information. Embeddings capture scenes and language as well as topic, so a sentence can sit
between clusters.
