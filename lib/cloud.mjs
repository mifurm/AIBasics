export async function managedToken(resource) {
  if (!process.env.IDENTITY_ENDPOINT || !process.env.IDENTITY_HEADER || !process.env.AZURE_CLIENT_ID) {
    throw new Error('Azure managed identity endpoint, header, and client ID are required.');
  }
  const url = new URL(process.env.IDENTITY_ENDPOINT);
  url.search = new URLSearchParams({ resource, 'api-version': '2019-08-01', client_id: process.env.AZURE_CLIENT_ID });
  const response = await fetch(url, {
    headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER }, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Managed identity token request failed: HTTP ${response.status}`);
  const body = await response.json();
  if (!body.access_token) throw new Error('Managed identity returned no access token.');
  return body.access_token;
}

