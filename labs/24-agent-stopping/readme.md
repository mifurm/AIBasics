# 24 - Know when to stop

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**8 minutes.** Prerequisite: lab 20 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 24-agent-stopping`.
2. Compare a completed total, an impossible budget, and a one-tool execution cap.
3. Inspect `stopReason`, `requestCount`, and `toolExecutionCount`.
4. Find the over-limit request marked `executed: false`.

**Expected:** distinct `completed`, `impossible`, and `tool_limit` outcomes.
Impossibility requires observations of both catalog items. A limit is an explicit
application stop, not an Azure-generated answer or evidence of impossibility.

**Try:** raise `maxToolCalls` for the capped case and update the expectation.

**Infrastructure/evidence:** Azure GPT-4o, Azure job, and authenticated Azure Monitor logs.
`results/24-agent-stopping.json` records actual usage for every request. Default
limits are six tool executions, seven model requests, and 320 output tokens per
request. These limits do not enforce a dollar spending cap.
