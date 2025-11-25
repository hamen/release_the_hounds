/**
 * Play Store app creation and management
 */

import { getPlayStoreClient } from './auth.js';
import { createEdit, commitEdit } from './edits.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { PATHS } from '../config.js';

/**
 * Create a new app in Play Console
 * Note: App creation requires an edit session and commit
 * @param {string} packageName - Android package name
 * @param {string} title - App title
 * @param {string} defaultLanguage - Default language code (e.g., 'en-US')
 * @returns {Promise<Object>} App details
 */
/**
 * Check if Play Store app exists
 * Note: Apps are created automatically when first AAB/APK is uploaded
 * This function checks if app exists by trying to create an edit session
 * @param {string} packageName - Android package name
 * @returns {Promise<boolean>} True if app exists
 */
export async function checkPlayStoreAppExists(packageName) {
  try {
    // Try to create an edit - if this succeeds, app exists
    const editId = await createEdit(packageName);
    return true;
  } catch (error) {
    if (error.code === 404 || error.message.includes('not found') || error.message.includes('does not exist')) {
      return false;
    }
    // Other errors might mean app exists but there's a different issue
    // Re-throw to let caller handle
    throw error;
  }
}

/**
 * Create a new app in Play Console
 * IMPORTANT: Play Console API does NOT have a direct "create app" endpoint.
 * Apps are created automatically when you upload your first AAB/APK.
 * This function checks if app exists and provides guidance.
 * 
 * @param {string} packageName - Android package name
 * @param {string} title - App title
 * @param {string} defaultLanguage - Default language code (e.g., 'en-US')
 * @returns {Promise<Object>} App details
 */
export async function createPlayStoreApp(packageName, title, defaultLanguage = 'en-US') {
  console.log(`\n📱 Checking Play Store app: ${packageName}`);
  console.log(`   Title: ${title}`);
  console.log(`   Language: ${defaultLanguage}`);

  try {
    // Check if app already exists
    const exists = await checkPlayStoreAppExists(packageName);
    
    if (exists) {
      console.log(`   ✅ App already exists in Play Console`);
      const appDetails = await getPlayStoreApp(packageName);
      return appDetails;
    }

    // App doesn't exist yet
    console.log(`   ℹ️  App does not exist yet in Play Console`);
    console.log(`   📝 Note: App will be created automatically when you upload your first AAB/APK`);
    console.log(`   💡 The upload step will create the app, then we'll set metadata`);
    
    // Return a placeholder - app will be created during upload
    return {
      packageName: packageName,
      title: title,
      defaultLanguage: defaultLanguage,
      exists: false,
      willBeCreated: true
    };
  } catch (error) {
    // If we can't determine existence, provide helpful error
    if (error.code === 403 || error.message.includes('permission')) {
      throw new Error(
        `Service account does not have Play Console access.\n` +
        `Please grant access:\n` +
        `1. Go to Play Console → Settings → Users & Permissions\n` +
        `2. Add service account email (check .autopublish/state.json)\n` +
        `3. Grant "Admin" or "Release" permissions\n`
      );
    }
    throw new Error(`Failed to check Play Store app: ${error.message}`);
  }
}

/**
 * Get Play Store app details
 * @param {string} packageName - Android package name
 * @returns {Promise<Object|null>} App details or null if not found
 */
export async function getPlayStoreApp(packageName) {
  const androidpublisher = await getPlayStoreClient();

  try {
    // Try to get app details
    // Note: There's no direct "get app" endpoint, so we try to create an edit
    // If edit creation succeeds, app exists
    const editId = await createEdit(packageName);
    
    // Get listing to verify app exists
    const listing = await androidpublisher.edits.listings.get({
      packageName: packageName,
      editId: editId,
      language: 'en-US'
    });

    return {
      packageName: packageName,
      title: listing.data?.title || packageName,
      exists: true
    };
  } catch (error) {
    if (error.code === 404 || error.message.includes('not found')) {
      return null;
    }
    // If we can create an edit, app exists
    return { packageName: packageName, exists: true };
  }
}

/**
 * Save Play Store app state
 */
async function savePlayStoreAppState(packageName, appData) {
  const state = await readJsonFile(PATHS.STATE_FILE) || {};
  
  if (!state.playStore) {
    state.playStore = {};
  }
  if (!state.playStore.apps) {
    state.playStore.apps = {};
  }

  state.playStore.apps[packageName] = {
    ...appData,
    createdAt: new Date().toISOString()
  };

  await writeJsonFile(PATHS.STATE_FILE, state);
}

/**
 * Load Play Store app state
 */
export async function loadPlayStoreAppState(packageName) {
  const state = await readJsonFile(PATHS.STATE_FILE);
  return state?.playStore?.apps?.[packageName] || null;
}

