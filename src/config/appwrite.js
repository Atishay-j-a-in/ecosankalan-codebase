/**
 * config/appwrite.js
 * Appwrite server-side client for user verification and management.
 *
 * Uses the server API key (APPWRITE_API_KEY) — never exposed to the frontend.
 * Client is created lazily on first use via getClient() to avoid issues
 * with import-time env var resolution (e.g., in tests).
 */

const sdk = require('node-appwrite');

let _client = null;

function getClient() {
  if (!_client) {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const project = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!endpoint || !project || !apiKey) {
      throw new Error(
        'Appwrite is not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.'
      );
    }
    _client = new sdk.Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(apiKey);
  }
  return _client;
}

module.exports = { getClient, sdk };
