param location string = resourceGroup().location
param publisherPrincipalId string
param aiResourceGroup string
param aiAccountName string
param aiEndpoint string
param standardDeployment string = 'gpt-4o'
param reasoningDeployment string = 'gpt-5-mini'
param embeddingDeployment string = 'text-embedding-3-small'
param sourceSha256 string
@description('Compressed source code only. Never include credentials or local configuration.')
param sourceArchive string
param suffix string = uniqueString(resourceGroup().id)

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'aibasics-agent-${suffix}'
  location: location
  tags: { project: 'ai-basics-classroom' }
}
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'aibasics-agents-${suffix}'
  location: location
  tags: { project: 'ai-basics-classroom' }
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: json('0.1') }
  }
}
resource logReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(logs.id, publisherPrincipalId, 'read-results')
  scope: logs
  properties: {
    principalId: publisherPrincipalId
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '73c42c96-874c-492b-b04d-ab87d138a893'
    )
  }
}
resource resultTable 'Microsoft.OperationalInsights/workspaces/tables@2023-09-01' = {
  parent: logs
  name: 'AIBasicsResults_CL'
  properties: {
    schema: {
      name: 'AIBasicsResults_CL'
      columns: [
        { name: 'TimeGenerated', type: 'dateTime' }
        { name: 'RunId', type: 'string' }
        { name: 'Log', type: 'string' }
      ]
    }
    retentionInDays: 30
    plan: 'Analytics'
  }
}
resource ingestion 'Microsoft.Insights/dataCollectionRules@2024-03-11' = {
  name: 'aibasics-results-${suffix}'
  location: location
  kind: 'Direct'
  tags: { project: 'ai-basics-classroom' }
  properties: {
    streamDeclarations: {
      'Custom-AIBasicsResults': {
        columns: [
          { name: 'TimeGenerated', type: 'datetime' }
          { name: 'RunId', type: 'string' }
          { name: 'Log', type: 'string' }
        ]
      }
    }
    destinations: {
      logAnalytics: [
        { name: 'results', workspaceResourceId: logs.id }
      ]
    }
    dataFlows: [
      {
        streams: ['Custom-AIBasicsResults']
        destinations: ['results']
        transformKql: 'source'
        outputStream: 'Custom-AIBasicsResults_CL'
      }
    ]
  }
  dependsOn: [resultTable]
}
resource ingestionAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(ingestion.id, identity.id, 'publish-results')
  scope: ingestion
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '3913510d-42f4-4e42-8a64-420c390055eb'
    )
  }
}
module inferenceAccess 'agent-ai-access.bicep' = {
  name: 'agent-inference-access'
  scope: resourceGroup(aiResourceGroup)
  params: {
    accountName: aiAccountName
    principalId: identity.properties.principalId
  }
}
resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: 'aibasics-agents-${suffix}'
  location: location
  tags: { project: 'ai-basics-classroom' }
  properties: {
    workloadProfiles: [
      { name: 'Consumption', workloadProfileType: 'Consumption' }
    ]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}
resource job 'Microsoft.App/jobs@2025-01-01' = {
  name: 'aibasics-agents-${suffix}'
  location: location
  tags: { project: 'ai-basics-classroom' }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 3600
      replicaRetryLimit: 0
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
    }
    template: {
      containers: [
        {
          name: 'labs'
          image: 'docker.io/library/node:22-bookworm-slim'
          command: ['node', '--input-type=module', '-e', loadTextContent('../scripts/azure-bootstrap.mjs')]
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
            { name: 'SOURCE_ARCHIVE', value: sourceArchive }
            { name: 'SOURCE_SHA256', value: sourceSha256 }
            { name: 'LAB_SELECTION', value: 'agents' }
            { name: 'INGESTION_ENDPOINT', value: ingestion.properties.endpoints.logsIngestion }
            { name: 'INGESTION_RULE_ID', value: ingestion.properties.immutableId }
            {
              name: 'AIBASICS_CONFIG'
              value: string({
                endpoint: aiEndpoint
                standardDeployment: standardDeployment
                reasoningDeployment: reasoningDeployment
                embeddingDeployment: embeddingDeployment
              })
            }
          ]
        }
      ]
    }
  }
}
output jobId string = job.id
output jobName string = job.name
output workspaceId string = logs.properties.customerId
output workspaceName string = logs.name
output identityId string = identity.id
