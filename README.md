# AI Basics: eighteen small classroom labs

For beginners; English; JavaScript/Node.js 22+. Allow 120-140 minutes for all labs,
or teach labs 1-7, 8-12, and 13-18 in three lessons. Every lab has a
script, a teacher-friendly README, and real Azure outputs after execution.

## Learning path

| Lab | Topic | Time |
| --- | --- | --- |
| [01](labs/01-specificity/readme.md) | Specific prompts | 5 min |
| [02](labs/02-roles/readme.md) | System/user roles | 5 min |
| [03](labs/03-few-shot/readme.md) | Examples without retraining | 5 min |
| [04](labs/04-temperature/readme.md) | Temperature | 7 min |
| [05](labs/05-top-p/readme.md) | Top-p | 7 min |
| [06](labs/06-token-budget/readme.md) | Tokens and truncation | 5 min |
| [07](labs/07-context/readme.md) | Conversation context | 5 min |
| [08](labs/08-structured-output/readme.md) | Schema-constrained JSON | 6 min |
| [09](labs/09-grounding/readme.md) | Source grounding | 6 min |
| [10](labs/10-untrusted-context/readme.md) | Untrusted source instructions | 6 min |
| [11](labs/11-tools/readme.md) | Tool calling | 7 min |
| [12](labs/12-models/readme.md) | General chat vs reasoning | 8 min |
| [13](labs/13-persistent-memory/readme.md) | Memory across fresh processes | 6 min |
| [14](labs/14-memory-lifecycle/readme.md) | Remember, replace, forget | 6 min |
| [15](labs/15-multiturn/readme.md) | Real generated multi-turn dialogue | 7 min |
| [16](labs/16-summary-memory/readme.md) | Context summarization and token savings | 7 min |
| [17](labs/17-tool-chain/readme.md) | Catalog lookup followed by calculation | 8 min |
| [18](labs/18-semantic-memory/readme.md) | Embeddings and semantic memory retrieval | 8 min |

## Expansion plan: from chat history to useful memory

The six extension labs form one progression:

1. **Persistence:** save a fictional fact outside the model; contrast a fresh
   request without it against another process loading and injecting it.
2. **Lifecycle:** replace and remove that fact; verify deletion in both the store
   and fresh request, rather than asking the model to pretend it forgot.
3. **Dialogue:** use actual generated replies across follow-ups; revise one
   attribute while preserving the rest of a structured classroom plan.
4. **Compression:** summarize long notes, recall decisions from the generated
   summary, and measure input tokens. Discuss the risk of lost facts.
5. **Tool chaining:** read a fictional catalog, use the returned price in a
   validated calculator, and inspect the complete tool conversation.
6. **Semantic retrieval:** embed three memory cards, rank by meaning, supply
   just the selected source, and check the answer and citation.

These use existing Azure models, client-side JSON, and deterministic local code.
No paid database, search service, VM, or autonomous real-world action is needed.
The memory stores accept only fictional demo mascots: they are not student
profiles, GitHub Copilot Memory, or an instruction to save user information.

## How a language model works

Text is split into **tokens**. A trained neural network uses the tokens in its
current **context** to score possible next tokens. A decoding procedure chooses
a token, appends it, and repeats. Training adjusted the network's weights;
prompting supplies context without changing those weights. This is a simplified
explanation: modern assistants can also use tools, retrieval, and reasoning.

- **Temperature** changes the probability distribution; **top-p** restricts
  the cumulative-probability candidate pool. Neither is an intelligence knob.
- **Output token limits** may truncate text. Input tokens, output tokens, and
  reasoning tokens can all contribute to cost.
- **Context windows** are finite. The chat runner explicitly resends history.
- **General chat** and **reasoning** models support different settings.
  Here GPT-4o demonstrates sampling; GPT-5-mini demonstrates reasoning effort
  and an output budget including internal reasoning tokens.
- Models do not automatically know current/private facts or execute code.
  Fluency, JSON validity, and citations are not proof of truth.
- **Application memory** persists outside the model and must be selected and
  supplied in requests. Deleting a store value is not deletion from old logs.
- **Embeddings** produce vectors rather than answers. Similarity retrieves a
  relevant source; the chat model still needs to answer accurately from it.

## Setup and deploy

Prerequisites: Azure CLI, Node.js 22+, an Azure subscription with appropriate
permissions, and `az login`. For provisioning, the signed-in user needs resource
creation permissions (plus role-assignment permissions if creating models). For inference, use **Cognitive
Services OpenAI User** on the AI account. This kit uses Entra tokens, not keys.

```sh
npm install
npm test
az login
az account set --subscription YOUR_SUBSCRIPTION
```

Choose **one** infrastructure option:

```sh
# Recommended: reuse gpt-4o, gpt-5-mini, and text-embedding-3-small deployments.
npm run deploy -- --subscription YOUR_SUBSCRIPTION \
  --reuse-group YOUR_AI_GROUP --reuse-account YOUR_AI_ACCOUNT --confirm-public

# Optional: provision all three models in the NEW classroom resource group.
# Check current model/region availability, retirement dates, and quota first.
npm run deploy -- --subscription YOUR_SUBSCRIPTION --create-models --confirm-public
```

Defaults: AI/group location Sweden Central; a new group `rg-aibasics-classroom`;
one **Free-tier Azure Static Web App in West Europe**. Hosting has a different
region list from OpenAI; override with `--hosting-region` when needed.
Existing AI accounts and deployments are **never modified**.
`infra/main.bicep` provisions hosting;
`infra/models.bicep` can provision optional shared pay-as-you-go models.
The scripts assume an interactive user identity, not a service principal.
Role propagation can take several minutes when creating models. Errors are not
silently ignored. The first storage-hosting attempt was modified by an Azure
policy disabling public access; it was replaced with policy-permitted Free-tier
Static Web Apps, without changing or exempting the policy.

`--confirm-public` acknowledges that the static website, recordings, and deck
are **publicly readable**. Publish fictional teaching data only. No live API or
credentials are placed in the browser. Publishing obtains a Static Web Apps
deployment token in memory and passes it only to the official Azure CLI tool;
it is not written to disk or logged. Do not put student/private data in
prompts, results, or recordings. `.azure.local.json` is local configuration,
not a public artifact. Deployment metadata is in `deliverables/deployment.json`.

## Run and inspect

```sh
npm run demo -- 01-specificity
# Or run a lab's small wrapper:
node labs/01-specificity/demo.mjs
# Run only the six new labs (17 requests: 16 chat and one embedding batch):
npm run demo -- advanced
# Run every lab (48 planned requests, including tool follow-ups and embeddings):
npm run demo -- all
npm run gallery
npm run publish
npm run verify
```

Prompts are editable in `lib/labs.mjs`. The shared runner is deliberately small:
it sends requests, displays results, validates selected behaviors, and writes
`results/<lab-id>.json`. API failures stop execution; Azure content-filter rejections are saved explicitly
as blocked outcomes, not model answers. Behavior-check failures
retain the actual results and return a nonzero exit status; do not conceal them.
Rerunning a lab overwrites that lab's saved record and makes new billable requests.
The public gallery shows **saved outcomes**, not a live inference backend.
The demo clients run on a teacher/student machine; inference runs in Azure.
Memory labs spawn fresh Node processes and save isolated synthetic stores in
`results/memory/`. The gallery publishes only recorded evidence, not raw local
stores. Multi-turn results preserve actual previous model replies. Tool-chain
results include the ordered executions and final tool transcript. Embedding
results include ranking, dimensions, and usage, not a misleading chat answer
from the embedding model. Additional API requests are included in report totals.

The small automated checks cover label extraction, JSON shape and values,
token thresholds, context, grounding, and tool use. Azure blocked the untrusted-
context request in the recorded run; its defensive variant was not executed.
The missing-citation first attempt is retained alongside the refined grounding
result. Sampling
diversity is reported, never guaranteed. Assess the model-comparison lab with
the rubric in its README; latency from one run is not a benchmark.

## Record and build the deck

**Current status:** all eighteen labs have real outcomes (lab 10 is an explicit
Azure block), and the teaching gallery is deployed. Recording could not proceed:
the integrated browser was hidden and the user was unavailable to reveal it.
The 24-slide deck is therefore a **draft with real text outcomes, not videos**.
No recordings or model answers were fabricated.

Use the integrated-browser recording workflow in `scripts/record-browser.js`
after revealing the browser. Replace `GALLERY_URL` with the URL from
`deliverables/deployment.json` and `STORAGE_DIRECTORY` with your session path.
Save WebM recordings and the completed recording script in your Copilot session
storage, not this workspace. The script records **already executed Azure
outcomes**, not a reenacted live API run. Each lab is under one minute.
Convert each WebM to MP4 with ffmpeg:

```sh
ffmpeg -i /ABSOLUTE/SESSION/01-specificity.webm -an \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  /ABSOLUTE/SESSION/01-specificity.mp4

npm run deck -- --media-directory /ABSOLUTE/SESSION
npm run gallery -- --media-directory /ABSOLUTE/SESSION
npm run publish -- --media-directory /ABSOLUTE/SESSION --include-deck
npm run verify -- --media
```

When recordings are available, `deliverables/AI-Basics.pptx` embeds all eighteen MP4s
and includes public recording links for viewers that cannot play embedded media.
To rebuild the current clearly marked draft: `npm run deck -- --allow-missing-recordings`. Desktop PowerPoint is the
recommended playback application. `deliverables/outcomes.md` records actual
outputs, tokens, latency, and teaching cautions; it is generated from results.

## Cost controls and cleanup

No VMs, always-on app servers, databases, or provisioned-throughput deployments.
Static Web Apps uses its Free tier and its usage limits.
The full planned default run has 48 API requests (a filter rejection stops the
runner early; the instructor can execute remaining labs individually). Visible-output caps are usually
320 tokens; the reasoning request has a 1,400-token total completion cap.
Caps reduce exposure but **do not enforce a dollar spending limit**. Azure
budgets are alerts, not hard stops. Confirm current Azure pricing and set a
subscription/resource-group budget before a large class. Each student's run
adds model cost. Check Free-tier hosting storage/bandwidth limits before publishing
videos or running a large class; do not upgrade to paid hosting automatically.

To remove only this kit's hosting (and optional newly created classroom models):

```sh
az group show --name rg-aibasics-classroom --query tags
# After verifying the ai-basics-classroom project tag and group contents:
az group delete --name rg-aibasics-classroom --yes
```

Never delete the reused AI resource group. Deleting hosting breaks public links;
the completed local deck will retain embedded videos.

## Validation and deployment-tool caveat

Focused tests, both Bicep builds, deployed JSON equality, all 43 displayed
variants, and the downloaded PowerPoint's SHA-256 were checked. The draft
PowerPoint has 24 slides, 24 speaker-note pages, and 18 explicit recording-pending
notices. Actual video playback is not verified because recording is blocked by
the hidden browser.

The official Static Web Apps CLI brings development-only dependencies. Targeted
overrides removed high-severity image/ZIP/temp-file advisories; the current audit
still reports **2 low and 4 moderate** tooling advisories. No CLI dependencies
are shipped to the public gallery. Do not use this dependency tree to serve
untrusted configurations; a breaking downgrade of Azure's deployment CLI was
not applied. Recheck `npm audit` as upstream fixes become available.

## Official references
- [Azure OpenAI chat completions](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/chatgpt)
- [Reasoning models and supported parameters](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/reasoning)
- [Structured outputs](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/structured-outputs)
- [Tool calling](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/function-calling)
- [Static Web Apps deployment](https://learn.microsoft.com/azure/static-web-apps/static-web-apps-cli-deploy)
