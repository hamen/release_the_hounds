# Auto-Publisher: Implementation Tracking

## Current Status

**Last Updated**: Initial planning phase

## High-Level Milestones

### ✅ Phase 0: Planning & Documentation
- [x] Create 3000-foot overview document
- [x] Set up tracking todos
- [ ] Finalize detailed technical specifications

### 🔄 Phase 1: Foundation (OAuth + GCP Setup)
- [x] Set up Node.js project structure
- [x] Implement OAuth2 authentication flow
  - [x] Create temporary Express callback server
  - [x] Implement browser consent flow
  - [x] Handle token exchange and storage
  - [x] Implement token refresh logic
- [ ] Implement GCP project creation
  - [ ] Generate unique project ID
  - [ ] Create project via API
  - [ ] Poll for project activation
- [ ] Implement API enabling
  - [ ] Enable IAM API
  - [ ] Enable Cloud Resource Manager API
  - [ ] Enable Firebase API
  - [ ] Enable Android Publisher API
  - [ ] Enable Service Usage API
- [ ] Implement service account creation
  - [ ] Create service account
  - [ ] Generate and download key JSON
  - [ ] Store key securely
- [ ] Implement IAM role assignment
  - [ ] Grant project editor role
  - [ ] Grant Firebase admin role
  - [ ] Grant Android Publisher role

**Success Criteria**: Can authenticate and create/manage GCP resources programmatically

---

### 📋 Phase 2: Firebase Integration
- [ ] Implement Firebase project creation
  - [ ] Link Firebase to GCP project
  - [ ] Wait for Firebase project activation
- [ ] Implement Android app registration
  - [ ] Add Android app to Firebase
  - [ ] Configure package name and display name
  - [ ] Handle SHA-1 fingerprint (optional)
  - [ ] Download google-services.json
- [ ] Implement iOS app registration (optional for Phase 2)
  - [ ] Add iOS app to Firebase
  - [ ] Configure bundle ID and display name
  - [ ] Download GoogleService-Info.plist
- [ ] Implement Firebase feature configuration
  - [ ] Enable Analytics (optional)
  - [ ] Enable Crashlytics (optional)

**Success Criteria**: Firebase project exists with mobile apps registered and config files downloaded

---

### 📱 Phase 3: Android Build & Screenshot Automation
- [ ] Implement Android build detection
  - [ ] Detect build system (Flutter/Gradle)
  - [ ] Locate build output (APK/AAB)
- [ ] Implement ADB integration
  - [ ] Detect connected Android devices
  - [ ] Verify ADB availability
  - [ ] Handle device selection (if multiple)
- [ ] Implement app installation
  - [ ] Uninstall existing app (if present)
  - [ ] Install new build
  - [ ] Verify installation success
- [ ] Implement app launching
  - [ ] Launch app via ADB
  - [ ] Wait for app to be ready
- [ ] Implement UI navigation
  - [ ] Define navigation recipe format
  - [ ] Implement tap/input commands
  - [ ] Implement wait conditions
  - [ ] Handle navigation errors
- [ ] Implement screenshot capture
  - [ ] Capture screenshots at key screens
  - [ ] Save in Play Store required formats
  - [ ] Organize by device type/category
- [ ] Implement screenshot validation
  - [ ] Verify screenshot dimensions
  - [ ] Verify required screenshots present

**Success Criteria**: Can build app, install on device, navigate UI, and capture all required screenshots

---

### 🛒 Phase 4: Play Store Publishing
- [ ] Implement Play Store app creation
  - [ ] Create new app via API
  - [ ] Handle app creation errors
- [ ] Implement edit session management
  - [ ] Create edit session
  - [ ] Track edit ID
  - [ ] Handle edit expiration
- [ ] Implement bundle/APK upload
  - [ ] Upload AAB (preferred) or APK
  - [ ] Track upload progress
  - [ ] Handle upload errors
- [ ] Implement metadata upload
  - [ ] Set app title
  - [ ] Set short description
  - [ ] Set full description
  - [ ] Set category
  - [ ] Set privacy policy URL
  - [ ] Set content rating
- [ ] Implement graphics upload
  - [ ] Upload app icon
  - [ ] Upload feature graphic
  - [ ] Upload phone screenshots
  - [ ] Upload tablet screenshots (if applicable)
  - [ ] Upload TV screenshots (if applicable)
  - [ ] Upload Wear OS screenshots (if applicable)
- [ ] Implement release configuration
  - [ ] Set release track (production/internal/alpha/beta)
  - [ ] Set release notes
  - [ ] Configure rollout percentage
- [ ] Implement edit commit
  - [ ] Validate all required fields
  - [ ] Commit edit
  - [ ] Handle commit errors
  - [ ] Verify release status

**Success Criteria**: App published (or staged) on Play Store without manual intervention

---

### 🍎 Phase 5: iOS Build & Screenshot Automation (Future)
- [ ] Research Fastlane Snapshot integration
- [ ] Implement iOS build detection
- [ ] Implement simulator automation
- [ ] Implement screenshot capture for all device sizes
- [ ] Generate App Store screenshot sets

**Success Criteria**: Can build iOS app and capture all required screenshots

---

### 📲 Phase 6: App Store Publishing (Future)
- [ ] Implement App Store Connect API authentication (JWT)
- [ ] Implement app creation
- [ ] Implement build upload via Fastlane
- [ ] Implement metadata upload
- [ ] Implement screenshot upload
- [ ] Implement app submission

**Success Criteria**: App submitted to App Store for review

---

## Infrastructure & Tooling

### Project Setup
- [x] Initialize Node.js project
  - [x] Create package.json
  - [ ] Set up TypeScript (if using)
  - [ ] Configure ESLint/Prettier
- [x] Set up directory structure
  - [x] Create src/ directory
  - [x] Create .autopublish/ directory (created on first use)
  - [x] Create docs/ directory
  - [x] Set up .gitignore
- [x] Install dependencies
  - [x] Google APIs client libraries (googleapis)
  - [x] Express (for OAuth callback)
  - [ ] ADB wrapper library (future)
  - [x] File system utilities
  - [x] Configuration management

### State Management
- [ ] Design state file format
- [ ] Implement state persistence
- [ ] Implement state recovery
- [ ] Implement state validation

### Error Handling
- [ ] Implement retry logic with exponential backoff
- [ ] Implement error recovery mechanisms
- [ ] Create error logging system
- [ ] Create user-friendly error messages

### Testing
- [ ] Set up test framework
- [ ] Write unit tests for OAuth flow
- [ ] Write unit tests for API clients
- [ ] Write integration tests for each phase
- [ ] Create mock API responses for testing

### Documentation
- [ ] Write user guide
- [ ] Write API documentation
- [ ] Create troubleshooting guide
- [ ] Document configuration options

---

## Blockers & Questions

### Technical Questions
- [ ] Verify exact OAuth scopes required for all operations
- [ ] Confirm Play Store API supports creating new apps (vs. only updating existing)
- [ ] Research App Store Connect API limitations and requirements
- [ ] Determine ADB navigation recipe format and flexibility

### Design Decisions Needed
- [ ] Choose between TypeScript or JavaScript
- [ ] Decide on configuration file format (JSON/YAML/TOML)
- [ ] Determine CLI argument structure
- [ ] Decide on logging library and format

---

## Notes

- Start with Android-only implementation, add iOS later
- Focus on first-time app creation, not updates
- Prioritize error handling and user feedback
- Keep each phase independently testable

---

*This todo list will be updated as implementation progresses. Check off items as they are completed.*

