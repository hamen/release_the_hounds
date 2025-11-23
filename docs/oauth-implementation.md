# OAuth2 Authentication Implementation

## Overview

The OAuth2 authentication module enables users to authenticate with Google using only their Gmail account credentials. This is the first step in the automation pipeline.

## Implementation Details

### Files Created

- `src/auth/oauth.js` - Main OAuth2 authentication module
- `src/config.js` - Configuration constants
- `src/utils/fs.js` - File system utilities
- `src/cli.js` - CLI entry point with `auth` and `status` commands

### Key Features

1. **OAuth2 Flow**
   - Launches temporary Express.js server on `http://localhost:3000/oauth2callback`
   - Opens browser for Google consent screen
   - Captures authorization code from callback
   - Exchanges code for access and refresh tokens

2. **Token Storage**
   - Refresh tokens stored in `.autopublish/refresh-token.json`
   - Includes metadata: scopes, expiry date, saved timestamp
   - Directory created automatically if it doesn't exist

3. **Token Refresh**
   - Automatically refreshes access tokens when expired
   - Uses refresh token to get new access tokens
   - Refreshes 5 minutes before expiry to prevent failures

4. **Error Handling**
   - Handles user cancellations and timeouts
   - Provides clear error messages
   - Validates OAuth2 client credentials before starting flow

### OAuth2 Scopes

The following scopes are requested:
- `https://www.googleapis.com/auth/cloud-platform` - Full access to Google Cloud Platform
- `https://www.googleapis.com/auth/androidpublisher` - Access to Google Play Developer API
- `https://www.googleapis.com/auth/firebase` - Access to Firebase services

### Usage

#### Authenticate
```bash
npm start auth
```

This will:
1. Check if already authenticated (unless `--force` is used)
2. Open browser for Google sign-in
3. Request required permissions
4. Save refresh token locally

#### Check Status
```bash
npm start status
```

Shows:
- Authentication status
- Granted scopes
- Token save timestamp

### Configuration

OAuth2 client credentials must be set via environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
```

Or create a `.env` file:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Getting OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Desktop app" as application type
6. Copy the Client ID and Client Secret

**Note**: You can create OAuth2 credentials even without an existing project - Google allows creating credentials in a new project.

### Token Storage Format

```json
{
  "refresh_token": "1//...",
  "access_token": "ya29...",
  "expiry_date": 1234567890,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/cloud-platform ...",
  "saved_at": "2025-01-XX..."
}
```

### Security Considerations

- Refresh tokens are stored in `.autopublish/` directory (gitignored)
- Never commit tokens to version control
- Future: Add encryption at rest for stored tokens
- Tokens are only stored locally on user's machine

### Next Steps

After successful authentication, the refresh token can be used to:
1. Create Google Cloud projects
2. Enable APIs
3. Create service accounts
4. Interact with Firebase and Play Store APIs

The authenticated OAuth2 client is obtained via `getAuthenticatedClient()` which handles token refresh automatically.

