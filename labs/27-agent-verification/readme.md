# 27 - Check the result, not the claim

**8 minutes.** Prerequisites: labs 20 and 24; [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 27-agent-verification`.
2. Inspect the first candidate: three robot kits cost 69, above budget 50.
3. Find the deterministic `over_budget` result.
4. Follow the correction to three paper kits and the successful check of 36.

**Expected:** an invalid proposal does not become selected state. Only the valid
basket updates selection and the checked total. Finishing without a valid check
is explicitly marked `unverified` and fails the lab checks.

**Try:** lower the budget below 36; discuss correction versus impossibility.

**Infrastructure/evidence:** Azure GPT-4o plus deterministic checking code inside
the Azure job. Authenticated results download to `results/27-agent-verification.json`.
The checker verifies this catalog and these constraints, not arbitrary truth.
