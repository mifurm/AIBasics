# 07 - Context is not permanent memory

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
