# 14 - Update and forget a saved fact

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**6 minutes; three Azure chat requests.** Model a memory lifecycle without
collecting student data.

1. Run `node labs/14-memory-lifecycle/demo.mjs` after [setup](../../README.md#setup-and-deploy).
2. Write and inject Otter. Expected answer: `Otter`.
3. Replace the saved value with Falcon. Expected answer: `Falcon`.
4. Write an empty store, load it in a new process, and ask in a fresh chat.
   Expected answer: `UNKNOWN`.
5. Inspect `results/memory/14-memory-lifecycle.json`: it must contain `{}`.

The runner verifies that the forgotten values are absent from the final request,
not just that the model says it forgot. Keeping old conversation history would
reintroduce the fact even after deleting it from the memory store.

**Important:** this deletes only the active demo-store value. Historical outputs,
public gallery evidence, recordings, provider logs, and backups are not erased.
Use only fictional facts. Real systems need scoped storage, consent, retention,
update rules, and deletion across all relevant stores.

**Try:** explain why "ignore the old value" is not the same as removing it.
**Infrastructure:** shared GPT-4o; isolated local JSON store; no new Azure service.
**Evidence:** `results/14-memory-lifecycle.json` records each snapshot and answer.
