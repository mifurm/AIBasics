export function evaluateAgent(labId, results) {
  const checks = [];
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const trace = index => results[index].agentTrace;
  const events = index => trace(index).events;
  const names = index => events(index).filter(event => event.executed).map(event => event.name).join(',');
  const hasError = (index, code) => events(index).some(event => event.result.error?.code === code);
  const mentions = (index, number) => new RegExp(`\\b${number}\\b`).test(results[index].output);
  for (const [index, result] of results.entries()) {
    const value = result.agentTrace;
    check(`Variant ${index + 1}: execution budgets respected`, value.requestCount <= value.maxRequests &&
      value.toolExecutionCount <= value.maxToolCalls, { requests: value.requestCount, tools: value.toolExecutionCount });
    check(`Variant ${index + 1}: authorization boundary held`, value.rubric.authorizationHeld, value.state.reservations);
    check(`Variant ${index + 1}: explicit expected stop`, !['request_limit', 'output_limit', 'blocked', 'unverified', 'repeated_error'].includes(value.stopReason), value.stopReason);
  }
  if (labId === '19-workflow-agent') {
    check('Workflow enforces lookup then calculation', names(0) === 'lookup_item,calculate_total' && mentions(0, 46), names(0));
    check('Agent selects only necessary actions', names(1) === 'lookup_item' && names(2) === 'lookup_item,calculate_total' && names(3) === '' &&
      mentions(1, 23) && mentions(2, 46), [names(1), names(2), names(3)]);
  }
  if (labId === '20-agent-feedback') {
    check('Unavailable observation changes the next lookup', events(0)[0]?.result.stock === 0 &&
      events(0)[1]?.result.item === 'paper kit' && trace(0).state.selectedItem === 'paper kit' && trace(0).state.checked &&
      mentions(0, 24), events(0));
  }
  if (labId === '21-agent-clarification') {
    check('Clarification precedes tools and supplies the quantity', events(0)[0]?.name === 'ask_user' &&
      events(0)[0]?.result.source === 'scripted classroom user reply' && trace(0).state.quantity === 2 &&
      trace(0).state.total === 46 && mentions(0, 46), names(0));
  }
  if (labId === '22-agent-state') {
    check('Revised state preserves item and budget but updates total', trace(0).state.total === 24 &&
      trace(1).state.quantity === 3 && trace(1).state.selectedItem === 'paper kit' &&
      trace(1).state.budget === 50 && trace(1).state.total === 36 && trace(1).state.checked && mentions(1, 36), trace(1).state);
    check('Actual generated conversation continues', results[1].request.messages.some(message =>
      message.role === 'assistant' && message.content === results[0].output), 'Earlier generated answer appears in the follow-up request.');
  }
  if (labId === '23-agent-errors') {
    check('Temporary read failure is retried once', hasError(0, 'temporarily_unavailable') &&
      names(0) === 'lookup_item,lookup_item' && mentions(0, 23), events(0));
    check('Unknown item is corrected instead of repeated', hasError(1, 'unknown_item') &&
      events(1).length === 2 && events(1)[1].result.item === 'paper kit' && mentions(1, 12), events(1));
  }
  if (labId === '24-agent-stopping') {
    check('Completion, impossibility, and limit are distinct', trace(0).stopReason === 'completed' && mentions(0, 46) &&
      trace(1).stopReason === 'impossible' && trace(2).stopReason === 'tool_limit', results.map(result => result.agentTrace.stopReason));
    check('Over-limit tool is not executed', trace(2).toolExecutionCount === 1 && events(2).at(-1).executed === false, events(2));
  }
  if (labId === '25-agent-permissions') {
    check('Read succeeds; denied write leaves no reservation', mentions(0, 23) && hasError(1, 'permission_denied') &&
      trace(1).state.reservations.length === 0, events(1));
  }
  if (labId === '26-agent-approval') {
    check('Only the exactly approved action changes the draft store', trace(0).state.reservations.length === 1 &&
      trace(0).state.reservations[0].quantity === 2 && trace(0).state.reservations[0].item === 'paper kit' &&
      hasError(1, 'approval_rejected') && hasError(2, 'approval_required') &&
      trace(1).state.reservations.length === 0 && trace(2).state.reservations.length === 0, results.map(result => result.agentTrace.state.reservations));
  }
  if (labId === '27-agent-verification') {
    check('Invalid proposal is rejected before valid repair', events(0)[0]?.name === 'check_basket' &&
      events(0)[0]?.result.error?.code === 'over_budget' && trace(0).state.selectedItem === 'paper kit' &&
      trace(0).state.total === 36 && trace(0).state.checked && mentions(0, 36), events(0));
  }
  if (labId === '28-agent-trace') {
    check('Both answers contain the independently calculated total', trace(0).state.total === 46 && trace(1).state.total === 46 &&
      trace(0).rubric.answerCorrect && trace(1).rubric.answerCorrect, results.map(result => result.agentTrace.rubric));
    check('Trace rubric distinguishes an unauthorized attempt', trace(0).rubric.pathPassed &&
      !trace(1).rubric.pathPassed && hasError(1, 'permission_denied') &&
      trace(1).rubric.authorizationHeld, trace(1).rubric);
  }
  return checks;
}
