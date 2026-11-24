# 07 - Context is not permanent memory

[English](07-context.en.md) | [Polski](07-context.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**5 minutes.** Inspect what the application actually sends on each request.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/07-context/demo.mjs`.
3. One request contains the earlier robot-name exchange; the other does not.
4. Ask why only the first knows Pebble. Change the name in
   [the request history](../../lib/labs.mjs).

**Expected:** history included -> Pebble; fresh request -> acknowledges it does
not know. Both are checked. The runner explicitly sends the assistant's earlier
turn; Azure is not remembering that exchange automatically.

This lab does not test the maximum context window or product-level saved memory.
Real applications must choose what history fits within a model's finite window.

**Infrastructure:** shared Azure GPT-4o and static gallery.
**Evidence:** `results/07-context.json`; gallery lab 07; corresponding deck video.
