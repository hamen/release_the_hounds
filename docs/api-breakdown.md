# Google Cloud APIs Breakdown

## Currently Enabled APIs

### 1. `iam.googleapis.com` - Identity and Access Management API
**Purpose**: Manage service accounts, roles, and permissions
**Why we need it**:
- Create service accounts programmatically
- Grant IAM roles to service accounts
- Manage access control for the project

**Used for**: Service account creation and IAM role assignment

---

### 2. `cloudresourcemanager.googleapis.com` - Cloud Resource Manager API
**Purpose**: Manage Google Cloud projects and resources
**Why we need it**:
- Create projects programmatically (already done ✅)
- List projects
- Get project details
- Set IAM policies on projects

**Used for**: Project creation, project management

---

### 3. `firebase.googleapis.com` - Firebase Management API
**Purpose**: Manage Firebase projects and apps
**Why we need it**:
- Create Firebase projects linked to GCP projects
- Add Android apps to Firebase
- Add iOS apps to Firebase
- Download `google-services.json` and `GoogleService-Info.plist`
- Configure Firebase features (Analytics, Crashlytics, etc.)

**Used for**: Firebase project setup (Phase 2)

---

### 4. `androidpublisher.googleapis.com` - Google Play Developer API (Android Publisher API)
**Purpose**: **This is THE API for Play Store publishing**
**Why we need it**:
- Create new apps in Play Console
- Upload AAB/APK files
- Manage app metadata (title, description, screenshots)
- Manage releases (internal, alpha, beta, production)
- Handle in-app products and subscriptions
- Manage app listings and graphics

**What it covers**:
- ✅ App creation
- ✅ Release management
- ✅ Metadata management
- ✅ Graphics upload (screenshots, icons, feature graphics)
- ✅ In-app products
- ✅ Subscriptions (via Android Publisher API)
- ✅ Pricing and distribution
- ✅ Content ratings

**Used for**: Play Store publishing (Phase 4)

**Note**: This is also called "Google Play Console API" or "Play Developer API" - they're all the same thing. The API name is `androidpublisher.googleapis.com`.

---

### 5. `serviceusage.googleapis.com` - Service Usage API
**Purpose**: Enable and disable other APIs programmatically
**Why we need it**:
- Enable the APIs listed above
- Check which APIs are enabled
- Manage API quotas

**Used for**: Enabling all the other APIs (meta-API)

---

## APIs We DON'T Need (But You Might Be Thinking Of)

### ❌ "Google Play Console API"
- **This doesn't exist as a separate API**
- The `androidpublisher.googleapis.com` IS the Play Console API
- It's the same thing, just different names

### ❌ "Google Play Subscriptions API"
- **This is part of `androidpublisher.googleapis.com`**
- Subscriptions are managed through the Android Publisher API
- No separate API needed

### ❌ "Google Play Billing API"
- **This is for in-app billing from within your app**
- Not needed for publishing automation
- Your app code uses this, not our automation tool

---

## What About Other APIs?

### Potentially Useful (But Not Required Yet):

1. **`cloudbilling.googleapis.com`** - Cloud Billing API
   - Only needed if we want to automate billing account setup
   - Not required for basic publishing

2. **`appengine.googleapis.com`** - App Engine API
   - Only if we want to deploy web apps
   - Not needed for mobile app publishing

3. **`storage.googleapis.com`** - Cloud Storage API
   - Only if we want to store files in GCS
   - Not required for Play Store publishing

---

## Summary

✅ **We have everything we need for Play Store publishing!**

The `androidpublisher.googleapis.com` API is comprehensive and covers:
- App creation
- Release management
- Metadata and graphics
- Subscriptions and in-app products
- Everything else Play Store related

**No additional APIs needed** for basic Play Store publishing. The Android Publisher API is the one-stop shop for all Play Console operations.

---

## API Usage Flow

```
1. Create GCP Project
   └─ Uses: cloudresourcemanager.googleapis.com ✅

2. Enable APIs
   └─ Uses: serviceusage.googleapis.com ✅

3. Create Service Account
   └─ Uses: iam.googleapis.com ✅

4. Create Firebase Project
   └─ Uses: firebase.googleapis.com ✅

5. Publish to Play Store
   └─ Uses: androidpublisher.googleapis.com ✅
```

All APIs are enabled and ready to use! 🎉

