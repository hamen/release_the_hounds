# LLM Context: Release The Hounds (Auto-Publisher)

## Project Overview

**Project Name**: `release-the-hounds` (also referred to as `auto-publisher` internally)

**Purpose**: Fully automated mobile app publishing pipeline that takes a Gmail account and automatically creates Google Cloud projects, Firebase projects, and publishes apps to Google Play Store and iOS App Store - with **zero manual steps** in Google Cloud Console, Play Console, or App Store Connect.

**Core Principle**: Start with nothing (just a Gmail account), end with published apps. The tool automates the entire lifecycle from authentication to app publication.

## Current Implementation Status

### ✅ Completed (Phase 1 - Foundation)

1. **OAuth2 Authentication via gcloud CLI**
   - Uses `gcloud auth login` and `gcloud auth application-default login` for fully automated authentication
   - **Key Decision**: We use gcloud CLI instead of manual OAuth2 client credentials setup because:
     - No manual Google Cloud Console navigation required
     - No OAuth2 client ID/secret configuration needed
     - True automation - just run `./release-the-hounds.sh auth`
   - Authentication status checking implemented
   - Application Default Credentials (ADC) setup automated

2. **Single Entry Point Script**
   - `./release-the-hounds.sh` - Main entry point for all operations
   - Automatically checks dependencies (Node.js, npm, gcloud CLI)
   - Shows helpful error messages with installation instructions
   - Commands:
     - `./release-the-hounds.sh check-deps` - Verify all dependencies
     - `./release-the-hounds.sh auth` - Authenticate with Google
     - `./release-the-hounds.sh status` - Check authentication status
     - `./release-the-hounds.sh create-project` - Create GCP project
     - `./release-the-hounds.sh list-projects` - List accessible projects

3. **GCP Project Creation Module**
   - `src/gcp/project.js` - Handles project creation via Cloud Resource Manager API
   - Generates unique project IDs: `autoapp-{timestamp}-{random}`
   - Polls for project activation
   - Saves project state to `.autopublish/state.json`

4. **API Enabling Module**
   - `src/gcp/apis.js` - Enables required Google APIs programmatically
   - Required APIs:
     - `iam.googleapis.com`
     - `cloudresourcemanager.googleapis.com`
     - `firebase.googleapis.com`
     - `androidpublisher.googleapis.com`
     - `serviceusage.googleapis.com`
   - Handles API enablement polling

5. **Dependency Checking**
   - `src/utils/check-dependencies.js` - Verifies all required tools
   - Checks: Node.js, npm, gcloud CLI
   - Provides installation instructions if missing

### 🚧 In Progress / Next Steps

- Service Account creation and key generation
- IAM role assignment
- Firebase project creation and Android/iOS app registration
- ADB automation for Android screenshot capture
- Play Store app creation and publishing
- iOS App Store automation (future)

## Technology Stack

- **Runtime**: Node.js (ES modules - `"type": "module"`)
- **CLI Framework**: Commander.js
- **Google APIs**: `googleapis` npm package
- **Authentication**: gcloud CLI (Application Default Credentials)
- **State Management**: JSON files in `.autopublish/` directory (gitignored)
- **Shell Script**: Bash script for single entry point

## Project Structure

```
release_the_hounds/
├── release-the-hounds.sh    # Main entry point script
├── src/
│   ├── cli.js               # CLI command definitions
│   ├── auth/
│   │   ├── gcloud-auth.js  # gcloud-based authentication
│   │   └── oauth.js        # OAuth2 flow (legacy, not used)
│   ├── gcp/
│   │   ├── project.js       # GCP project management
│   │   └── apis.js         # API enabling
│   ├── utils/
│   │   ├── fs.js           # File system utilities
│   │   └── check-dependencies.js  # Dependency checking
│   └── config.js           # Configuration constants
├── .autopublish/           # Secrets and state (gitignored)
│   ├── refresh-token.json  # Not used (gcloud handles this)
│   └── state.json          # Current project state
├── docs/                   # Documentation
│   ├── overview.md         # 3000-foot overview
│   ├── todo.md            # Implementation tracking
│   └── oauth-implementation.md  # OAuth details
└── package.json
```

## Key Design Decisions & Gotchas

### 1. Authentication Strategy
- **Why gcloud CLI?**: Google doesn't provide an API to create OAuth2 client credentials programmatically. Using gcloud CLI bypasses this entirely - it handles OAuth2 automatically.
- **Important**: The `gcloud auth application-default login` command does NOT support `--brief` flag. Use without flags.
- **Application Default Credentials**: This is what the Google APIs client libraries use. Set up via `gcloud auth application-default login`.

### 2. Project Naming
- User-facing: `release-the-hounds.sh` (the script name)
- Internal CLI name: `auto-publisher` (Commander.js program name)
- **Important**: All error messages should reference `./release-the-hounds.sh` not "auto-publisher"

### 3. State Management
- State stored in `.autopublish/` directory (gitignored)
- `state.json` contains current project info
- No sensitive data in git (all credentials handled by gcloud)

### 4. Error Handling
- Always check authentication before API calls
- Provide clear error messages with next steps
- Check dependencies upfront in the shell script

### 5. Google APIs Import Pattern
- Use `import { google } from 'googleapis'` (not named imports)
- Then: `google.cloudresourcemanager({ version: 'v1', auth })`
- This works with ES modules

## Important Commands Reference

```bash
# Check dependencies
./release-the-hounds.sh check-deps

# Authenticate (opens browser automatically)
./release-the-hounds.sh auth

# Check status
./release-the-hounds.sh status

# Create GCP project
./release-the-hounds.sh create-project

# List projects
./release-the-hounds.sh list-projects
```

## Testing Notes

- Authentication works: User successfully authenticated as `imorgillo@gmail.com`
- gcloud CLI version: 548.0.0
- Node.js version: v20.19.4
- All dependencies verified working

## Future Architecture Considerations

### MCP Server (Future)
- Initially planned as MCP server for Cursor integration
- **Decision**: Build as CLI first, convert to MCP later
- Reason: Faster iteration, easier testing, better developer experience
- CLI commands can be wrapped as MCP tools later

### Phase Breakdown
1. ✅ OAuth + GCP Setup (in progress)
2. Firebase Integration
3. Android Build & Screenshot Automation (ADB)
4. Play Store Publishing
5. iOS Automation (Fastlane)
6. App Store Publishing

## Common Issues & Solutions

### Issue: "Could not load the default credentials"
- **Solution**: Run `./release-the-hounds.sh auth` to set up Application Default Credentials

### Issue: "gcloud CLI not found"
- **Solution**: Install via `sudo snap install google-cloud-cli --classic` (Linux) or `brew install google-cloud-sdk` (macOS)

### Issue: API import errors with googleapis
- **Solution**: Use `import { google } from 'googleapis'` then `google.serviceName({ version: 'v1', auth })`

## Development Workflow

1. Make changes to source files in `src/`
2. Test via `./release-the-hounds.sh <command>`
3. The script automatically checks dependencies and installs npm packages if needed
4. No build step required - runs directly with Node.js

## Important Files to Know

- `release-the-hounds.sh` - Main entry point, always check this first
- `src/cli.js` - Command definitions
- `src/auth/gcloud-auth.js` - Authentication logic
- `src/gcp/project.js` - GCP project operations
- `.autopublish/` - State directory (gitignored, don't commit)

## Next Major Features to Implement

1. **Service Account Creation** (`src/gcp/service-account.js`)
   - Create service account programmatically
   - Generate and download key JSON
   - Store in `.autopublish/service-account.json`

2. **IAM Role Assignment** (`src/gcp/iam.js`)
   - Grant roles: `roles/cloudresourcemanager.projectEditor`, `roles/firebase.admin`, `roles/androidpublisher`

3. **Firebase Project Setup** (`src/firebase/project.js`)
   - Create Firebase project linked to GCP project
   - Add Android app with package name
   - Add iOS app with bundle ID
   - Download config files

4. **ADB Automation** (`src/android/adb.js`)
   - Detect connected devices
   - Install and launch apps
   - Navigate UI programmatically
   - Capture screenshots

5. **Play Store Publishing** (`src/play-store/publish.js`)
   - Create new app
   - Upload AAB/APK
   - Set metadata
   - Upload graphics
   - Commit release

---

**Last Updated**: After completing OAuth2 authentication via gcloud CLI and GCP project creation modules.

**Key Achievement**: Eliminated manual OAuth2 setup by using gcloud CLI - true automation from Gmail account to authenticated state.

