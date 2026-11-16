# 22 - Keep current task state

**8 minutes.** Prerequisites: labs 15 and 19; [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 22-agent-state`.
2. Inspect the checked first basket: two paper kits, budget 50, total 24.
3. The second turn resends actual generated replies and changes quantity to 3.
4. Inspect the invalidated old total and the new basket check.

**Expected:** item and budget survive; quantity becomes 3 and the checked total
becomes 36. The prior state snapshot stays unchanged. State is application-owned,
not inferred from an assistant claiming to remember.

**Try:** change the revision, update expectations, and redeploy.

**Infrastructure/evidence:** Azure GPT-4o, the Azure job, and authenticated Azure Monitor results.
`results/22-agent-state.json` preserves both turns and state snapshots. This is
run-scoped state, not persistent personal memory.
