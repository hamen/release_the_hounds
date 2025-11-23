# Auto-Publisher: 3000-Foot Overview

## Vision

Automate the entire mobile app publishing pipeline from a single Gmail account to published apps on Google Play Store and iOS App Store, with zero manual intervention in Google Cloud Console, Play Console, or App Store Connect.

## Core Principle

**Start with nothing, end with published apps.** The tool takes a Gmail account and produces:
- A fully configured Google Cloud project
- A Firebase project with Android/iOS apps
- Published apps on Play Store (and later App Store)
- All necessary credentials, keys, and configurations saved locally

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js (CLI tool)
- **Authentication**: OAuth2 authorization code flow with local callback server
- **APIs**: Google Cloud APIs, Firebase Management API, Play Developer API, App Store Connect API
- **Automation**: ADB for Android screenshots, Fastlane for iOS
- **State Management**: Local `.autopublish/` directory for credentials and state

### High-Level Flow

```
Gmail Account
    ↓
[OAuth2 Authentication]
    ↓
[Create Google Cloud Project]
    ↓
[Enable Required APIs]
    ↓
[Create Service Account + Keys]
    ↓
[Grant IAM Roles]
    ↓
[Create Firebase Project]
    ↓
[Add Android/iOS Apps to Firebase]
    ↓
[Build & Test Apps]
    ↓
[Capture Screenshots via ADB/Simulator]
    ↓
[Create Play Store App]
    ↓
[Upload Metadata, Screenshots, AAB/APK]
    ↓
[Commit Play Store Release]
    ↓
[Repeat for iOS via Fastlane]
```

## Major Components

### 1. OAuth2 Bootstrap Module
**Purpose**: Authenticate user with Google using only Gmail credentials

**Responsibilities**:
- Launch temporary Express.js server for OAuth callback
- Open browser for Google consent screen
- Exchange authorization code for access/refresh tokens
- Store refresh token securely for reuse

**APIs Used**: Google OAuth2 API

**Output**: Valid access token with required scopes

---

### 2. Google Cloud Project Provisioning Module
**Purpose**: Create and configure a new GCP project programmatically

**Responsibilities**:
- Generate unique project ID (`autoapp-${timestamp}`)
- Create project via Cloud Resource Manager API
- Poll until project is ACTIVE
- Enable required APIs (IAM, Cloud Resource Manager, Firebase, Android Publisher, Service Usage)
- Handle project number retrieval

**APIs Used**: 
- Cloud Resource Manager API
- Service Usage API

**Output**: Active GCP project with all APIs enabled

---

### 3. Service Account & IAM Module
**Purpose**: Create service account and grant necessary permissions

**Responsibilities**:
- Create service account (`app-publisher@{projectId}.iam.gserviceaccount.com`)
- Generate and download private key JSON
- Grant roles: `roles/cloudresourcemanager.projectEditor`, `roles/firebase.admin`, `roles/androidpublisher`
- Store service account key securely

**APIs Used**:
- IAM API
- Cloud Resource Manager API (for IAM policy)

**Output**: Service account JSON key file in `.autopublish/`

---

### 4. Firebase Project Setup Module
**Purpose**: Create Firebase project and register mobile apps

**Responsibilities**:
- Create Firebase project linked to GCP project
- Add Android app with package name, display name, SHA-1
- Add iOS app with bundle ID, display name
- Generate and download `google-services.json` / `GoogleService-Info.plist`
- Configure Firebase features (Analytics, Crashlytics, etc.)

**APIs Used**: Firebase Management API

**Output**: Firebase project with Android/iOS apps configured

---

### 5. Android Build & Screenshot Automation Module
**Purpose**: Build app, install on device, capture screenshots via ADB

**Responsibilities**:
- Build Android APK/AAB (via Flutter/Gradle)
- Install app on connected Android device
- Launch app via ADB
- Navigate through UI using tap/input commands
- Capture screenshots at key screens
- Save screenshots in required Play Store formats

**Tools Used**: ADB, Android build tools

**Output**: App bundle and screenshots ready for Play Store

---

### 6. Play Store Publishing Module
**Purpose**: Create new Play Store app and publish first release

**Responsibilities**:
- Create new app in Play Console (via API)
- Create edit session
- Upload AAB/APK
- Set app metadata (title, description, category, privacy policy)
- Upload graphics (icon, feature graphic, screenshots by device type)
- Set pricing and distribution
- Commit edit to publish

**APIs Used**: Google Play Developer API

**Output**: Published app on Play Store (or staged for review)

---

### 7. iOS Build & Screenshot Automation Module (Future)
**Purpose**: Build iOS app, capture screenshots via simulator

**Responsibilities**:
- Build iOS app (via Xcode/Fastlane)
- Launch iOS simulator
- Navigate through UI
- Capture screenshots for all required device sizes
- Generate App Store screenshots

**Tools Used**: Fastlane Snapshot, Xcode, iOS Simulator

**Output**: App archive and screenshots ready for App Store

---

### 8. App Store Publishing Module (Future)
**Purpose**: Create App Store app and submit for review

**Responsibilities**:
- Create app in App Store Connect (via API)
- Upload build via Fastlane
- Set metadata (name, description, keywords, categories)
- Upload screenshots for all device sizes
- Configure app information (privacy policy, support URL, etc.)
- Submit for App Store review

**APIs Used**: App Store Connect API

**Tools Used**: Fastlane Deliver

**Output**: App submitted to App Store for review

---

## State Management

### Local Directory Structure
```
release_the_hounds/
├── .autopublish/              # Secrets and state (gitignored)
│   ├── refresh-token.json     # OAuth refresh token
│   ├── service-account.json   # Service account key
│   ├── project-state.json     # Current project info
│   └── firebase-config/       # Firebase config files
├── docs/                      # Documentation
│   ├── overview.md           # This file
│   └── todo.md               # Tracking todos
├── src/                       # Source code (to be created)
└── package.json              # Node.js project
```

### State Tracking
- Current GCP project ID
- Current Firebase project ID
- Service account email
- OAuth token expiration
- Last operation timestamp
- Error recovery state

## Prerequisites & Dependencies

### Required Tools
- **Node.js** (v18+)
- **ADB** (Android Debug Bridge) - for Android automation
- **Android SDK** - for building Android apps
- **Xcode** (macOS only) - for iOS builds
- **Fastlane** - for iOS automation (future)

### Required Google APIs
- Cloud Resource Manager API
- IAM API
- Service Usage API
- Firebase Management API
- Google Play Developer API
- App Store Connect API (future)

### OAuth Scopes Required
```
https://www.googleapis.com/auth/cloud-platform
https://www.googleapis.com/auth/androidpublisher
https://www.googleapis.com/auth/firebase
```

## Execution Phases

### Phase 1: Foundation (OAuth + GCP Setup)
1. OAuth2 authentication flow
2. Create GCP project
3. Enable APIs
4. Create service account
5. Grant IAM roles

**Success Criteria**: Can authenticate and create/manage GCP resources

---

### Phase 2: Firebase Integration
1. Create Firebase project
2. Add Android app
3. Add iOS app (optional in Phase 2)
4. Download config files

**Success Criteria**: Firebase project exists with mobile apps registered

---

### Phase 3: Android Automation
1. Build Android app
2. ADB device detection
3. Install and launch app
4. Navigate UI programmatically
5. Capture screenshots
6. Package for Play Store

**Success Criteria**: Can build app and capture all required screenshots

---

### Phase 4: Play Store Publishing
1. Create new Play Store app
2. Upload AAB/APK
3. Set metadata
4. Upload graphics
5. Commit release

**Success Criteria**: App published (or staged) on Play Store

---

### Phase 5: iOS Automation (Future)
1. Build iOS app
2. Simulator automation
3. Screenshot capture
4. Fastlane integration

**Success Criteria**: Can build iOS app and capture screenshots

---

### Phase 6: App Store Publishing (Future)
1. Create App Store app
2. Upload build
3. Set metadata
4. Submit for review

**Success Criteria**: App submitted to App Store

## Error Handling & Recovery

### Retry Logic
- API rate limiting: Exponential backoff
- Project creation: Poll with timeout
- ADB operations: Retry with device reconnection
- Upload failures: Resume from last successful step

### State Recovery
- Save state after each major step
- Resume from last checkpoint on failure
- Validate state before proceeding

### Common Failure Points
- OAuth token expiration → Refresh automatically
- ADB device disconnection → Prompt for reconnection
- API quota exceeded → Wait and retry
- Build failures → Surface error, don't proceed

## Security Considerations

### Credential Storage
- Service account keys stored in `.autopublish/` (gitignored)
- OAuth refresh tokens encrypted at rest
- Never log sensitive data
- Support for environment variable overrides

### Permissions
- Request minimum required OAuth scopes
- Service account has least-privilege roles
- User can review IAM changes before applying

## Success Metrics

### Functional Success
- ✅ Can create GCP project from Gmail account
- ✅ Can create Firebase project and apps
- ✅ Can build and capture Android screenshots
- ✅ Can publish to Play Store without manual steps
- ✅ Can publish to App Store without manual steps (future)

### Quality Success
- Zero manual console interactions required
- All operations idempotent (can re-run safely)
- Clear error messages and recovery paths
- Comprehensive logging for debugging

## Non-Goals (Out of Scope)

- Managing existing apps (only creating new ones)
- Updating app metadata after initial publish
- Handling app updates/releases (focus on first publish)
- Multi-account management
- CI/CD integration (optional future enhancement)
- App Store review management (submit only)

## Next Steps

1. **Detailed Design**: Break down each module into specific API calls and implementation details
2. **API Research**: Verify exact endpoints, request/response formats, and authentication methods
3. **Prototype OAuth Flow**: Implement and test OAuth2 callback server
4. **Incremental Implementation**: Build and test each phase independently
5. **Integration Testing**: Test end-to-end flow with real Gmail account
6. **Documentation**: Create user guide and API documentation

---

*This document serves as the high-level roadmap. Each major component will have its own detailed design document as we dive deeper into implementation.*

