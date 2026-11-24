# 23 - Recover from a tool error

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**8 minutes.** Prerequisite: lab 20 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 23-agent-errors`.
2. Compare `temporarily_unavailable` with `unknown_item`.
3. Inspect the retry of the robot-kit lookup after the temporary read failure.
4. Inspect the changed item after the unknown glitter-kit lookup.

**Expected:** one temporary failure, one retry, then price 23; an unknown item
is corrected to paper kit, price 12. Errors remain in the saved trace.

**Try:** explain why unchanged retries cannot fix an unknown catalog item.
The runner stops repeated unchanged permanent errors and bounds all tool calls.
It does not retry failed writes or conceal Azure API errors.

**Infrastructure/evidence:** Azure GPT-4o and Azure job; synthetic error fixtures
run in the job, not through an unreliable external service. Authenticated results
download to `results/23-agent-errors.json`.
