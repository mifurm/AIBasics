# 20 - Act, observe, repeat

**8 minutes.** Prerequisite: lab 19 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 20-agent-feedback`.
2. Inspect the first lookup: robot kits have zero stock in this fixture.
3. Follow the next model request: it receives that actual tool observation.
4. Find the paper-kit lookup and independent basket check.

**Expected:** the selected basket changes to two paper kits, costs 24 fictional
credits, and passes the availability/budget check. The model cannot change stock.

**Try:** change the unavailable-item fixture in `lib/agent.mjs` and the matching
check; redeploy the source before running on Azure.

**Infrastructure/evidence:** existing Azure GPT-4o, Azure job, and authenticated Azure Monitor
results; downloaded `results/20-agent-feedback.json` includes the full conversation
and before/after state. No shop or real purchase is involved.
