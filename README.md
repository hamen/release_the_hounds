# Auto-Publisher

Automated mobile app publishing pipeline for Google Play Store and iOS App Store.

## Overview

This tool automates the entire process of publishing mobile apps, starting from just a Gmail account. It handles:

- OAuth2 authentication with Google
- Google Cloud project creation
- Firebase project setup
- Android/iOS app registration
- Play Store publishing
- App Store publishing (future)

## Installation

```bash
npm install
```

## Quick Start

### Single Command Entry Point

Just run the script:

```bash
./release-the-hounds.sh
```

This will:
- ✅ Check all dependencies (Node.js, npm, gcloud CLI)
- ✅ Show available commands
- ✅ Auto-install npm dependencies if needed

### First Time Setup

1. **Check dependencies:**
   ```bash
   ./release-the-hounds.sh check-deps
   ```
   This verifies Node.js, npm, and gcloud CLI are installed.

2. **Authenticate with Google:**
   ```bash
   ./release-the-hounds.sh auth
   ```
   This will:
   - Open your browser for Google sign-in
   - Use gcloud CLI (fully automated - no manual OAuth setup needed!)
   - Set up Application Default Credentials

3. **Check status:**
   ```bash
   ./release-the-hounds.sh status
   ```

4. **Create GCP project:**
   ```bash
   ./release-the-hounds.sh create-project --name "My App"
   ```

5. **Setup Firebase:**
   ```bash
   ./release-the-hounds.sh setup-firebase
   ```

6. **Generate Play Store config:**
   ```bash
   ./release-the-hounds.sh generate-play-store-config
   ```
   This creates `play-store-config.json` pre-filled with your Firebase app details.

7. **Edit config and publish:**
   - Edit `play-store-config.json` with your app details
   - Build your app: `flutter build appbundle`
   - Publish: `./release-the-hounds.sh publish-play-store`

### Available Commands

- `./release-the-hounds.sh check-deps` - Check if all dependencies are installed
- `./release-the-hounds.sh auth` - Authenticate with Google (uses gcloud CLI)
- `./release-the-hounds.sh status` - Check authentication status
- `./release-the-hounds.sh create-project --name "My App"` - Create GCP project (with APIs, service account, IAM roles)
- `./release-the-hounds.sh list-projects` - List all accessible projects
- `./release-the-hounds.sh setup-service-account` - Setup service account for existing project
- `./release-the-hounds.sh setup-firebase` - Setup Firebase project and apps (interactive)
- `./release-the-hounds.sh setup-firebase --android-package "com.example.app" --ios-bundle "com.example.app"` - Setup with specific apps
- `./release-the-hounds.sh generate-play-store-config` - Generate Play Store config template (pre-filled with Firebase data)
- `./release-the-hounds.sh publish-play-store` - Publish app to Google Play Store

## Authentication

This tool uses **gcloud CLI** for authentication, which means:
- ✅ **No manual OAuth2 setup required** - gcloud handles it automatically
- ✅ **No client credentials needed** - Application Default Credentials are used
- ✅ **Fully automated** - just run `./release-the-hounds.sh auth`

### Requirements

- **gcloud CLI** must be installed:
  - Linux: `sudo snap install google-cloud-cli --classic`
  - macOS: `brew install google-cloud-sdk`
  - Or visit: https://cloud.google.com/sdk/docs/install

The script will check for gcloud automatically and provide installation instructions if missing.

## Project Structure

```
release_the_hounds/
├── src/
│   ├── auth/          # Authentication (gcloud CLI)
│   ├── gcp/           # GCP project, APIs, service accounts, IAM
│   ├── firebase/      # Firebase project and app management
│   ├── play-store/    # Play Store publishing automation
│   ├── utils/         # Utility functions
│   └── cli.js         # CLI entry point
├── .autopublish/      # Secrets and state (gitignored)
│   ├── service-accounts/  # Service account keys
│   └── firebase-config/   # Firebase config files
├── docs/              # Documentation
└── package.json
```

## Development

```bash
# Run CLI
npm start <command>

# Example: Authenticate
npm start auth

# Example: Check status
npm start status
```

## Security

- All credentials are stored in `.autopublish/` directory (gitignored)
- Never commit sensitive data
- Refresh tokens are stored locally and encrypted at rest (future enhancement)

## License

MIT

