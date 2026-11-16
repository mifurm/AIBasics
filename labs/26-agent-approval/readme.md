# 26 - Approve the exact action

**8 minutes.** Prerequisite: lab 25 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 26-agent-approval`.
2. Compare scripted approval and rejection of two paper kits.
3. Compare a request for three kits against approval of only two.
4. Inspect the approval snapshot and synthetic reservation list in each result.

**Expected:** only approval of the exact item and quantity creates a draft.
Rejection and changed arguments leave the store empty. Duplicate drafts in a
single case are also blocked.

**Try:** change the approved item while keeping the request unchanged.

**Infrastructure/evidence:** Azure GPT-4o, Azure job, and authenticated Azure Monitor persistence
of the synthetic run-record store. `results/26-agent-approval.json` holds all
three cases. These are labelled fixture decisions, not a production human
approval UI, identity check, or approval service.
