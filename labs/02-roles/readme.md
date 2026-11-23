# 02 - Roles and instruction priority

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** the gallery language selector switches teaching text and provides Polish practice-prompt translations. Original recorded prompts, model output, and metrics remain unchanged; translations are teaching aids, not fabricated Polish API outcomes.

**5 minutes.** Separate application instructions from the user's question.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/02-roles/demo.mjs`.
3. Read the two system messages and the identical question about gravity.
4. Compare a friendly tutor with a science editor. Change the role to museum guide
   in [the prompts](../../lib/labs.mjs).

**Expected:** different style and detail from the same question. Check the 60-word
constraint manually. Roles do not add factual knowledge or make a security boundary.
They are message types sent to the API, not costumes worn by separate agents.

**Infrastructure:** shared Azure GPT-4o and static gallery.
**Evidence:** `results/02-roles.json`; gallery lab 02; corresponding deck video.
