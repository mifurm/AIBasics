@description('Optional NEW shared classroom AI resource; existing AI resources are never changed.')
param accountName string = 'aibasics-ai-${uniqueString(resourceGroup().id)}'
param location string = resourceGroup().location
param studentPrincipalId string
@minValue(1)
param capacity int = 1
@description('Also deploy the image, speech, transcription and diarization models used by labs 32, 34 and 35.')
param includeMediaModels bool = true

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: accountName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  tags: {
    project: 'ai-basics-classroom'
  }
  properties: {
    customSubDomainName: accountName
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource standard 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: account
  name: 'gpt-4o'
  sku: {
    name: 'GlobalStandard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-11-20'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
}

resource reasoning 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: account
  name: 'gpt-5-mini'
  sku: {
    name: 'GlobalStandard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-5-mini'
      version: '2025-08-07'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
}

resource embeddings 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: account
  name: 'text-embedding-3-small'
  sku: {
    name: 'Standard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-small'
      version: '1'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
}

// Model deployments on one account are chained because parallel changes can conflict.
resource image 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (includeMediaModels) {
  parent: account
  name: 'gpt-image-1.5'
  sku: {
    name: 'GlobalStandard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-image-1.5'
      version: '2025-12-16'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [embeddings]
}

resource speech 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (includeMediaModels) {
  parent: account
  name: 'tts'
  sku: {
    name: 'Standard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'tts'
      version: '001'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [image]
}

resource transcription 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (includeMediaModels) {
  parent: account
  name: 'whisper'
  sku: {
    name: 'Standard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'whisper'
      version: '001'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [speech]
}

resource diarization 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (includeMediaModels) {
  parent: account
  name: 'gpt-4o-transcribe-diarize'
  sku: {
    name: 'GlobalStandard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-transcribe-diarize'
      version: '2025-10-15'
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [transcription]
}

resource student 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, studentPrincipalId, 'openai-user')
  scope: account
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
    principalId: studentPrincipalId
    principalType: 'User'
  }
}

output accountName string = account.name
output endpoint string = account.properties.endpoint
