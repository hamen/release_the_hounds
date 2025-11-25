/**
 * Play Store release management
 * Handles AAB/APK uploads
 */

import { getPlayStoreClient } from './auth.js';
import { createEdit, getExistingEdit } from './edits.js';
import { readFile } from 'fs/promises';
import { extname } from 'path';

/**
 * Upload AAB (Android App Bundle) to Play Console
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} aabPath - Path to AAB file
 * @returns {Promise<Object>} Upload result with version info
 */
export async function uploadAAB(packageName, editId, aabPath) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n📦 Uploading AAB: ${aabPath}`);

  try {
    // Read AAB file
    const aabFile = await readFile(aabPath);

    // Upload AAB
    const response = await androidpublisher.edits.bundles.upload({
      packageName: packageName,
      editId: editId,
      media: {
        mimeType: 'application/octet-stream',
        body: aabFile
      }
    });

    const versionCode = response.data.versionCode;
    const versionName = response.data.versionName || `version-${versionCode}`;

    console.log(`   ✅ AAB uploaded successfully`);
    console.log(`   Version Code: ${versionCode}`);
    console.log(`   Version Name: ${versionName}`);

    return {
      versionCode: versionCode,
      versionName: versionName,
      sha1: response.data.sha1
    };
  } catch (error) {
    if (error.code === 400) {
      throw new Error(`Invalid AAB file: ${error.message}`);
    }
    throw new Error(`Failed to upload AAB: ${error.message}`);
  }
}

/**
 * Upload APK to Play Console
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} apkPath - Path to APK file
 * @returns {Promise<Object>} Upload result with version info
 */
export async function uploadAPK(packageName, editId, apkPath) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n📦 Uploading APK: ${apkPath}`);

  try {
    // Read APK file
    const apkFile = await readFile(apkPath);

    // Upload APK
    const response = await androidpublisher.edits.apks.upload({
      packageName: packageName,
      editId: editId,
      media: {
        mimeType: 'application/vnd.android.package-archive',
        body: apkFile
      }
    });

    const versionCode = response.data.versionCode;

    console.log(`   ✅ APK uploaded successfully`);
    console.log(`   Version Code: ${versionCode}`);

    return {
      versionCode: versionCode,
      sha1: response.data.sha1,
      sha256: response.data.sha256
    };
  } catch (error) {
    if (error.code === 400) {
      throw new Error(`Invalid APK file: ${error.message}`);
    }
    throw new Error(`Failed to upload APK: ${error.message}`);
  }
}

/**
 * Upload AAB or APK (auto-detect file type)
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} filePath - Path to AAB or APK file
 * @returns {Promise<Object>} Upload result
 */
export async function uploadBuild(packageName, editId, filePath) {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.aab') {
    return await uploadAAB(packageName, editId, filePath);
  } else if (ext === '.apk') {
    return await uploadAPK(packageName, editId, filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Expected .aab or .apk`);
  }
}

/**
 * Upload build and create edit session if needed
 * IMPORTANT: If app doesn't exist yet, uploading the first AAB/APK will
 * automatically create the app in Play Console.
 * 
 * @param {string} packageName - Android package name
 * @param {string} filePath - Path to AAB or APK file
 * @returns {Promise<Object>} Upload result with editId
 */
export async function uploadBuildWithEdit(packageName, filePath) {
  // Try to get existing edit, or create new one
  let editId = await getExistingEdit(packageName);
  
  if (!editId) {
    try {
      editId = await createEdit(packageName);
    } catch (error) {
      // If edit creation fails with 404, app doesn't exist yet
      // That's OK - uploading the build will create the app automatically
      if (error.code === 404 || error.message.includes('not found')) {
        console.log(`   ℹ️  App doesn't exist yet - will be created automatically on upload`);
        // Try to create edit anyway - sometimes it works even if app doesn't exist
        // If it fails, the upload will handle it
        try {
          editId = await createEdit(packageName);
        } catch (retryError) {
          // If still fails, we'll try upload which might create the app
          console.log(`   ⚠️  Could not create edit session - upload may create the app`);
        }
      } else {
        throw error;
      }
    }
  }

  // Upload build - this will create the app if it doesn't exist
  const uploadResult = await uploadBuild(packageName, editId, filePath);

  return {
    ...uploadResult,
    editId: editId
  };
}

