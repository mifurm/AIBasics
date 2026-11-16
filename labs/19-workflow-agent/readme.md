# 19 - Workflow or agent?

**8 minutes.** Prerequisites: labs 11 and 17; [Azure setup](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Predict which tools a unit price, a basket total, and a greeting need.
2. Run `npm run azure:agents -- 19-workflow-agent`.
3. Compare the enforced lookup/calculation sequence with the three model-selected traces.
4. Inspect `agentTrace.events`, actual tool messages, and request usage.

**Expected:** the workflow uses lookup then calculation; the agent uses lookup for
a price, lookup then calculation for a total of 46, and no tools for a greeting.
The application still executes and validates every request.

**Try:** replace the greeting with another question that requires no catalog facts.
Keep the workflow case unchanged for comparison.

**Infrastructure:** Azure GPT-4o and a manual Azure Container Apps Job; private
Azure Monitor logs preserve results. No agent framework or extra model is required.
`node labs/19-workflow-agent/demo.mjs` is an optional local-runner alternative
with Azure inference, not an all-Azure execution.
