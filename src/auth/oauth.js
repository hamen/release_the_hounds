/**
 * OAuth2 authentication module
 * Handles Google OAuth2 flow, token storage, and refresh
 */

import { google } from 'googleapis';
import express from 'express';
import { createServer } from 'http';
import open from 'open';
import { writeJsonFile, readJsonFile, ensureDir } from '../utils/fs.js';
import { OAUTH_CONFIG, PATHS, OAUTH_TIMEOUT } from '../config.js';

/**
 * OAuth2 client instance
 */
let oauth2Client = null;

/**
 * Initialize OAuth2 client
 * If client credentials are not provided, uses Google's default OAuth2 client
 * (which requires user to authenticate via browser)
 */
function getOAuth2Client() {
  if (oauth2Client) {
    return oauth2Client;
  }

  oauth2Client = new google.auth.OAuth2(
    OAUTH_CONFIG.CLIENT_ID || undefined,
    OAUTH_CONFIG.CLIENT_SECRET || undefined,
    OAUTH_CONFIG.REDIRECT_URI
  );

  return oauth2Client;
}

/**
 * Load stored refresh token
 */
export async function loadRefreshToken() {
  const tokenData = await readJsonFile(PATHS.REFRESH_TOKEN_FILE);
  if (!tokenData || !tokenData.refresh_token) {
    return null;
  }
  return tokenData;
}

/**
 * Save refresh token and metadata
 */
async function saveRefreshToken(tokenData) {
  await ensureDir(PATHS.AUTOPUBLISH_DIR);
  
  const dataToSave = {
    refresh_token: tokenData.refresh_token,
    access_token: tokenData.access_token,
    expiry_date: tokenData.expiry_date,
    token_type: tokenData.token_type || 'Bearer',
    scope: tokenData.scope,
    saved_at: new Date().toISOString()
  };

  await writeJsonFile(PATHS.REFRESH_TOKEN_FILE, dataToSave);
  return dataToSave;
}

/**
 * Start OAuth2 flow - opens browser and waits for callback
 */
export async function startOAuthFlow() {
  return new Promise((resolve, reject) => {
    const oauth2 = getOAuth2Client();
    
    // Check if client credentials are configured
    if (!OAUTH_CONFIG.CLIENT_ID || !OAUTH_CONFIG.CLIENT_SECRET) {
      console.error('\n❌ OAuth2 client credentials not configured.');
      console.error('\n🚀 Run the interactive setup:');
      console.error('   ./release-the-hounds.sh setup');
      console.error('\nThis will guide you through creating OAuth2 credentials automatically.\n');
      reject(new Error('OAuth2 client credentials not configured'));
      return;
    }
    
    // Generate authorization URL
    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline', // Required to get refresh token
      scope: OAUTH_CONFIG.SCOPES,
      prompt: 'consent' // Force consent screen to ensure refresh token
    });

    console.log('\n🔐 Starting OAuth2 authentication...');
    console.log('Opening browser for Google sign-in...\n');

    // Create Express server for OAuth callback
    const app = express();
    const server = createServer(app);

    let resolved = false;

    // Handle OAuth callback
    app.get('/oauth2callback', async (req, res) => {
      if (resolved) {
        res.send('<html><body><h1>Already processed</h1><p>You can close this window.</p></body></html>');
        return;
      }

      const { code, error } = req.query;

      if (error) {
        resolved = true;
        server.close();
        res.send(`
          <html>
            <body>
              <h1>❌ Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.send(`
          <html>
            <body>
              <h1>⚠️ No authorization code received</h1>
              <p>Please try again.</p>
            </body>
          </html>
        `);
        return;
      }

      try {
        // Exchange code for tokens
        const { tokens } = await oauth2.getToken(code);
        
        // Save refresh token
        await saveRefreshToken(tokens);
        
        resolved = true;
        server.close();
        
        res.send(`
          <html>
            <body>
              <h1>✅ Authentication Successful!</h1>
              <p>Your credentials have been saved.</p>
              <p>You can close this window and return to the terminal.</p>
            </body>
          </html>
        `);

        console.log('\n✅ Authentication successful!');
        console.log('Refresh token saved to:', PATHS.REFRESH_TOKEN_FILE);
        console.log('Scopes granted:', tokens.scope || OAUTH_CONFIG.SCOPES.join(', '));
        console.log('');

        resolve(tokens);
      } catch (err) {
        resolved = true;
        server.close();
        res.send(`
          <html>
            <body>
              <h1>❌ Token Exchange Failed</h1>
              <p>Error: ${err.message}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(err);
      }
    });

    // Start server
    server.listen(OAUTH_CONFIG.CALLBACK_PORT, async () => {
      try {
        // Open browser
        await open(authUrl);
      } catch (err) {
        console.error('Failed to open browser automatically.');
        console.log('Please open this URL in your browser:');
        console.log(authUrl);
        console.log('');
      }

      // Set timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.close();
          reject(new Error('OAuth flow timed out. Please try again.'));
        }
      }, OAUTH_TIMEOUT.FLOW_TIMEOUT_MS);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start callback server: ${err.message}`));
      }
    });
  });
}

/**
 * Get authenticated OAuth2 client
 * Loads refresh token if available, otherwise starts OAuth flow
 */
export async function getAuthenticatedClient() {
  const oauth2 = getOAuth2Client();
  
  // Try to load existing refresh token
  const tokenData = await loadRefreshToken();
  
  if (tokenData && tokenData.refresh_token) {
    oauth2.setCredentials({
      refresh_token: tokenData.refresh_token
    });
    
    // Check if access token is expired or about to expire
    const now = Date.now();
    const expiryDate = tokenData.expiry_date;
    
    if (!expiryDate || now >= (expiryDate - OAUTH_TIMEOUT.REFRESH_BUFFER_MS)) {
      // Refresh access token
      try {
        const { credentials } = await oauth2.refreshAccessToken();
        await saveRefreshToken(credentials);
        oauth2.setCredentials(credentials);
        return oauth2;
      } catch (err) {
        console.warn('Failed to refresh access token. Starting new OAuth flow...');
        // Fall through to start new OAuth flow
      }
    } else {
      // Use existing access token
      oauth2.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date
      });
      return oauth2;
    }
  }

  // No valid token, start OAuth flow
  console.log('No valid authentication found. Starting OAuth flow...\n');
  await startOAuthFlow();
  
  // Retry after OAuth flow completes
  return getAuthenticatedClient();
}

/**
 * Check authentication status
 */
export async function checkAuthStatus() {
  const tokenData = await loadRefreshToken();
  
  if (!tokenData || !tokenData.refresh_token) {
    return {
      authenticated: false,
      message: 'Not authenticated. Run "./release-the-hounds.sh auth" to authenticate.'
    };
  }

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    refresh_token: tokenData.refresh_token
  });

  // Try to refresh to verify token is still valid
  try {
    await oauth2.refreshAccessToken();
    return {
      authenticated: true,
      scopes: tokenData.scope || OAUTH_CONFIG.SCOPES,
      saved_at: tokenData.saved_at
    };
  } catch (err) {
    return {
      authenticated: false,
      message: 'Refresh token is invalid or expired. Please re-authenticate.',
      error: err.message
    };
  }
}

