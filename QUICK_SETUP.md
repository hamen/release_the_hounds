# Quick OAuth2 Setup Guide

To test the authentication flow, you need OAuth2 credentials from Google Cloud Console.

## Fast Setup (5 minutes)

### Step 1: Create OAuth2 Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project** (or select existing):
   - Click "Select a project" → "New Project"
   - Name: `auto-publisher-test` (or any name)
   - Click "Create"

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you have Google Workspace)
   - Fill in:
     - App name: `Auto Publisher`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip "Scopes" (we'll add them automatically)
   - Add yourself as a test user (if in testing mode)
   - Click "Save and Continue"

4. **Create OAuth2 Client ID**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **"Desktop app"**
   - Name: `Auto Publisher CLI`
   - Click "Create"

5. **Copy Credentials**:
   - You'll see a popup with:
     - **Client ID**: `xxxxx.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-xxxxx`
   - Copy both values

### Step 2: Set Credentials

Create a `.env` file in the project root:

```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
```

Or set environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id-here"
export GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

### Step 3: Test Authentication

```bash
npm start auth
```

This will:
1. Open your browser
2. Show Google sign-in
3. Request permissions
4. Save your refresh token

## Direct Links

- **Create Project**: https://console.cloud.google.com/projectcreate
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **Create Credentials**: https://console.cloud.google.com/apis/credentials

## Troubleshooting

**"OAuth2 client credentials not configured"**
- Make sure `.env` file exists with correct values
- Or set environment variables

**"Redirect URI mismatch"**
- Make sure you selected "Desktop app" as application type
- The redirect URI `http://localhost:3000/oauth2callback` is automatically configured

**"Access blocked"**
- Add your email as a test user in OAuth consent screen
- Or verify your app (if in production mode)

