# 21 - Ask instead of guessing

[English](21-agent-clarification.en.md) | [Polski](21-agent-clarification.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**7 minutes.** Prerequisite: lab 19 and [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 21-agent-clarification`.
2. Notice that the initial quantity is `null`, not an invented class size.
3. Inspect the first action, `ask_user`, and its explicitly scripted reply of 2.
4. Follow lookup and calculation to the total of 46 fictional credits.

**Expected:** clarification happens before other tools. Arithmetic refuses an
unknown or mismatching quantity. The catalog cannot answer a question about user
intent.

**Try:** change `classroomReply` in `lib/agent-labs.mjs` and the expected total in
the evaluator, redeploy, and compare.

**Infrastructure/evidence:** Azure GPT-4o and the Azure job; authenticated Azure Monitor results
download to `results/21-agent-clarification.json`. The reply is a reproducible
classroom fixture, not a live human interaction.
