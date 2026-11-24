# 17 - Look up, then calculate with tools

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**8 minutes; three Azure chat requests.** A bounded, visible two-tool sequence.

1. Run `node labs/17-tool-chain/demo.mjs` after [setup](../../README.md#setup-and-deploy).
2. The model requests `lookup_price` for the robot kit.
3. Local read-only catalog code returns 23 fictional credits.
4. The next model request sees that result and requests `multiply` for four kits.
5. Local validated arithmetic returns 92; the final model reply states the total.

**Expected:** ordered lookup then multiplication, unit price 23, quantity 4,
total 92, and an answer containing 92. The application forces the pedagogical
sequence and validates the model-generated arguments; this is not unconstrained
agent planning. Exactly two allowed tool executions; no parallel calls.

**Try:** change the quantity in the prompt, the chain validation, and evaluator
together. Inspect `finalMessages` to see actual tool calls and replies.
Unknown tools/items, extra fields, and invalid numbers fail explicitly.
No orders, shell commands, purchases, or external side effects occur.

**Infrastructure:** existing GPT-4o plus client-side catalog and calculator.
**Evidence:** `results/17-tool-chain.json` includes both tool steps, final messages,
and usage for all three model requests.
