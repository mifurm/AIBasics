# AI Basics: thirty-nine small classroom labs

For beginners; English; JavaScript/Node.js 22+. Allow 325-365 minutes for all labs.
Start with lab 00, then teach labs 1-7, 8-12, 13-18, 19-24, 25-28, 29-31 (inside a model), 32-35 (images and sound),
and 36-38 (music, video, and evaluation) in eight lessons. Every lab has a
script, a teacher-friendly README, and real Azure outputs after execution.

## Learning path

| Lab | Topic | Time |
| --- | --- | --- |
| [00](labs/00-tiny-transformer/readme.md) | Train and inspect a tiny causal transformer | 10 min |
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
| [12](labs/12-models/readme.md) | Same prompts, different models | 12 min |
| [13](labs/13-persistent-memory/readme.md) | Memory across fresh processes | 6 min |
| [14](labs/14-memory-lifecycle/readme.md) | Remember, replace, forget | 6 min |
| [15](labs/15-multiturn/readme.md) | Real generated multi-turn dialogue | 7 min |
| [16](labs/16-summary-memory/readme.md) | Context summarization and token savings | 7 min |
| [17](labs/17-tool-chain/readme.md) | Catalog lookup followed by calculation | 8 min |
| [18](labs/18-semantic-memory/readme.md) | Embeddings and semantic memory retrieval | 8 min |
| [19](labs/19-workflow-agent/readme.md) | Workflow versus model-selected actions | 8 min |
| [20](labs/20-agent-feedback/readme.md) | Act, observe, repeat | 8 min |
| [21](labs/21-agent-clarification/readme.md) | Clarify missing requirements | 7 min |
| [22](labs/22-agent-state/readme.md) | Explicit current task state | 8 min |
| [23](labs/23-agent-errors/readme.md) | Tool errors and bounded recovery | 8 min |
| [24](labs/24-agent-stopping/readme.md) | Completion, impossibility, and limits | 8 min |
| [25](labs/25-agent-permissions/readme.md) | Read versus write permissions | 7 min |
| [26](labs/26-agent-approval/readme.md) | Exact-action approval | 8 min |
| [27](labs/27-agent-verification/readme.md) | Independent result verification | 8 min |
| [28](labs/28-agent-trace/readme.md) | Trace-based evaluation | 8 min |
| [29](labs/29-tokenization/readme.md) | Tokens: learned chunks, uneven costs | 10 min |
| [30](labs/30-logprobs/readme.md) | The model's real probabilities | 10 min |
| [31](labs/31-embedding-space/readme.md) | Meaning as geometry (embeddings) | 10 min |
| [32](labs/32-image-generation/readme.md) | From prompt to pixels (image generation) | 12 min |
| [33](labs/33-vision/readme.md) | What a vision model sees | 12 min |
| [34](labs/34-speech-roundtrip/readme.md) | Sound is samples: speech out, speech in | 12 min |
| [35](labs/35-diarization/readme.md) | Who spoke when (diarization) | 12 min |
| [36](labs/36-music-tokens/readme.md) | Music is tokens | 12 min |
| [37](labs/37-video-frames/readme.md) | Video is frames over time | 12 min |
| [38](labs/38-llm-judge/readme.md) | Can a model grade a model? | 14 min |

## Beyond text: the same ideas in every modality

Labs 29-38 take the first 29 labs' primitives (tokens, probabilities, embeddings, evaluation) to production-scale
models and to images, sound, music, and video. The same loop appears everywhere: turn the input into tokens or
frames, let a model score what comes next, then decode.

```mermaid
flowchart LR
  T[Text<br/>subword tokens] --> M((Model))
  I[Image<br/>image tokens] --> M
  S[Speech<br/>audio samples, spectrogram frames] --> M
  V[Video<br/>sampled frames over time] --> M
  N[Music<br/>note-event tokens] --> M
  M --> P[Next-token<br/>probabilities]
  P --> D[Sample or decode]
  D --> O[Text, pixels,<br/>audio samples, notes]
```

Two limits are stated openly rather than hidden:

- **No video generation.** Azure's only video-generation model, Sora 2, passed its retirement date
  (2026-11-02) and is flagged *Deprecated* in this subscription's regional catalog. Lab 37 therefore studies video
  *understanding* from frames. Nothing here pretends to generate video.
- **No music-generation model.** The catalog has none. Lab 36 teaches music as symbolic tokens with a tiny
  statistical model and GPT-4o, renders real audio, and verifies it by pitch tracking. It is not how audio music
  models work.

## Run the advanced GenAI labs entirely in Azure

They use models that are already deployed on the reused AI account: `gpt-4o`, `gpt-5-mini`, `text-embedding-3-small`,
`gpt-image-1.5` (image generation), `tts` (text to speech), `whisper` (speech to text), and
`gpt-4o-transcribe-diarize` (speaker diarization). The existing job identity's *Cognitive Services OpenAI User* role
already covers audio, image generation, chat, and embeddings. No video model, music model, or new infrastructure
is required.

```sh
# Finds the media models by the model they serve, and creates only missing ones (use --dry-run to preview).
npm run deploy:media-models -- --confirm-costs
# Packages the runtime source (split across several environment variables) and updates the job.
npm run deploy:agents -- --confirm-costs
# Runs labs 29-38 inside Azure, downloads verified records and media files.
npm run azure:agents -- genai
# Or one lab, or several (comma-separated, no spaces):
npm run azure:agents -- 34-speech-roundtrip
npm run azure:agents -- 30-logprobs,33-vision,37-video-frames
npm run gallery
npm run publish -- --include-deck
npm run verify
```

`infra/models.bicep` also deploys the image, speech, transcription, and diarization models when it creates a new
classroom AI account (`includeMediaModels`, default true).

**How media gets out of the job.** Images (PNG), audio (WAV), and an SVG map cannot be scraped from console logs. Each
artifact is hashed (SHA-256), gzipped, base64-chunked, and submitted through the same authenticated Azure Monitor
Logs Ingestion channel as the JSON records, in requests kept below the 1 MB limit. The manifest, written last, lists
every record and artifact. `azure:agents` polls only that small manifest, then downloads everything once, rejects any
missing, conflicting, or corrupt chunk, and writes `results/<lab>.json` and `results/media/<lab>/`. Per-artifact
(2 MB) and per-lab (8 MB) caps protect the workspace's 0.1 GB daily ingestion cap, so avoid needless reruns.
`build-gallery`, `publish`, and `verify` copy, publish, and re-download every file and compare hashes.

**Rate limits.** The Standard `tts` and `whisper` deployments allow only 3 requests per window. The client reads
`Retry-After` and retries a bounded number of times, so those labs are slower but explicit about it.

**Cost.** One full execution is about 136 requests (the judge lab makes 56), three generated images, nine speech
syntheses, and nine transcriptions or diarizations. Caps reduce exposure; they are not a dollar limit.

## Start with the simplest model: Lab 00

[Lab 00](labs/00-tiny-transformer/readme.md) trains a real 833-parameter
decoder-only transformer from seeded initialization on two fictional sentences.
One block and one attention head expose token/position embeddings, causal
attention, normalization, residual paths, a feed-forward network, logits, and
next-token probabilities. Three experiments show training versus prompting,
the causal boundary with an unmasked control, and one-token-at-a-time generation.
Students inspect measured tables and vectors rather than implement matrix math.

The [architecture poster](web/transformer.svg) and a Mermaid version in the lab
README explain the same implemented architecture. It is not GPT internals or a
useful general language model. The nine-token vocabulary is deliberately tiny
and word-based, unlike typical subword LLM vocabularies.

```sh
# CPU-only local preview: no Azure login, API call, or extra dependency.
npm run demo -- 00-tiny-transformer

# After shared Azure setup, deploy the current source and train inside Azure.
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 00-tiny-transformer
```

No new Azure infrastructure is required. Lab 00 uses zero model API requests;
Azure CPU execution and monitoring still incur charges. Training-token counts
are recorded separately from API billing usage. Its ID is 00, so existing labs
01-28 keep their identifiers in the gallery, scripts, deck, and recordings.

## Agent primitives: a goal, tools, observations, and boundaries

Labs 19-28 extend the enforced tool chain in lab 17 into a bounded agent loop:
**goal -> model selects an action -> application validates and executes ->
observation -> next action or stop**. All use one fictional classroom-supplies
catalog, the existing GPT-4o deployment, and small Node.js functions. No agent
framework, multi-agent orchestration, real purchases, or student data is needed.

Each lab asks students to predict, run, inspect an actual trace, and check a
measurable outcome. The trace records messages, action arguments, observations,
before/after state, stop reason, and usage, not hidden chain-of-thought.
Approval and clarification replies are explicitly labelled scripted fixtures.
Draft reservations are synthetic state persisted with each run record.

## Compare real model outputs side by side

[Lab 12](labs/12-models/readme.md) compares existing Azure GPT-4o and GPT-5-mini
deployments on explanation, data extraction, and scheduling. Each task has a
broad and a specific prompt: six identical-prompt pairs, twelve actual model
responses. The gallery places both outputs, token usage, reported reasoning
tokens, latency, supported settings, and simple target checks side by side.

```sh
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 12-models
```

No new models or services are created. Target mismatches are preserved, not
hidden; a broad prompt was not asked to meet every specific-prompt target.
Single-run differences are observations, not rankings or a benchmark, and
identical correct outputs are valid findings.

## Run the agent labs entirely in Azure

First complete the existing [setup and deploy](#setup-and-deploy) to configure
Azure models and the teaching website. Then:

```sh
# Requires resource creation and role-assignment permissions in the classroom
# group and role-assignment permissions on the reused Azure AI account.
npm run deploy:agents -- --confirm-costs

# Starts an Azure job, waits, and downloads its private results.
npm run azure:agents -- agents
# Or run one lab:
npm run azure:agents -- 24-agent-stopping

# Rebuild and publish the saved-outcome gallery after a complete run.
npm run gallery
npm run publish
npm run verify
```

`infra/agents.bicep` deploys a **manual Azure Container Apps Job on Consumption**,
a Consumption-only environment, a user-assigned managed identity, and a
Log Analytics workspace for authenticated result retrieval. There is no
always-on replica, public API, database, storage account, or paid container registry. The official
Node.js 22 image is pulled from Docker Hub; registry/network restrictions can
prevent image startup and must not be bypassed.

`scripts/deploy-agents.mjs` packages only `lib/` and `scripts/` as a compressed
archive embedded in the job template. It excludes local configuration,
dependencies, and existing results. The job verifies the archive SHA-256 before
extraction. Managed identity calls Azure OpenAI; there are no model API keys,
SAS tokens, or Azure CLI inside the container. Azure configures its own logging
integration; the workspace ingestion key is not exposed to the runner or browser.
Source code is visible to users who can read the job template. Do not package
credentials or confidential teaching material.

The identity receives Cognitive Services OpenAI User on the selected AI account.
It also receives Monitoring Metrics Publisher scoped to the dedicated data
collection rule, so it can submit result records through the authenticated
Logs Ingestion API and require a successful acknowledgement.
The deploying user receives Log Analytics Reader on the new workspace.
The existing AI account and model settings are unchanged; only an RBAC grant is
added. RBAC can take several minutes to propagate; an early authorization failure
is explicit and a later rerun is billable.

The job defaults to labs 19-28 (21 variants). `azure:agents` also accepts `all`
or any existing lab ID, so earlier local tool/memory code can execute in Azure
too. One execution has one replica, no automatic retries, and a one-hour timeout.
Concurrent manual starts are possible and each incurs cost; result records use
unique run IDs. Do not start a duplicate while waiting for an existing execution.

Each agent variant permits at most six tool executions and seven Azure model
requests, except the deliberately one-tool case. Every model response has a
320-token output cap. The entire agent set has an upper bound of **142 chat
requests**, not a promised actual count or dollar cap. A forbidden or over-limit
action never becomes a successful write. API errors, failed checks, unverified
baskets, and exhausted budgets remain explicit.

Results persist as compressed, chunked records in the dedicated
`AIBasicsResults_CL` Azure Monitor table with 30-day retention. They are submitted
directly through the Logs Ingestion API, not scraped from best-effort console
logs. Each record has a SHA-256 integrity check;
the downloader rejects incomplete or conflicting chunks. Log ingestion can take
several minutes after the job finishes. This avoids opening a storage endpoint
in subscriptions where policy disables public storage networking.
If the local wait is interrupted, read the saved run ID and execution name in
`results/azure-execution.json` and resume retrieval without another billable run:

```sh
npm run azure:agents -- agents --run-id RUN_ID --execution EXECUTION_NAME
```

`results/azure-run.json` records execution status; downloaded lab records include
the Azure execution name. Failed checks preserve their real results and return a
nonzero exit code. The gallery remains a public, static view of fictional saved
outcomes, not an interactive agent backend.

After changing prompts, tools, or scripts, **redeploy** with `deploy:agents`
before the next Azure execution. Existing wrappers and `npm run demo -- agents`
remain optional local-runner alternatives with Azure inference; they are not
all-Azure execution.

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
# Run the new agent labs with a local runner and Azure inference:
npm run demo -- agents
# Run the ten advanced GenAI labs (about 136 billable requests, including three generated images):
npm run demo -- genai
# Run every lab (58 planned requests for labs 01-18, plus bounded agent requests):
npm run demo -- all
npm run gallery
npm run publish
npm run verify
```

Prompts are editable in `lib/labs.mjs`, `lib/model-comparison.mjs`,
`lib/advanced-labs.mjs`, `lib/agent-labs.mjs`, and the ten modules in `lib/genai/`. The shared runner is deliberately small:
it sends requests, displays results, validates selected behaviors, and writes
`results/<lab-id>.json`. API failures stop execution; Azure content-filter rejections are saved explicitly
as blocked outcomes, not model answers. Behavior-check failures
retain the actual results and return a nonzero exit status; do not conceal them.
Rerunning a lab overwrites that lab's saved record and makes new billable requests.
The public gallery shows **saved outcomes**, not a live inference backend.
The `demo` clients run on a teacher/student machine; inference runs in Azure.
Use `azure:agents` above to execute the runner and tools inside Azure as well.
Memory labs spawn fresh Node processes and save isolated synthetic stores in
`results/memory/`. The gallery publishes only recorded evidence, not raw local
stores. Multi-turn results preserve actual previous model replies. Tool-chain
results include the ordered executions and final tool transcript. Embedding
results include ranking, dimensions, and usage, not a misleading chat answer
from the embedding model. Additional API requests are included in report totals.

The small automated checks cover label extraction, JSON shape and values,
token thresholds, context, grounding, tool use, agent state, execution budgets,
permissions, exact-action approval, error recovery, and durable result integrity.
Azure blocked the untrusted-
context request in the recorded run; its defensive variant was not executed.
The missing-citation first attempt is retained alongside the refined grounding
result. Sampling
diversity is reported, never guaranteed. Assess the model-comparison lab with
the rubric in its README; latency from one run is not a benchmark.

## Record and build the deck

**Original recording status:** the first eighteen labs have real outcomes (lab 10 is an explicit
Azure block), and the teaching gallery is deployed. Recording could not proceed:
the integrated browser was hidden and the user was unavailable to reveal it.
The deck is therefore a **draft with real text outcomes, not videos**.
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

When recordings are available, `deliverables/AI-Basics.pptx` embeds all thirty-nine MP4s
and includes public recording links for viewers that cannot play embedded media.
To rebuild the current clearly marked draft: `npm run deck -- --allow-missing-recordings`. Desktop PowerPoint is the
recommended playback application. `deliverables/outcomes.md` records actual
outputs, tokens, latency, and teaching cautions; it is generated from results.

## Cost controls and cleanup

No VMs, always-on app servers, databases, or provisioned-throughput deployments.
The optional all-Azure runner adds billed Consumption job execution and Azure
Monitor log ingestion/retention. Idle compute scales to zero. The dedicated
workspace has a 0.1-GB daily ingestion cap and 30-day retention; that cap is not
a precise dollar limit and reaching it can prevent result capture. Download
evidence before retention expires. No automatic paid tier upgrade is performed.
Static Web Apps uses its Free tier and its usage limits.
Labs 01-18 now have 58 planned API requests, including twelve for the expanded
model comparison; the ten agent labs add at most 142 (at most 200 together), and the ten advanced
GenAI labs add about 136 more (image generation, speech, and transcription are billed per image, character, or
minute, not per token). Lab 00 adds no model API requests. Actual counts are in saved usage. A filter
rejection stops the
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
The optional agent job, environment, log workspace, data collection rule, and identity are in the same
classroom group, so deleting that group also deletes retained Azure run evidence.
Before deleting, inspect the agent identity's role assignment on the reused AI
account and remove that specific assignment with `az role assignment delete
--ids ROLE_ASSIGNMENT_ID`; do not remove other users' or applications' access.

## Validation and deployment-tool caveat

The original eighteen-lab release checked focused tests, both original Bicep
builds, deployed JSON equality, all 43 displayed variants, and the downloaded
PowerPoint's SHA-256. The agent extension adds focused runtime/identity/result
transport tests, two more Bicep templates, and Azure-job execution evidence.
The recorded agent release completed all 21 variants inside Azure: 62 chat requests,
32,571 reported tokens, and 78 passing behavior checks. All 23 automated tests,
all four Bicep builds, the 28-lab deployed manifest, browser navigation/stop
labelling/trace rubric, and the published draft deck's SHA-256 were verified.
That release's draft had 34 slides; token counts describe that run, not future cost.
Lab 00 adds focused numerical-gradient, causal-mask, actual-learning, generation,
and input-boundary tests. Its measured computation is not counted as model API usage.
All three introductory variants ran in the existing Azure job and passed eight
behavior checks. At that point the suite passed 27 tests; all 29 deployed lab records,
the architecture SVG, and the 35-slide draft deck were verified. Browser checks
confirmed the introductory tables, diagram rendering, and preserved lab IDs.

The advanced GenAI labs (29-38) add tests for the media codecs (PNG, WAV, FFT), tokenization and probability maths,
scoring (word error rate, diarization, judge bias), the Azure client's retries and request shapes, artifact validation,
and a full run of every lab against a fake Azure client. The current suite passes 84 tests. One execution inside Azure
(`aibasics-agents-zgfkrl6mqqsly-qn4z1aa`, about 4 minutes 40 seconds) completed all ten labs: 136 Azure requests,
38 media artifacts (6.1 MB), and 64 of 64 behavior checks passing; lab 36 was then re-run on its own after a wording
fix. All 39 deployed lab records and all 38 media files were verified against the saved results, a browser check
confirmed that the ten labs render with their images and audio and without console errors, and the draft deck has
45 slides. Counts and findings describe those runs, not future cost or model behaviour.

`npm run verify` checks every saved/deployed lab against the current evaluator.
The draft deck includes one slide per lab and explicit recording-pending
notices; actual video playback is not verified because no recordings were made.

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
- [Azure Container Apps jobs](https://learn.microsoft.com/azure/container-apps/jobs)
- [Container Apps managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [Azure OpenAI image generation](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/dall-e)
- [Text to speech](https://learn.microsoft.com/azure/ai-foundry/openai/text-to-speech-quickstart)
- [Whisper speech to text](https://learn.microsoft.com/azure/ai-foundry/openai/whisper-quickstart)
- [Vision-enabled chat models](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/gpt-with-vision)
- [Azure OpenAI model catalog and retirement dates](https://learn.microsoft.com/azure/ai-foundry/openai/concepts/models)
- [C2PA Content Credentials specification](https://c2pa.org/specifications/specifications/2.1/index.html)
