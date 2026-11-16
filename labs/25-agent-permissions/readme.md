# 25 - Read permission is not write permission

**7 minutes.** Prerequisite: lab 19 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 25-agent-permissions`.
2. Inspect the successful read-only price lookup.
3. Inspect the requested `reserve_draft` and `permission_denied` observation.
4. Check that the synthetic reservation list is empty.

**Expected:** reading succeeds; the write does not execute. The tool is
deliberately advertised so students can observe code enforcing the boundary
even when the model requests a forbidden action.

**Try:** explain why stronger wording in a prompt cannot grant tool permission.

**Infrastructure/evidence:** Azure GPT-4o and Azure job; authenticated results download
to `results/25-agent-permissions.json`. Application tool permissions are separate
from Azure RBAC. No real reservations or external writes exist.
