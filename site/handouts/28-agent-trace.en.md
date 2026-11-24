# 28 - Evaluate the answer and the path

[English](28-agent-trace.en.md) | [Polski](28-agent-trace.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**8 minutes.** Prerequisites: labs 24-27; [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Run `npm run azure:agents -- 28-agent-trace`.
2. Compare the two correct totals of 46 fictional credits.
3. Find the denied write request in the second trace.
4. Compare `answerCorrect`, `pathPassed`, and `authorizationHeld`.

**Expected:** both answers contain the independently calculated total. Only the
read-only path passes the strict no-error trace rubric. The authorization
boundary holds in both cases; an unauthorized attempt is not a successful write.
The expected negative rubric result is itself checked, not hidden.

**Try:** discuss why answer-only grading would miss the attempted write.
The simple rubric is pedagogical, not a complete semantic correctness judge.

**Infrastructure/evidence:** Azure GPT-4o, Azure job, authenticated Azure Monitor results, and
the gallery's agent trace section. `results/28-agent-trace.json` includes actual
messages, actions, observations, state changes, usage, limits, and stop reasons.
It never requests hidden chain-of-thought.
