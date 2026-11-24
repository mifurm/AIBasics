# 13 - Memory survives a new process

[English](readme.md) | [Polski](readme.pl.md)

**Language note:** translations are teaching aids. Original recorded prompts, model output, and metrics remain unchanged; they are not fabricated Polish API outcomes.

**6 minutes; two Azure chat requests.** Predict whether saving a file alone lets
the model know a classroom fact.

1. Complete the [shared setup](../../README.md#setup-and-deploy).
2. Run `node labs/13-persistent-memory/demo.mjs`.
3. The application saves the fictional mascot Otter, but does not send it in the
   first request. Expected response: `UNKNOWN`.
4. A separate Node process reads the file, and the runner injects it into a fresh
   request. Expected response: `Otter`.
5. Inspect `results/memory/13-persistent-memory.json` and the recorded process IDs.

**What actually remembers?** The application-managed JSON file. No model weights
are updated, and Azure is not automatically remembering a prior chat. Each model
request starts fresh; the second has an explicitly supplied memory snapshot.
This is not GitHub Copilot Memory and does not store a real student's data.

**Try:** change the scripted mascot and corresponding validation together.
The worker deliberately accepts only fictional demonstration values.

**Infrastructure:** existing GPT-4o, local JSON store, shared static gallery.
**Evidence:** `results/13-persistent-memory.json` includes the injected/not-injected
snapshot and separate worker process IDs. Automated checks validate both answers.
