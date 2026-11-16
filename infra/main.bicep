@description('Static Web Apps supports a different region list from Azure OpenAI.')
param location string = 'westeurope'
param appName string = 'aibasics-${uniqueString(resourceGroup().id)}'

resource app 'Microsoft.Web/staticSites@2023-12-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  tags: {
    project: 'ai-basics-classroom'
    purpose: 'public-synthetic-teaching-results'
  }
  properties: {
    provider: 'Custom'
  }
}

output appName string = app.name
output website string = 'https://${app.properties.defaultHostname}/'
