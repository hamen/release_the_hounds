# Play Store App Creation Flow

## The Challenge

**Google Play Console API does NOT have a direct "create app" endpoint.**

Apps are created in one of two ways:
1. **Manually** in Play Console UI (one-time setup)
2. **Automatically** when you upload your first AAB/APK

## Our Solution

### Option 1: Auto-Create via First Upload (Recommended)

When you run `publish-play-store` for the first time:

1. **Check if app exists** - Try to create an edit session
   - ✅ If edit succeeds → App exists, continue normally
   - ❌ If edit fails with 404 → App doesn't exist yet

2. **Create app automatically** - Upload your first AAB/APK
   - The Play Console automatically creates the app when you upload the first build
   - Then we can set metadata, screenshots, etc. in the same edit session

3. **Set metadata** - After upload succeeds, set title, description, etc.

### Option 2: Manual Creation (Fallback)

If auto-creation fails, we'll guide you to:
1. Go to Play Console → Create app manually
2. Enter package name (must match your Firebase Android app)
3. Enter app title
4. Then run `publish-play-store` again

## Linking to GCP and Firebase

### How Linking Works

```
┌─────────────────┐
│  GCP Project    │
│  (autoapp-xxx)  │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Firebase Project│  │ Play Store App  │
│ (pushup-tracker)│  │ (com.example)   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │                    │
         └──────────┬──────────┘
                    │
         Linked via Package Name
```

### Step-by-Step Linking

1. **GCP ↔ Firebase**: Already linked (same project ID)
   - ✅ Done during `setup-firebase` command

2. **Firebase ↔ Play Store**: Linked via **package name**
   - Firebase Android app package name **must match** Play Store app package name
   - Example: `com.ivanmorgillo.pushuptracker` in both places
   - ✅ Automatic - just use the same package name

3. **GCP ↔ Play Store**: Linked via **service account**
   - Service account email needs Play Console access
   - ⚠️ **Manual step**: Go to Play Console → Settings → Users & Permissions
   - Add service account email (from `.autopublish/state.json`)
   - Grant "Admin" or "Release" permissions

## User Workflow

### First Time Setup

1. **Create config file**:
   ```bash
   cp play-store-config.example.json play-store-config.json
   ```

2. **Fill in config**:
   ```json
   {
     "packageName": "com.ivanmorgillo.pushuptracker",  // Must match Firebase!
     "build": {
       "aab": "./app-release.aab"
     },
     "metadata": {
       "title": "Pushup Tracker",
       "shortDescription": "Track your pushups",
       "fullDescription": "...",
       "category": "APPLICATION_HEALTH_AND_FITNESS",
       "privacyPolicyUrl": "https://example.com/privacy"
     }
   }
   ```

3. **Build your app**:
   ```bash
   flutter build appbundle
   # or
   ./gradlew bundleRelease
   ```

4. **Publish**:
   ```bash
   ./release-the-hounds.sh publish-play-store
   ```

### What Happens During First Publish

```
Step 1: Verify Play Console access
  → Check service account has permissions
  → If not, show instructions to grant access

Step 2: Check if app exists
  → Try to create edit session
  → If 404: App doesn't exist yet

Step 3: Upload AAB/APK (creates app automatically)
  → Upload build
  → Play Console creates app with this package name
  → Get version code

Step 4: Set metadata
  → Title, descriptions, category
  → Privacy policy URL

Step 5: Set content rating
  → Answer questionnaires from config

Step 6: Upload screenshots
  → From screenshots/android/ folder

Step 7: Set pricing & distribution
  → Free/paid, release track

Step 8: Validate & commit
  → Validate edit
  → Commit changes
```

## Package Name Matching

**Critical**: The package name must match in three places:

1. **Your Android app** (`build.gradle` / `pubspec.yaml`)
   ```gradle
   applicationId "com.ivanmorgillo.pushuptracker"
   ```

2. **Firebase Android app** (created via `setup-firebase`)
   ```bash
   ./release-the-hounds.sh setup-firebase --android-package com.ivanmorgillo.pushuptracker
   ```

3. **Play Store app** (in `play-store-config.json`)
   ```json
   {
     "packageName": "com.ivanmorgillo.pushuptracker"
   }
   ```

If they don't match, linking won't work!

## Service Account Play Console Access

**One-time manual step**:

1. Get service account email:
   ```bash
   cat .autopublish/state.json | grep client_email
   ```

2. Go to Play Console:
   - https://play.google.com/console
   - Settings → Users & Permissions
   - Click "Invite new users"
   - Paste service account email
   - Grant "Admin" or "Release" permissions
   - Save

3. Verify access:
   ```bash
   ./release-the-hounds.sh publish-play-store --dry-run
   ```

## Troubleshooting

### "App not found" error

**Cause**: App doesn't exist in Play Console yet

**Solution**: 
- First publish will auto-create it via AAB upload
- Or create manually in Play Console first

### "Permission denied" error

**Cause**: Service account doesn't have Play Console access

**Solution**: 
- Grant permissions in Play Console → Settings → Users & Permissions
- See "Service Account Play Console Access" above

### "Package name mismatch" error

**Cause**: Package name doesn't match between Firebase and Play Store

**Solution**: 
- Ensure same package name in:
  - Android app code
  - Firebase Android app
  - Play Store config file

