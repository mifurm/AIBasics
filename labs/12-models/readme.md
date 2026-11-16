# 12 - Same prompts, different models

**12 minutes.** Compare GPT-4o and GPT-5-mini using three familiar tasks and two
prompt styles. This expands the original single scheduling question; no new
model deployment or Azure service is required.

## Run entirely in Azure

After the [shared Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure):

```sh
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 12-models
npm run gallery
npm run deck -- --allow-missing-recordings
npm run publish -- --include-deck
npm run verify
```

For an optional local runner with Azure model inference:
`node labs/12-models/demo.mjs`. Each execution makes **12 billable chat requests**,
six to each model. Rerunning overwrites the saved lab record. The all-Azure
command also incurs normal job execution and monitoring charges.

## Six comparisons, twelve actual responses

| Task | Broad prompt | Specific prompt | Inspect |
| --- | --- | --- | --- |
| Explain a concept | Explain text generation in under 100 words | Explain to a 10-year-old in two bullets, at most 45 words, mentioning tokens and context | Wording, audience fit, accuracy, length |
| Extract information | Say what to bring from a classroom note | Return only exact JSON with item and integer quantity | Prose versus machine-consumable data; correct values |
| Follow constraints | Schedule three demos using the supplied constraints | Solve the same constraints in exactly three numbered lines | Correct order, format, concise answers |

Within each pair, the **entire message list is identical**. Only the model and
its supported API configuration change. Between broad and specific variants,
the task and source facts remain the same but instructions become more explicit.
No prior response or conversation history is reused.

1. Predict what might differ before running.
2. Select a task and broad/specific prompt in the gallery.
3. Read both model outputs side by side beneath the shared prompt.
4. Compare actual model versions, latency, input/completion/total tokens,
   reported reasoning tokens, visible word counts, and API settings.
5. Switch to the more specific prompt and discuss what improved or stayed equal.

**Supported configurations are not identical:** GPT-4o uses temperature 0 and a
320-token completion cap. GPT-5-mini uses low reasoning effort and a 1,400-token
total completion cap, including internal reasoning. This model does not accept
the GPT-4o sampling controls. The gallery exposes these differences rather than
pretending this is a perfectly controlled model-only benchmark.

## Judge the outcome, not the label

Each card includes simple checks against the **specific-prompt targets**:

- Explanation: two bullet lines, at most 45 whitespace-separated words, and
  tokens/context keywords. These do not prove factual accuracy or audience fit.
- Extraction: standalone JSON, exactly `item` and `quantity`, `"notebooks"`,
  integer `3`, and no extra fields.
- Scheduling: exactly `1: plant`, `2: robot`, `3: art` on separate lines.

The broad prompt did **not** request every target. A prose extraction or a
differently formatted correct schedule may therefore show target mismatches
without being a wrong answer. Each pair includes a manual semantic rubric.

Quality/format mismatches are preserved and displayed; the runner never changes
an answer to make a model look better. Experiment checks separately require
complete response pairs, identical prompts, distinct model deployments/versions,
usage evidence, and faithfully computed target checks. Infrastructure failures,
truncation, and missing evidence fail explicitly, not as successful comparisons.

**Expected:** outputs can differ in wording and resource use; both models may
also return the same correct answer. Agreement is a valid observation. Do not
keep rerunning until a preferred model wins.

One trial per prompt is not a benchmark. Latency varies with service load and
caching. Token counts are not dollar costs: consult current per-model pricing
and repeat representative tasks before choosing a model. More reasoning tokens
do not establish a better answer. Hidden chain-of-thought is never requested or
displayed.

**Try:** edit one task in `lib/model-comparison.mjs`, keep the prompt identical
within each model pair, redeploy, and review both results. Use the same manual
rubric and supported configurations.

**Evidence:** `results/12-models.json` contains all twelve real responses,
requests, model versions, metrics, and target checks. Azure execution metadata
identifies the cloud job. The gallery shows six pairs; the draft deck includes
side-by-side excerpts and a link to the full records.
