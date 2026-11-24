# 15 - Build and revise a plan across turns

[English](15-multiturn.en.md) | [Polski](15-multiturn.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**7 minutes; three Azure chat requests.** Unlike lab 07's fixed history, these
assistant turns are genuinely generated and then reused by the next request.

1. Run `node labs/15-multiturn/demo.mjs` after [setup](../../README.md#setup-and-deploy).
2. Turn 1 creates a blue cardboard robot plan.
3. Turn 2 says "Change it to red. Keep everything else the same."
4. Turn 3 asks for the current agreed plan.
5. Inspect the third request: it contains both actual earlier assistant replies.

**Expected:** project `robot`, material `cardboard`; color changes from `blue` to
`red` and stays red. Strict JSON makes it easy to validate every field. The
evaluator also checks that actual earlier replies were supplied.

**Try:** change the revision to green and update the expected value.
**Caution:** chat history must be resent, consumes input tokens, and can include
errors from earlier answers. This is conversation context, not permanent memory.
The classroom plan is fictional; no personal profiles are stored.

**Infrastructure:** shared GPT-4o and gallery; history in the running client.
**Evidence:** `results/15-multiturn.json` contains all three full requests and replies.
