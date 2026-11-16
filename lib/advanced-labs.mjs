const user = content => ({ role: 'user', content });
const system = content => ({ role: 'system', content });
const memoryInstruction = system('Use only the supplied classroom memory. Return the mascot value as one word. If absent, return exactly UNKNOWN. Do not guess.');
const planSchema = {
  type: 'json_schema', json_schema: {
    name: 'classroom_plan', strict: true,
    schema: { type: 'object', properties: {
      project: { type: 'string' }, color: { type: 'string' }, material: { type: 'string' },
    }, required: ['project', 'color', 'material'], additionalProperties: false },
  },
};
export const meetingNotes = [
  'Decision: our robot project is named Comet. Its budget is 42 fictional credits. The final presentation is Friday.',
  ...Array.from({ length: 12 }, (_, index) =>
    `Discussion ${index + 1}: the class explored wheels, decorations, display stands, and reusable boxes. These were brainstorming suggestions, not changes to the project name, budget, or presentation day.`),
].join('\n');
export const memoryCards = [
  { id: 'watering', text: 'The classroom fern needs a drink of water every Monday.' },
  { id: 'robot', text: 'The robot club assembles wheeled machines in Room 7.' },
  { id: 'library', text: 'Library books should be returned to the front desk on Friday.' },
];
export const advancedLabs = [
  {
    id: '13-persistent-memory', title: 'Memory survives a new process', minutes: 6,
    concept: 'An application can save a fact to disk and explicitly load it into a fresh chat. The model weights do not change.',
    question: 'What remembers the mascot: the file, the model, or the current request?',
    caveat: 'This is a local fictional classroom store, not Copilot Memory or automatic Azure chat memory. Save only approved, relevant facts.',
    exercise: 'Inspect results/memory/13-persistent-memory.json, change the scripted mascot, and rerun.',
    cases: [
      { label: 'Saved file, but not sent to model', memoryAction: 'write', messages: [memoryInstruction, user('What is the classroom mascot?')] },
      { label: 'New process reads file into fresh chat', memoryAction: 'read', messages: [memoryInstruction, user('What is the classroom mascot?')] },
    ],
  },
  {
    id: '14-memory-lifecycle', title: 'Update and forget a saved fact', minutes: 6,
    concept: 'Persistent memory needs explicit write, replacement, and deletion rules. Old values should not be sent again.',
    question: 'After forgetting, does a fresh request still know the mascot?',
    caveat: 'Deleting this demo store does not erase old recordings, results, provider logs, or backups. Public evidence contains fictional facts.',
    exercise: 'Inspect the empty store after the run. Explain why fresh history is essential to the forgetting test.',
    cases: [
      { label: 'Remember: Otter', memoryAction: 'write', messages: [memoryInstruction, user('What is the classroom mascot?')] },
      { label: 'Replace: Falcon', memoryAction: 'replace', messages: [memoryInstruction, user('What is the classroom mascot?')] },
      { label: 'Forget: no value supplied', memoryAction: 'forget', messages: [memoryInstruction, user('What is the classroom mascot?')] },
    ],
  },
  {
    id: '15-multiturn', title: 'Build and revise a plan across turns', minutes: 7,
    concept: 'Each follow-up request includes actual earlier model replies, so references such as "it" have context.',
    question: 'Can the model change only the color while keeping the earlier project and material?',
    caveat: 'History is explicitly resent and billed again. This is real generated dialogue, not handwritten assistant turns.',
    exercise: 'Change the second turn to a different color; inspect the full third request.',
    cases: [
      { label: 'Turn 1: create the plan', conversation: true, messages: [system('Maintain the current classroom plan. Project is the object we build, color is its color, material is its construction material. Return only the plan JSON.'), user('Plan a blue robot made of cardboard.')], parameters: { response_format: planSchema } },
      { label: 'Turn 2: revise it', conversation: true, messages: [user('Change it to red. Keep everything else the same.')], parameters: { response_format: planSchema } },
      { label: 'Turn 3: recall the revised plan', conversation: true, messages: [user('What is our current plan? Keep the agreed material and latest color.')], parameters: { response_format: planSchema } },
    ],
  },
  {
    id: '16-summary-memory', title: 'Compress context into a useful summary', minutes: 7,
    concept: 'An application can replace a long transcript with a shorter summary, trading token use against the risk of losing facts.',
    question: 'Which facts survive the summary? How much smaller is the new request?',
    caveat: 'Summaries are lossy and can introduce mistakes. Check the preserved decisions; never assume every omitted detail is irrelevant.',
    exercise: 'Add a new important decision to the notes and see whether it survives compression.',
    cases: [
      { label: 'Summarize the long notes', messages: [system('Summarize only the final decisions: project name, budget in credits, and presentation day. Maximum 40 words. Do not include brainstorming.'), user(meetingNotes)] },
      { label: 'Fresh chat without the summary', messages: [system('Use only supplied facts. If the project name, budget, or day is missing, return exactly UNKNOWN.'), user('What are the project name, budget, and presentation day?')] },
      { label: 'Fresh chat with generated summary', summary: true, messages: [system('Use only the supplied summary. Give the project name, budget, and presentation day in one short sentence.'), user('What are the project name, budget, and presentation day?')] },
    ],
  },
  {
    id: '17-tool-chain', title: 'Look up, then calculate with tools', minutes: 8,
    concept: 'The model requests a read-only catalog lookup, then uses its result in a validated calculation. The application controls execution.',
    question: 'Why must the second tool wait for the first result?',
    caveat: 'Tools are allowlisted and bounded; all prices are fictional. No purchase, shell execution, or autonomous external action is allowed.',
    exercise: 'Change the kit quantity and inspect the two actual tool requests and their results.',
    cases: [{
      label: 'Catalog lookup -> multiplication -> answer', toolChain: true,
      messages: [system('First look up the robot kit unit price in the catalog, then multiply the returned price by the requested quantity. Never guess prices. Give one final sentence.'), user('What is the total for 4 robot kits in fictional credits?')],
    }],
  },
  {
    id: '18-semantic-memory', title: 'Find a memory by meaning, not keywords', minutes: 8,
    concept: 'An embedding model maps text to vectors. Local cosine similarity selects a memory card, then a chat model answers using that card.',
    question: 'How did a question about hydrating a plant find a card about a fern needing a drink?',
    caveat: 'Similarity is not truth or probability. This tiny three-card index is rebuilt each run; production retrieval needs access controls and relevance evaluation.',
    exercise: 'Add a fourth fictional card, change the question, and inspect the ranking rather than assuming the top hit is correct.',
    cases: [
      { label: 'No memory cards supplied', messages: [system('Answer only from supplied classroom facts. If no fact answers the question, return exactly UNKNOWN.'), user('On which weekday should we hydrate the classroom plant?')] },
      { label: 'Embedding retrieval supplies one card', retrieval: true, messages: [system('Answer only from the retrieved classroom card. Give the weekday and cite the card ID in square brackets.'), user('On which weekday should we hydrate the classroom plant?')] },
    ],
  },
];
