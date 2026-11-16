# Actual Azure teaching outcomes

Gallery: https://zealous-beach-0f7cd5003.4.azurestaticapps.net/

Recording is pending: the integrated browser remained hidden and the user was unavailable to reveal it. No videos were fabricated. The draft deck contains actual text outcomes and gallery links.

| Lab | Status | Requests represented | Total tokens reported |
| --- | --- | ---: | ---: |
| 1. From vague to useful | completed | 2 | 474 |
| 2. Roles and instruction priority | completed | 2 | 210 |
| 3. Teach a pattern with examples | completed | 2 | 82 |
| 4. Temperature: explore or repeat | completed | 6 | 164 |
| 5. Top-p: narrow the candidate pool | completed | 6 | 367 |
| 6. Tokens, limits, and truncation | completed | 2 | 364 |
| 7. Context is not permanent memory | completed | 2 | 112 |
| 8. Turn language into validated data | completed | 1 | 71 |
| 9. Ground answers in a source | completed | 2 | 175 |
| 10. Instructions hidden in source text | blocked | 1 | 0 (usage not reported) |
| 11. The model asks; code calculates | completed | 2 | 221 |
| 12. General chat versus a reasoning model | completed | 2 | 403 |
| 13. Memory survives a new process | completed | 2 | 106 |
| 14. Update and forget a saved fact | completed | 3 | 179 |
| 15. Build and revise a plan across turns | completed | 3 | 429 |
| 16. Compress context into a useful summary | completed | 3 | 657 |
| 17. Look up, then calculate with tools | completed | 3 | 559 |
| 18. Find a memory by meaning, not keywords | completed | 3 | 155 |

Final records represent 47 attempted requests and 4728 reported tokens.

The retained failed grounding attempt adds 2 requests and 160 tokens. Total captured execution: 49 attempted requests and 4888 reported tokens. The blocked request supplied no usage; these totals are not a billing statement.

Latency is wall-clock request time from this machine; tool latency sums both model requests. Token usage includes tool-request tokens and reported reasoning tokens. Cost depends on current per-model pricing and storage/egress.

## 1. From vague to useful

A useful prompt specifies the task, audience, constraints, and output format.

Recorded: 2026-11-14T16:47:05.228Z

Caution: More words are not automatically better; relevant constraints are what help.


### Vague


Model: gpt-4o-2024-11-20; latency: 4332 ms; finish: length.

Usage: `{"completion_tokens":320,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":31,"engine_ttlt_ms":1576,"pre_inference_ms":91,"service_tbt_ms":5,"service_ttft_ms":850,"service_ttlt_ms":2390,"user_visible_ttft_ms":758},"prompt_tokens":11,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":331}`

```text
Certainly! Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy from the sun into chemical energy in the form of sugar (glucose). This process is crucial for life on Earth, as it provides oxygen and serves as the foundation for the food chain.

### Components and Requirements of Photosynthesis:
1. **Light Energy**: Plants absorb light energy, usually from the sun, using chlorophyll, a green pigment in the chloroplasts.
2. **Carbon Dioxide (CO₂)**: Plants take in CO₂ from the air through small openings in their leaves called stomata.
3. **Water (H₂O)**: Plants absorb water from the soil through their roots.
4. **Chloroplasts**: These specialized organelles in plant cells contain chlorophyll and are the site where photosynthesis occurs.

### The Photosynthesis Equation:
The chemical equation for photosynthesis is:

**6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂**

In words:
Six molecules of carbon dioxide and six molecules of water react with light energy to produce one molecule of glucose and six molecules of oxygen.

### Two Stages of Photosynthesis:
Photosynthesis occurs in two main stages:

---

#### 1. **Light-Dependent Reactions** (Occurs in the thylakoid membranes of the chloroplasts):
   - **What Happens**: During this stage, sunlight is absorbed by chlorophyll. The energy from light is used to split water molecules into oxygen (
```


### Specific


Model: gpt-4o-2024-11-20; latency: 1463 ms; finish: stop.

Usage: `{"completion_tokens":106,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":21,"engine_ttlt_ms":726,"pre_inference_ms":88,"service_tbt_ms":7,"service_ttft_ms":413,"service_ttlt_ms":1114,"user_visible_ttft_ms":325},"prompt_tokens":37,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":143}`

```text
1. **Sunlight is the stove**: Plants use sunlight like a stove to power their "kitchen." It gives them the energy they need to cook food.  
2. **Water and carbon dioxide are the ingredients**: Plants take water from their roots and carbon dioxide from the air—their special recipe ingredients!  
3. **Sugar is the food**: Using sunlight energy, plants mix those ingredients to make sugar (their food) and give off oxygen—like sharing fresh-baked cookies with the world!  
```


## 2. Roles and instruction priority

System instructions set application behavior; user messages supply the task.

Recorded: 2026-11-14T16:47:08.360Z

Caution: Roles influence behavior, not knowledge or infallibility. They are not security boundaries.


### Friendly tutor


Model: gpt-4o-2024-11-20; latency: 1492 ms; finish: stop.

Usage: `{"completion_tokens":59,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":24,"engine_ttlt_ms":467,"pre_inference_ms":102,"service_tbt_ms":7,"service_ttft_ms":841,"service_ttlt_ms":1280,"user_visible_ttft_ms":739},"prompt_tokens":35,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":94}`

```text
Gravity is like an invisible friend on the playground who always pulls you toward the ground, helping you stay connected to it. It's why you don’t float away while playing and why a ball comes back down after you throw it up. Gravity keeps everything on Earth grounded, like a big gentle hug!
```


### Science editor


Model: gpt-4o-2024-11-20; latency: 1639 ms; finish: stop.

Usage: `{"completion_tokens":78,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":28,"engine_ttlt_ms":581,"pre_inference_ms":61,"service_tbt_ms":7,"service_ttft_ms":823,"service_ttlt_ms":1371,"user_visible_ttft_ms":762},"prompt_tokens":38,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":116}`

```text
**Definition:** Gravity is the natural force of attraction between massive objects, particularly noticeable as the pull exerted by planets on nearby matter due to their mass and the curvature of spacetime predicted by Einstein's theory of General Relativity.  

**Caveat:** Gravity weakens with distance, but its range is infinite; however, quantum theories struggle to fully integrate it with other fundamental forces.
```


## 3. Teach a pattern with examples

Few-shot prompting puts examples in the context; it does not retrain the model.

Recorded: 2026-11-14T16:47:09.971Z

Caution: A model can misunderstand examples; include diverse examples and evaluate new inputs.


### No label definitions


Model: gpt-4o-2024-11-20; latency: 621 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":27,"engine_ttlt_ms":35,"pre_inference_ms":74,"service_tbt_ms":9,"service_ttft_ms":399,"service_ttlt_ms":408,"user_visible_ttft_ms":324},"prompt_tokens":23,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":24}`

```text
SUN
```


### Examples define labels


Model: gpt-4o-2024-11-20; latency: 988 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":29,"engine_ttlt_ms":37,"pre_inference_ms":74,"service_tbt_ms":10,"service_ttft_ms":819,"service_ttlt_ms":829,"user_visible_ttft_ms":744},"prompt_tokens":57,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":58}`

```text
SUN
```


- Passed / observed: Few-shot label: SUN


## 4. Temperature: explore or repeat

Temperature changes the next-token probability distribution before sampling.

Recorded: 2026-11-14T16:47:14.058Z

Caution: Temperature zero is not a guarantee of identical responses. Higher temperature is not higher intelligence.


### Temperature 0, trial 1


Model: gpt-4o-2024-11-20; latency: 998 ms; finish: stop.

Usage: `{"completion_tokens":3,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":26,"engine_ttlt_ms":48,"pre_inference_ms":63,"service_tbt_ms":6,"service_ttft_ms":797,"service_ttlt_ms":816,"user_visible_ttft_ms":734},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":27}`

```text
Circuit Sprouts
```


### Temperature 0, trial 2


Model: gpt-4o-2024-11-20; latency: 630 ms; finish: stop.

Usage: `{"completion_tokens":3,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":31,"engine_ttlt_ms":55,"pre_inference_ms":94,"service_tbt_ms":6,"service_ttft_ms":432,"service_ttlt_ms":449,"user_visible_ttft_ms":338},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":27}`

```text
Circuit Sprouts
```


### Temperature 0, trial 3


Model: gpt-4o-2024-11-20; latency: 578 ms; finish: stop.

Usage: `{"completion_tokens":3,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":30,"engine_ttlt_ms":54,"pre_inference_ms":66,"service_tbt_ms":7,"service_ttft_ms":403,"service_ttlt_ms":423,"user_visible_ttft_ms":336},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":27}`

```text
Circuit Sprouts
```


### Temperature 1.2, trial 1


Model: gpt-4o-2024-11-20; latency: 598 ms; finish: stop.

Usage: `{"completion_tokens":5,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":32,"engine_ttlt_ms":71,"pre_inference_ms":65,"service_tbt_ms":6,"service_ttft_ms":407,"service_ttlt_ms":435,"user_visible_ttft_ms":342},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":29}`

```text
RoboRuckus
```


### Temperature 1.2, trial 2


Model: gpt-4o-2024-11-20; latency: 694 ms; finish: stop.

Usage: `{"completion_tokens":3,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":30,"engine_ttlt_ms":59,"pre_inference_ms":96,"service_tbt_ms":8,"service_ttft_ms":426,"service_ttlt_ms":450,"user_visible_ttft_ms":330},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":27}`

```text
Byte Bunch
```


### Temperature 1.2, trial 3


Model: gpt-4o-2024-11-20; latency: 587 ms; finish: stop.

Usage: `{"completion_tokens":3,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":33,"engine_ttlt_ms":58,"pre_inference_ms":59,"service_tbt_ms":7,"service_ttft_ms":387,"service_ttlt_ms":410,"user_visible_ttft_ms":329},"prompt_tokens":24,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":27}`

```text
Gearheads Anonymous
```


- Passed / observed: Unique outputs in Temperature 0: 1 / 3. Observation only; no diversity threshold.


- Passed / observed: Unique outputs in Temperature 1.2: 3 / 3. Observation only; no diversity threshold.


## 5. Top-p: narrow the candidate pool

Top-p samples from a set of tokens whose cumulative probability reaches p.

Recorded: 2026-11-14T16:47:20.893Z

Caution: Three samples cannot establish a statistical effect. Normally tune temperature OR top-p, not both.


### Top-p 0.1, trial 1


Model: gpt-4o-2024-11-20; latency: 1207 ms; finish: stop.

Usage: `{"completion_tokens":30,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":27,"engine_ttlt_ms":232,"pre_inference_ms":72,"service_tbt_ms":7,"service_ttft_ms":827,"service_ttlt_ms":1024,"user_visible_ttft_ms":755},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":55}`

```text
The library's ancient silence shattered as the tiny robot sneezed, ejecting a cloud of glittering data that began rewriting the books around it.
```


### Top-p 0.1, trial 2


Model: gpt-4o-2024-11-20; latency: 1267 ms; finish: stop.

Usage: `{"completion_tokens":39,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":31,"engine_ttlt_ms":314,"pre_inference_ms":74,"service_tbt_ms":7,"service_ttft_ms":836,"service_ttlt_ms":1103,"user_visible_ttft_ms":762},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":64}`

```text
The library's ancient silence was shattered when the tiny robot, no larger than a teacup, declared in a booming voice, "I have found the forbidden book, and it’s alive."
```


### Top-p 0.1, trial 3


Model: gpt-4o-2024-11-20; latency: 1253 ms; finish: stop.

Usage: `{"completion_tokens":30,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":30,"engine_ttlt_ms":247,"pre_inference_ms":102,"service_tbt_ms":7,"service_ttft_ms":864,"service_ttlt_ms":1066,"user_visible_ttft_ms":762},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":55}`

```text
The library's ancient silence shattered as the tiny robot sneezed, ejecting a cloud of glittering data that began rewriting the books around it.
```


### Top-p 1, trial 1


Model: gpt-4o-2024-11-20; latency: 1257 ms; finish: stop.

Usage: `{"completion_tokens":43,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":30,"engine_ttlt_ms":340,"pre_inference_ms":45,"service_tbt_ms":7,"service_ttft_ms":791,"service_ttlt_ms":1098,"user_visible_ttft_ms":746},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":68}`

```text
The robot, no larger than a teacup, had spent 87 years meticulously rearranging the books in the library, unaware that the building had been abandoned decades ago and its walls now whispered back to it.
```


### Top-p 1, trial 2


Model: gpt-4o-2024-11-20; latency: 942 ms; finish: stop.

Usage: `{"completion_tokens":33,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":38,"engine_ttlt_ms":273,"pre_inference_ms":103,"service_tbt_ms":7,"service_ttft_ms":455,"service_ttlt_ms":694,"user_visible_ttft_ms":352},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":58}`

```text
The library's ancient oak shelves trembled as the tiny robot, no taller than a paperback, quietly erased the word "forever" from every book it touched.
```


### Top-p 1, trial 3


Model: gpt-4o-2024-11-20; latency: 907 ms; finish: stop.

Usage: `{"completion_tokens":42,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":25,"engine_ttlt_ms":337,"pre_inference_ms":82,"service_tbt_ms":7,"service_ttft_ms":406,"service_ttlt_ms":714,"user_visible_ttft_ms":324},"prompt_tokens":25,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":67}`

```text
The library’s ancient card catalog shuddered to life with a sneeze-sized puff of dust as the tiny robot emerged from the drawer, clutching a missing book's overdue notice dated 187 years ago.
```


- Passed / observed: Unique outputs in Top-p 0.1: 2 / 3. Observation only; no diversity threshold.


- Passed / observed: Unique outputs in Top-p 1: 3 / 3. Observation only; no diversity threshold.


## 6. Tokens, limits, and truncation

Models read and generate tokens, not words. An output limit can cut off an answer.

Recorded: 2026-11-14T16:47:24.377Z

Caution: max_tokens limits output, not input or total cost. Token-to-word ratios vary by language.


### Output cap 24


Model: gpt-4o-2024-11-20; latency: 1229 ms; finish: length.

Usage: `{"completion_tokens":24,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":33,"engine_ttlt_ms":158,"pre_inference_ms":48,"service_tbt_ms":5,"service_ttft_ms":837,"service_ttlt_ms":948,"user_visible_ttft_ms":790},"prompt_tokens":30,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":54}`

```text
1. **Choose the right plant**: Select a hardy, low-maintenance plant that thrives indoors, such as a
```


### Output cap 280


Model: gpt-4o-2024-11-20; latency: 2254 ms; finish: length.

Usage: `{"completion_tokens":280,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":33,"engine_ttlt_ms":1594,"pre_inference_ms":88,"service_tbt_ms":6,"service_ttft_ms":420,"service_ttlt_ms":1977,"user_visible_ttft_ms":332},"prompt_tokens":30,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":310}`

```text
1. **Choose the right plant**: Select a hardy, low-maintenance plant that thrives indoors, such as a pothos, spider plant, or peace lily.  
2. **Place the plant in proper lighting**: Position the plant where it can receive adequate sunlight or indirect light, depending on its specific needs.  
3. **Water consistently**: Water the plant regularly, ensuring the soil stays moist but not overly saturated to avoid root rot.  
4. **Check soil moisture**: Use your finger or a moisture meter to check the soil before watering to prevent overwatering or underwatering.  
5. **Use appropriate soil**: Ensure the plant is potted in nutrient-rich, well-draining soil suitable for its species.  
6. **Fertilize occasionally**: Feed the plant with a balanced fertilizer every few months to promote healthy growth.  
7. **Dust the leaves**: Wipe the leaves gently with a damp cloth to remove dust and improve photosynthesis.  
8. **Prune as needed**: Trim dead or yellowing leaves to keep the plant healthy and encourage new growth.  
9. **Monitor for pests**: Regularly inspect the plant for signs of pests like aphids or spider mites and treat infestations promptly.  
10. **Rotate the plant**: Turn the pot occasionally to ensure even growth and prevent the plant from leaning
```


- Passed / observed: Low cap is respected: 24 <= 24


- Passed / observed: Low cap demonstrates truncation: length


- Passed / observed: Higher cap is respected: 280 <= 280


## 7. Context is not permanent memory

A chat request knows earlier turns only when the application sends them again.

Recorded: 2026-11-14T16:47:26.052Z

Caution: This demonstrates explicit request context, not all product memory features or the context-window limit.


### History included


Model: gpt-4o-2024-11-20; latency: 635 ms; finish: stop.

Usage: `{"completion_tokens":8,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":2,"engine_ttft_ms":31,"engine_ttlt_ms":51,"pre_inference_ms":97,"service_tbt_ms":1,"service_ttft_ms":438,"service_ttlt_ms":445,"user_visible_ttft_ms":341},"prompt_tokens":59,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":67}`

```text
Your classroom robot is named Pebble.
```


### Fresh request


Model: gpt-4o-2024-11-20; latency: 1039 ms; finish: stop.

Usage: `{"completion_tokens":10,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":3,"engine_ttft_ms":37,"engine_ttlt_ms":75,"pre_inference_ms":71,"service_tbt_ms":3,"service_ttft_ms":848,"service_ttlt_ms":880,"user_visible_ttft_ms":777},"prompt_tokens":35,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":45}`

```text
I do not know your classroom robot's name.
```


- Passed / observed: Sent history is used: Your classroom robot is named Pebble.


- Passed / observed: Missing history is acknowledged: I do not know your classroom robot's name.


## 8. Turn language into validated data

A schema constrains the output shape; application validation checks the extracted values.

Recorded: 2026-11-14T16:47:26.763Z

Caution: A correct JSON shape does not guarantee correct facts. Validate both shape and meaning.


### Strict JSON extraction


Model: gpt-4o-2024-11-20; latency: 711 ms; finish: stop.

Usage: `{"completion_tokens":10,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":10,"engine_ttft_ms":32,"engine_ttlt_ms":137,"pre_inference_ms":75,"service_tbt_ms":9,"service_ttft_ms":422,"service_ttlt_ms":515,"user_visible_ttft_ms":347},"prompt_tokens":61,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":71}`

```text
{"item":"notebooks","quantity":3}
```


- Passed / observed: Exact schema and extracted values: {"item":"notebooks","quantity":3}


## 9. Ground answers in a source

Providing relevant source text can reduce unsupported guesses; this is the generation part of RAG.

Recorded: 2026-11-14T16:49:07.477Z

Caution: This tiny lab uses manually selected text, not a vector database or complete retrieval pipeline. Citations must be checked.


### No source


Model: gpt-4o-2024-11-20; latency: 2183 ms; finish: stop.

Usage: `{"completion_tokens":29,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":31,"engine_ttlt_ms":197,"pre_inference_ms":74,"service_tbt_ms":6,"service_ttft_ms":421,"service_ttlt_ms":584,"user_visible_ttft_ms":346},"prompt_tokens":31,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":60}`

```text
I do not know when the fictional Pebble Robotics Club meets or who founded it. If you'd like, you can provide more context or details!
```


### Source supplied: refined citation instruction


Model: gpt-4o-2024-11-20; latency: 909 ms; finish: stop.

Usage: `{"completion_tokens":29,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":29,"engine_ttlt_ms":191,"pre_inference_ms":82,"service_tbt_ms":5,"service_ttft_ms":416,"service_ttlt_ms":565,"user_visible_ttft_ms":334},"prompt_tokens":86,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":115}`

```text
The Pebble Robotics Club meets Tuesdays at 16:00 in Room 7 [club-1]. The founder is not in the source.
```


- Passed / observed: Supported fact and citation: The Pebble Robotics Club meets Tuesdays at 16:00 in Room 7 [club-1]. The founder is not in the source.


- Passed / observed: Missing founder is acknowledged: The Pebble Robotics Club meets Tuesdays at 16:00 in Room 7 [club-1]. The founder is not in the source.


## 10. Instructions hidden in source text

Retrieved content is untrusted data. Azure may block a conflicting source instruction before generating an answer.

Recorded: 2026-11-14

Caution: Azure blocked the first case in our run; the second was not executed. Do not disable filters. A defensive prompt alone is not a complete defense.


### Untrusted text, no explicit boundary


**Blocked**: Azure request failed (400): content_filter: The response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766

No completion was generated. Remaining variants were not executed.


## 11. The model asks; code calculates

A tool call is a structured request. The application validates it and executes allowlisted code.

Recorded: 2026-11-14T16:48:10.947Z

Caution: The model does not run arbitrary code. This lab permits only nonnegative integer multiplication.


### Calculate classroom supplies


Model: gpt-4o-2024-11-20; latency: 2864 ms; finish: stop.

Usage: `{"completion_tokens":18,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":2,"engine_ttft_ms":29,"engine_ttlt_ms":75,"pre_inference_ms":83,"service_tbt_ms":2,"service_ttft_ms":413,"service_ttlt_ms":453,"user_visible_ttft_ms":330},"prompt_tokens":108,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":126}`

```text
The total cost for 17 robot kits at 23 credits each is 391 credits.
```


Tool trace: `{"arguments":{"quantity":17,"unitPrice":23},"total":391}`

Additional first-request usage: `{"completion_tokens":10,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":28,"engine_ttlt_ms":68,"pre_inference_ms":70,"service_tbt_ms":4,"service_ttft_ms":407,"service_ttlt_ms":443,"user_visible_ttft_ms":336},"prompt_tokens":85,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":95}`


- Passed / observed: Allowlisted code calculated 391: {"arguments":{"quantity":17,"unitPrice":23},"total":391}


- Passed / observed: Final answer uses tool result: The total cost for 17 robot kits at 23 credits each is 391 credits.


## 12. General chat versus a reasoning model

Models differ in training, capabilities, latency, cost, and supported API parameters.

Recorded: 2026-11-14T16:48:15.270Z

Caution: One easy task is not a benchmark. GPT-5-mini uses reasoning tokens; do not request or expose hidden chain-of-thought.


### GPT-4o: general chat


Model: gpt-4o-2024-11-20; latency: 1243 ms; finish: stop.

Usage: `{"completion_tokens":81,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":32,"engine_ttlt_ms":509,"pre_inference_ms":82,"service_tbt_ms":6,"service_ttft_ms":417,"service_ttlt_ms":889,"user_visible_ttft_ms":335},"prompt_tokens":57,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":138}`

```text
**Schedule:**  
Slot 1: Plant Demo  
Slot 2: Robot Demo  
Slot 3: Art Demo  

**Constraint Check:**  
- Robot immediately follows Plant: ✅ (Robot is in Slot 2 after Plant in Slot 1)  
- Art is not first: ✅ (Art is in Slot 3)  
- Unique schedule: ✅ (Only one arrangement satisfies all constraints).
```


### GPT-5-mini: reasoning


Model: gpt-5-mini-2025-08-07; latency: 2755 ms; finish: stop.

Usage: `{"completion_tokens":209,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":128,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":34,"engine_ttlt_ms":1666,"pre_inference_ms":107,"service_tbt_ms":7,"service_ttft_ms":391,"service_ttlt_ms":2056,"user_visible_ttft_ms":284},"prompt_tokens":56,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":265}`

```text
Schedule: Slot 1 — Plant; Slot 2 — Robot; Slot 3 — Art.

Constraint check: Robot immediately follows Plant (slots 1→2). Art is not first (slot 3). Plant cannot be in slot 2 or 3 because Robot must follow it and Art cannot be first, so this is the unique valid schedule.
```


## 13. Memory survives a new process

An application can save a fact to disk and explicitly load it into a fresh chat. The model weights do not change.

Recorded: 2026-11-14T20:04:24.385Z

Caution: This is a local fictional classroom store, not Copilot Memory or automatic Azure chat memory. Save only approved, relevant facts.


### Saved file, but not sent to model


Model: gpt-4o-2024-11-20; latency: 2863 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":39,"engine_ttlt_ms":48,"pre_inference_ms":85,"service_tbt_ms":12,"service_ttft_ms":907,"service_ttlt_ms":920,"user_visible_ttft_ms":823},"prompt_tokens":43,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":44}`

```text
UNKNOWN
```


memoryTrace:

```json
{
  "memory": {
    "mascot": "Otter"
  },
  "processId": 12512,
  "action": "write",
  "injected": false
}
```


### New process reads file into fresh chat


Model: gpt-4o-2024-11-20; latency: 1198 ms; finish: stop.

Usage: `{"completion_tokens":2,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":24,"engine_ttlt_ms":39,"pre_inference_ms":68,"service_tbt_ms":7,"service_ttft_ms":812,"service_ttlt_ms":827,"user_visible_ttft_ms":744},"prompt_tokens":60,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":62}`

```text
Otter
```


memoryTrace:

```json
{
  "memory": {
    "mascot": "Otter"
  },
  "processId": 12591,
  "action": "read",
  "injected": true
}
```


- Passed / observed: File alone does not give model memory: UNKNOWN


- Passed / observed: Fresh process loads the saved mascot: {"memory":{"mascot":"Otter"},"processId":12591,"action":"read","injected":true}


## 14. Update and forget a saved fact

Persistent memory needs explicit write, replacement, and deletion rules. Old values should not be sent again.

Recorded: 2026-11-14T20:04:27.253Z

Caution: Deleting this demo store does not erase old recordings, results, provider logs, or backups. Public evidence contains fictional facts.


### Remember: Otter


Model: gpt-4o-2024-11-20; latency: 638 ms; finish: stop.

Usage: `{"completion_tokens":2,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":24,"engine_ttlt_ms":39,"pre_inference_ms":114,"service_tbt_ms":9,"service_ttft_ms":437,"service_ttlt_ms":454,"user_visible_ttft_ms":323},"prompt_tokens":60,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":62}`

```text
Otter
```


memoryTrace:

```json
{
  "memory": {
    "mascot": "Otter"
  },
  "processId": 12612,
  "action": "write",
  "injected": true
}
```


### Replace: Falcon


Model: gpt-4o-2024-11-20; latency: 1047 ms; finish: stop.

Usage: `{"completion_tokens":2,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":5,"engine_ttft_ms":24,"engine_ttlt_ms":39,"pre_inference_ms":75,"service_tbt_ms":10,"service_ttft_ms":820,"service_ttlt_ms":840,"user_visible_ttft_ms":745},"prompt_tokens":60,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":62}`

```text
Falcon
```


memoryTrace:

```json
{
  "memory": {
    "mascot": "Falcon"
  },
  "processId": 12615,
  "action": "replace",
  "injected": true
}
```


### Forget: no value supplied


Model: gpt-4o-2024-11-20; latency: 1065 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":30,"engine_ttlt_ms":39,"pre_inference_ms":60,"service_tbt_ms":4,"service_ttft_ms":805,"service_ttlt_ms":809,"user_visible_ttft_ms":745},"prompt_tokens":54,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":55}`

```text
UNKNOWN
```


memoryTrace:

```json
{
  "memory": {},
  "processId": 12637,
  "action": "forget",
  "injected": true
}
```


- Passed / observed: Remembered and replaced values: Otter -> Falcon


- Passed / observed: Forgotten value absent from store and fresh request: {"memory":{},"processId":12637,"action":"forget","injected":true}


## 15. Build and revise a plan across turns

Each follow-up request includes actual earlier model replies, so references such as "it" have context.

Recorded: 2026-11-14T20:04:29.675Z

Caution: History is explicitly resent and billed again. This is real generated dialogue, not handwritten assistant turns.


### Turn 1: create the plan


Model: gpt-4o-2024-11-20; latency: 735 ms; finish: stop.

Usage: `{"completion_tokens":14,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":6,"engine_ttft_ms":26,"engine_ttlt_ms":114,"pre_inference_ms":77,"service_tbt_ms":10,"service_ttft_ms":425,"service_ttlt_ms":571,"user_visible_ttft_ms":348},"prompt_tokens":90,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":104}`

```text
{"project":"robot","color":"blue","material":"cardboard"}
```


### Turn 2: revise it


Model: gpt-4o-2024-11-20; latency: 634 ms; finish: stop.

Usage: `{"completion_tokens":14,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":3,"engine_ttft_ms":28,"engine_ttlt_ms":68,"pre_inference_ms":77,"service_tbt_ms":3,"service_ttft_ms":407,"service_ttlt_ms":443,"user_visible_ttft_ms":330},"prompt_tokens":128,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":142}`

```text
{"project":"robot","color":"red","material":"cardboard"}
```


### Turn 3: recall the revised plan


Model: gpt-4o-2024-11-20; latency: 1052 ms; finish: stop.

Usage: `{"completion_tokens":14,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":3,"engine_ttft_ms":30,"engine_ttlt_ms":80,"pre_inference_ms":81,"service_tbt_ms":3,"service_ttft_ms":835,"service_ttlt_ms":881,"user_visible_ttft_ms":754},"prompt_tokens":169,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":183}`

```text
{"project":"robot","color":"red","material":"cardboard"}
```


- Passed / observed: Turn 1 preserves the correct plan: {"project":"robot","color":"blue","material":"cardboard"}


- Passed / observed: Turn 2 preserves the correct plan: {"project":"robot","color":"red","material":"cardboard"}


- Passed / observed: Turn 2 uses actual previous reply: Generated assistant reply included, not handwritten.


- Passed / observed: Turn 3 preserves the correct plan: {"project":"robot","color":"red","material":"cardboard"}


- Passed / observed: Turn 3 uses actual previous reply: Generated assistant reply included, not handwritten.


## 16. Compress context into a useful summary

An application can replace a long transcript with a shorter summary, trading token use against the risk of losing facts.

Recorded: 2026-11-14T20:04:32.649Z

Caution: Summaries are lossy and can introduce mistakes. Check the preserved decisions; never assume every omitted detail is irrelevant.


### Summarize the long notes


Model: gpt-4o-2024-11-20; latency: 1268 ms; finish: stop.

Usage: `{"completion_tokens":20,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":30,"engine_ttlt_ms":115,"pre_inference_ms":88,"service_tbt_ms":4,"service_ttft_ms":948,"service_ttlt_ms":1027,"user_visible_ttft_ms":860},"prompt_tokens":496,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":516}`

```text
Project name: Comet.  
Budget: 42 fictional credits.  
Presentation day: Friday.
```


### Fresh chat without the summary


Model: gpt-4o-2024-11-20; latency: 1012 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":45,"engine_ttlt_ms":53,"pre_inference_ms":75,"service_tbt_ms":4,"service_ttft_ms":829,"service_ttlt_ms":833,"user_visible_ttft_ms":754},"prompt_tokens":44,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":45}`

```text
UNKNOWN
```


### Fresh chat with generated summary


Model: gpt-4o-2024-11-20; latency: 692 ms; finish: stop.

Usage: `{"completion_tokens":22,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":2,"engine_ttft_ms":33,"engine_ttlt_ms":88,"pre_inference_ms":74,"service_tbt_ms":2,"service_ttft_ms":406,"service_ttlt_ms":458,"user_visible_ttft_ms":333},"prompt_tokens":74,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":96}`

```text
The project name is Comet, the budget is 42 fictional credits, and the presentation day is Friday.
```


summaryTrace:

```json
{
  "sourceResult": 0,
  "summary": "Project name: Comet.  \nBudget: 42 fictional credits.  \nPresentation day: Friday.",
  "originalPromptTokens": 496
}
```


- Passed / observed: No-summary request admits missing facts: UNKNOWN


- Passed / observed: Summary and recalled answer preserve decisions: Project name: Comet.  
Budget: 42 fictional credits.  
Presentation day: Friday. / The project name is Comet, the budget is 42 fictional credits, and the presentation day is Friday.


- Passed / observed: Summary-fed request uses fewer input tokens: 496 -> 74 input tokens; includes differing instructions, not a universal savings ratio.


## 17. Look up, then calculate with tools

The model requests a read-only catalog lookup, then uses its result in a validated calculation. The application controls execution.

Recorded: 2026-11-14T20:04:35.118Z

Caution: Tools are allowlisted and bounded; all prices are fictional. No purchase, shell execution, or autonomous external action is allowed.


### Catalog lookup -> multiplication -> answer


Model: gpt-4o-2024-11-20; latency: 2467 ms; finish: stop.

Usage: `{"completion_tokens":13,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":2,"engine_ttft_ms":29,"engine_ttlt_ms":61,"pre_inference_ms":72,"service_tbt_ms":2,"service_ttft_ms":416,"service_ttlt_ms":445,"user_visible_ttft_ms":344},"prompt_tokens":215,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":228}`

```text
The total for 4 robot kits is 92 fictional credits.
```


toolSteps:

```json
[
  {
    "name": "lookup_price",
    "callId": "call_d0oJZFfzQSlkdp2mXuiVigWu",
    "result": {
      "arguments": {
        "item": "robot kit"
      },
      "item": "robot kit",
      "unitPrice": 23,
      "currency": "fictional credits"
    }
  },
  {
    "name": "multiply",
    "callId": "call_gOm22B7CdUmJmpNCGwIvMxzf",
    "result": {
      "arguments": {
        "quantity": 4,
        "unitPrice": 23
      },
      "total": 92
    }
  }
]
```


extraRequests:

```json
[
  {
    "kind": "chat",
    "model": "gpt-4o-2024-11-20",
    "usage": {
      "completion_tokens": 6,
      "completion_tokens_details": {
        "accepted_prediction_tokens": 0,
        "audio_tokens": 0,
        "reasoning_tokens": 0,
        "rejected_prediction_tokens": 0
      },
      "latency_checkpoint": {
        "engine_tbt_ms": 6,
        "engine_ttft_ms": 30,
        "engine_ttlt_ms": 73,
        "pre_inference_ms": 93,
        "service_tbt_ms": 6,
        "service_ttft_ms": 846,
        "service_ttlt_ms": 885,
        "user_visible_ttft_ms": 753
      },
      "prompt_tokens": 134,
      "prompt_tokens_details": {
        "audio_tokens": 0,
        "cached_tokens": 0
      },
      "total_tokens": 140
    },
    "latencyMs": 1158
  },
  {
    "kind": "chat",
    "model": "gpt-4o-2024-11-20",
    "usage": {
      "completion_tokens": 10,
      "completion_tokens_details": {
        "accepted_prediction_tokens": 0,
        "audio_tokens": 0,
        "reasoning_tokens": 0,
        "rejected_prediction_tokens": 0
      },
      "latency_checkpoint": {
        "engine_tbt_ms": 4,
        "engine_ttft_ms": 91,
        "engine_ttlt_ms": 139,
        "pre_inference_ms": 81,
        "service_tbt_ms": 4,
        "service_ttft_ms": 478,
        "service_ttlt_ms": 514,
        "user_visible_ttft_ms": 396
      },
      "prompt_tokens": 181,
      "prompt_tokens_details": {
        "audio_tokens": 0,
        "cached_tokens": 0
      },
      "total_tokens": 191
    },
    "latencyMs": 709
  }
]
```


- Passed / observed: Lookup before calculation, using returned price: [{"name":"lookup_price","callId":"call_d0oJZFfzQSlkdp2mXuiVigWu","result":{"arguments":{"item":"robot kit"},"item":"robot kit","unitPrice":23,"currency":"fictional credits"}},{"name":"multiply","callId":"call_gOm22B7CdUmJmpNCGwIvMxzf","result":{"arguments":{"quantity":4,"unitPrice":23},"total":92}}]


- Passed / observed: Final answer uses calculated total: The total for 4 robot kits is 92 fictional credits.


## 18. Find a memory by meaning, not keywords

An embedding model maps text to vectors. Local cosine similarity selects a memory card, then a chat model answers using that card.

Recorded: 2026-11-14T20:04:36.765Z

Caution: Similarity is not truth or probability. This tiny three-card index is rebuilt each run; production retrieval needs access controls and relevance evaluation.


### No memory cards supplied


Model: gpt-4o-2024-11-20; latency: 567 ms; finish: stop.

Usage: `{"completion_tokens":1,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":4,"engine_ttft_ms":37,"engine_ttlt_ms":46,"pre_inference_ms":67,"service_tbt_ms":6,"service_ttft_ms":395,"service_ttlt_ms":401,"user_visible_ttft_ms":328},"prompt_tokens":39,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":40}`

```text
UNKNOWN
```


### Embedding retrieval supplies one card


Model: gpt-4o-2024-11-20; latency: 1076 ms; finish: stop.

Usage: `{"completion_tokens":4,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"latency_checkpoint":{"engine_tbt_ms":7,"engine_ttft_ms":31,"engine_ttlt_ms":64,"pre_inference_ms":65,"service_tbt_ms":7,"service_ttft_ms":393,"service_ttlt_ms":422,"user_visible_ttft_ms":328},"prompt_tokens":64,"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0},"total_tokens":68}`

```text
Monday [watering].
```


retrievalTrace:

```json
{
  "query": "On which weekday should we hydrate the classroom plant?",
  "ranking": [
    {
      "id": "watering",
      "text": "The classroom fern needs a drink of water every Monday.",
      "similarity": 0.6590023810598361
    },
    {
      "id": "library",
      "text": "Library books should be returned to the front desk on Friday.",
      "similarity": 0.37765157640848845
    },
    {
      "id": "robot",
      "text": "The robot club assembles wheeled machines in Room 7.",
      "similarity": 0.23264235653794874
    }
  ],
  "selectedId": "watering",
  "dimensions": 1536
}
```


extraRequests:

```json
[
  {
    "kind": "embedding",
    "model": "text-embedding-3-small",
    "usage": {
      "prompt_tokens": 47,
      "total_tokens": 47
    },
    "latencyMs": 479
  }
]
```


- Passed / observed: No retrieval means no classroom fact: UNKNOWN


- Passed / observed: Meaning retrieves watering card: [{"id":"watering","text":"The classroom fern needs a drink of water every Monday.","similarity":0.6590023810598361},{"id":"library","text":"Library books should be returned to the front desk on Friday.","similarity":0.37765157640848845},{"id":"robot","text":"The robot club assembles wheeled machines in Room 7.","similarity":0.23264235653794874}]


- Passed / observed: Answer uses retrieved fact and citation: Monday [watering].


## Retained first grounding attempt

The original prompt requested a citation but did not obtain one. The evaluator failed and stopped the runner. The prompt was refined, not the output edited.


Original output:

```text
The club meets on Tuesdays at 16:00 in Room 7. Who founded it is not in the source.
```


- FAILED: Supported fact and citation


- Passed: Missing founder is acknowledged

