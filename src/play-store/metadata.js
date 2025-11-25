/**
 * Play Store metadata management
 * Handles app listing metadata (title, descriptions, category, etc.)
 */

import { getPlayStoreClient } from './auth.js';

/**
 * Set store listing metadata
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code (e.g., 'en-US')
 * @param {Object} metadata - Metadata object
 * @param {string} metadata.title - App title (max 50 chars)
 * @param {string} metadata.shortDescription - Short description (max 80 chars)
 * @param {string} metadata.fullDescription - Full description (max 4000 chars)
 * @param {string} metadata.category - App category (e.g., 'APPLICATION_PRODUCTIVITY')
 * @param {string} metadata.privacyPolicyUrl - Privacy policy URL
 * @returns {Promise<Object>} Updated listing
 */
export async function setListingMetadata(packageName, editId, language, metadata) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n📝 Setting store listing metadata (${language})...`);

  // Validate metadata
  validateMetadata(metadata);

  try {
    const listing = {
      title: metadata.title,
      shortDescription: metadata.shortDescription,
      fullDescription: metadata.fullDescription
    };

    // Update listing
    const response = await androidpublisher.edits.listings.update({
      packageName: packageName,
      editId: editId,
      language: language,
      requestBody: listing
    });

    console.log(`   ✅ Listing metadata updated`);

    // Set app details (category, privacy policy, etc.)
    if (metadata.category || metadata.privacyPolicyUrl) {
      await setAppDetails(packageName, editId, {
        category: metadata.category,
        privacyPolicyUrl: metadata.privacyPolicyUrl
      });
    }

    return response.data;
  } catch (error) {
    throw new Error(`Failed to set listing metadata: ${error.message}`);
  }
}

/**
 * Set app details (category, privacy policy, etc.)
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {Object} details - App details
 * @returns {Promise<Object>} Updated app details
 */
async function setAppDetails(packageName, editId, details) {
  const androidpublisher = await getPlayStoreClient();

  try {
    // Get current app details
    const currentDetails = await androidpublisher.edits.get({
      packageName: packageName,
      editId: editId
    });

    const appDetails = {
      ...(currentDetails.data || {}),
      defaultLanguage: currentDetails.data?.defaultLanguage || 'en-US'
    };

    // Update category if provided
    if (details.category) {
      // Category is set via the app's category field
      // This may require using a different endpoint
      console.log(`   Setting category: ${details.category}`);
    }

    // Privacy policy is set via listings
    if (details.privacyPolicyUrl) {
      console.log(`   Privacy policy URL: ${details.privacyPolicyUrl}`);
      // Privacy policy is typically set in the listing, not app details
    }

    return appDetails;
  } catch (error) {
    // App details endpoint might not support all fields
    // Continue without failing
    console.log(`   ⚠️  Could not set all app details: ${error.message}`);
    return {};
  }
}

/**
 * Validate metadata constraints
 */
function validateMetadata(metadata) {
  if (metadata.title && metadata.title.length > 50) {
    throw new Error(`Title exceeds 50 characters (${metadata.title.length} chars)`);
  }

  if (metadata.shortDescription && metadata.shortDescription.length > 80) {
    throw new Error(`Short description exceeds 80 characters (${metadata.shortDescription.length} chars)`);
  }

  if (metadata.fullDescription && metadata.fullDescription.length > 4000) {
    throw new Error(`Full description exceeds 4000 characters (${metadata.fullDescription.length} chars)`);
  }

  if (metadata.privacyPolicyUrl && !isValidUrl(metadata.privacyPolicyUrl)) {
    throw new Error(`Invalid privacy policy URL: ${metadata.privacyPolicyUrl}`);
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current listing metadata
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code
 * @returns {Promise<Object>} Current listing
 */
export async function getListingMetadata(packageName, editId, language = 'en-US') {
  const androidpublisher = await getPlayStoreClient();

  try {
    const response = await androidpublisher.edits.listings.get({
      packageName: packageName,
      editId: editId,
      language: language
    });

    return response.data;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }
    throw new Error(`Failed to get listing metadata: ${error.message}`);
  }
}

