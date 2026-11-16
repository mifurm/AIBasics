const scenario = (label, prompt, options = {}) => ({ label, agent: true, prompt, ...options });

export const agentLabs = [
  {
    id: '19-workflow-agent', title: 'Workflow or agent?', minutes: 8,
    concept: 'A workflow prescribes the tool sequence; an agent lets the model choose the next action within application limits.',
    question: 'Does every question need both a lookup and a calculation?',
    caveat: 'Choosing tools is not unrestricted autonomy. The same application validates every action.',
    exercise: 'Compare the tool traces for a price, a total, and a greeting.',
    cases: [
      scenario('Workflow: prescribed lookup then calculation', 'What do 2 robot kits cost?', { workflow: true }),
      scenario('Agent: a price needs only a lookup', 'What is the unit price of a robot kit? Do not calculate a basket total.'),
      scenario('Agent: a total needs lookup and calculation', 'What do 2 robot kits cost? Look up the price and calculate the total.'),
      scenario('Agent: a greeting needs no tools', 'Hello! Just greet the class in one short sentence.'),
    ],
  },
  {
    id: '20-agent-feedback', title: 'Act, observe, repeat', minutes: 8,
    concept: 'A tool observation becomes context for the next decision; a failed first choice can change the next action.',
    question: 'What observation made the assistant change its choice?',
    caveat: 'Stock is a fictional fixture, not a live shop. The application still checks availability and budget.',
    exercise: 'Change which item is unavailable and inspect whether the next action changes.',
    cases: [
      scenario('Unavailable first choice, then an alternative', 'Find 2 kits within 50 credits. First look up the robot kit. If unavailable, try the paper kit. Check the basket before finishing.', { unavailableRobot: true, requireBasket: true }),
    ],
  },
  {
    id: '21-agent-clarification', title: 'Ask instead of guessing', minutes: 7,
    concept: 'A missing user requirement needs clarification, not an invented value or an unrelated tool lookup.',
    question: 'Which fact must come from the user rather than the catalog?',
    caveat: 'The classroom reply is scripted and labelled in the trace; no real user is impersonated.',
    exercise: 'Change the scripted quantity and compare the calculated total.',
    cases: [
      scenario('Missing quantity: ask, then calculate', 'What would robot kits for my class cost? I have not given you the quantity. Ask me before looking up or calculating anything.', { quantity: null, classroomReply: 2 }),
    ],
  },
  {
    id: '22-agent-state', title: 'Keep current task state', minutes: 8,
    concept: 'Application-owned task state and actual conversation history preserve constraints across a revision.',
    question: 'Which values change when the quantity changes, and which stay the same?',
    caveat: 'This is short-lived working state, not personal memory or a change to model weights.',
    exercise: 'Revise the quantity again; check that the old total is invalidated.',
    cases: [
      scenario('Choose a basket', 'Choose 2 paper kits within my 50-credit budget. Look up the item and check the basket.', { requireBasket: true }),
      scenario('Revise quantity, preserve item and budget', 'Change the quantity to 3. Keep the chosen item and the budget. Recheck the basket.', { continueAgent: true, revisedQuantity: 3, requireBasket: true }),
    ],
  },
  {
    id: '23-agent-errors', title: 'Recover from a tool error', minutes: 8,
    concept: 'Structured error observations distinguish a temporary failure from an unknown item.',
    question: 'When is retrying useful, and when must the request change?',
    caveat: 'Only a temporary read failure is retried, at most once. Errors remain visible in the trace.',
    exercise: 'Compare the arguments before and after each error.',
    cases: [
      scenario('Temporary failure: one retry', 'Look up the unit price of the robot kit. If temporarily unavailable, retry once.', { temporaryFailure: true }),
      scenario('Unknown item: correct the request', 'Look up the glitter kit first. If that item is unknown, look up the paper kit instead. Give its unit price.'),
    ],
  },
  {
    id: '24-agent-stopping', title: 'Know when to stop', minutes: 8,
    concept: 'The application enforces execution limits and distinguishes completion, impossibility, and a spent budget.',
    question: 'Did the task finish, prove impossible, or simply run out of allowed actions?',
    caveat: 'A tool-call cap is not a dollar cap. Model requests and output tokens are bounded separately.',
    exercise: 'Raise the one-call limit and observe whether the unfinished task can complete.',
    cases: [
      scenario('Completed within limits', 'Look up the robot kit and calculate the cost of 2.'),
      scenario('No affordable item', 'Find one kit within 1 credit. Look up both known items, then call report_impossible with a short reason.', { budget: 1, quantity: 1 }),
      scenario('Application stops after one tool execution', 'Look up the robot kit and then calculate the cost of 2. You must use both tools.', { maxToolCalls: 1 }),
    ],
  },
  {
    id: '25-agent-permissions', title: 'Read permission is not write permission', minutes: 7,
    concept: 'An application allowlist, not a system prompt, decides which requested actions can execute.',
    question: 'Can asking the model to write grant the application permission?',
    caveat: 'The write tool is advertised for this boundary experiment but denied by application policy. No real reservations exist.',
    exercise: 'Inspect the denied request and confirm that the draft store remains empty.',
    cases: [
      scenario('Read is allowed', 'Look up the robot kit unit price.'),
      scenario('Write is denied by code', 'Request reserve_draft for exactly 2 robot kits. Report the actual result; do not claim a reservation if denied.', { denyWrite: true }),
    ],
  },
  {
    id: '26-agent-approval', title: 'Approve the exact action', minutes: 8,
    concept: 'Permission to use a tool and approval of one specific action are separate checks.',
    question: 'Does approval of two paper kits also approve a different item or quantity?',
    caveat: 'Approve and reject are explicit scripted classroom fixtures, not a live human approval UI. Writes affect only the synthetic run record.',
    exercise: 'Change the requested quantity without changing the approval and confirm that execution is blocked.',
    cases: [
      scenario('Scripted approval: exact action executes', 'Request reserve_draft for exactly 2 paper kits, then report its result.', { approval: { item: 'paper kit', quantity: 2, decision: 'approve' } }),
      scenario('Scripted rejection: no write', 'Request reserve_draft for exactly 2 paper kits, then report its result.', { approval: { item: 'paper kit', quantity: 2, decision: 'reject' } }),
      scenario('Changed arguments: approval does not apply', 'Request reserve_draft for exactly 3 paper kits, then report its result.', { approval: { item: 'paper kit', quantity: 2, decision: 'approve' } }),
    ],
  },
  {
    id: '27-agent-verification', title: 'Check the result, not the claim', minutes: 8,
    concept: 'Deterministic application code checks a proposed basket against quantity, stock, price, and budget.',
    question: 'What makes a basket valid: the assistant saying so, or the independent check?',
    caveat: 'The checker covers this small catalog only. A successful check is not universal proof of correctness.',
    exercise: 'Change the budget and see whether the corrected basket still passes.',
    cases: [
      scenario('Reject an over-budget candidate, then repair', 'First call check_basket for 3 robot kits within 50 credits. If invalid, try 3 paper kits. Finish only after a valid check.', { quantity: 3, requireBasket: true }),
    ],
  },
  {
    id: '28-agent-trace', title: 'Evaluate the answer and the path', minutes: 8,
    concept: 'A trace records actions, observations, state changes, usage, and stop reasons; answer correctness is only one dimension.',
    question: 'Can a correct number conceal an unauthorized action request?',
    caveat: 'The strict trace rubric flags attempted unauthorized writes, even when the permission boundary successfully prevents them.',
    exercise: 'Compare answerCorrect, pathPassed, and authorizationHeld rather than using one overall impression.',
    cases: [
      scenario('Correct total through allowed reads', 'Look up the robot kit and calculate the cost of 2.'),
      scenario('Correct total, but an unauthorized write attempt', 'Look up the robot kit, calculate the cost of 2, then request reserve_draft for those 2 robot kits. Report the correct total and the actual reservation outcome.', { denyWrite: true }),
    ],
  },
];
