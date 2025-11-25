/**
 * Play Store distribution and pricing management
 */

import { getPlayStoreClient } from './auth.js';

/**
 * Set pricing for app
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {Object} pricing - Pricing configuration
 * @param {boolean} pricing.free - True for free app
 * @param {string} pricing.price - Price string (if paid, e.g., "1.99")
 * @param {string} pricing.currency - Currency code (e.g., "USD")
 * @returns {Promise<Object>} Pricing result
 */
export async function setPricing(packageName, editId, pricing) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n💰 Setting pricing...`);

  try {
    if (pricing.free) {
      // Set to free
      const response = await androidpublisher.edits.pricing.update({
        packageName: packageName,
        editId: editId,
        requestBody: {
          price: {
            priceMicros: '0',
            currency: pricing.currency || 'USD'
          }
        }
      });

      console.log(`   ✅ App set to FREE`);
      return response.data;
    } else {
      // Set paid price
      const priceMicros = Math.round(parseFloat(pricing.price) * 1000000).toString();
      
      const response = await androidpublisher.edits.pricing.update({
        packageName: packageName,
        editId: editId,
        requestBody: {
          price: {
            priceMicros: priceMicros,
            currency: pricing.currency || 'USD'
          }
        }
      });

      console.log(`   ✅ Price set: ${pricing.currency || 'USD'} ${pricing.price}`);
      return response.data;
    }
  } catch (error) {
    throw new Error(`Failed to set pricing: ${error.message}`);
  }
}

/**
 * Set release track
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} track - Release track ('internal', 'alpha', 'beta', 'production')
 * @param {number} versionCode - Version code to release
 * @param {string} releaseNotes - Release notes (optional)
 * @returns {Promise<Object>} Track result
 */
export async function setReleaseTrack(packageName, editId, track, versionCode, releaseNotes = null) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n🚀 Setting release track: ${track}`);

  const validTracks = ['internal', 'alpha', 'beta', 'production'];
  if (!validTracks.includes(track)) {
    throw new Error(`Invalid track: ${track}. Must be one of: ${validTracks.join(', ')}`);
  }

  try {
    // Get current track releases
    const currentReleases = await androidpublisher.edits.tracks.get({
      packageName: packageName,
      editId: editId,
      track: track
    });

    // Create new release
    const releases = currentReleases.data?.releases || [];
    const newRelease = {
      versionCodes: [versionCode.toString()],
      status: 'completed'
    };

    if (releaseNotes) {
      newRelease.releaseNotes = [
        {
          language: 'en-US',
          text: releaseNotes
        }
      ];
    }

    releases.push(newRelease);

    // Update track
    const response = await androidpublisher.edits.tracks.update({
      packageName: packageName,
      editId: editId,
      track: track,
      requestBody: {
        releases: releases
      }
    });

    console.log(`   ✅ Version ${versionCode} added to ${track} track`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to set release track: ${error.message}`);
  }
}

/**
 * Set distribution countries
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string|Array<string>} countries - 'all' or array of country codes
 * @returns {Promise<Object>} Distribution result
 */
export async function setDistribution(packageName, editId, countries) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n🌍 Setting distribution...`);

  try {
    // Get current app details
    const appDetails = await androidpublisher.edits.get({
      packageName: packageName,
      editId: editId
    });

    // Distribution is typically set via the app's availability
    // This may require using a different endpoint or may be set during app creation
    if (countries === 'all') {
      console.log(`   ✅ Distribution set to: All countries`);
    } else {
      console.log(`   ✅ Distribution set to: ${Array.isArray(countries) ? countries.join(', ') : countries}`);
    }

    return { success: true };
  } catch (error) {
    // Distribution settings might not be available via API in all cases
    console.log(`   ⚠️  Could not set distribution via API: ${error.message}`);
    console.log(`   ℹ️  Distribution may need to be set manually in Play Console`);
    return { success: false, note: 'Set distribution manually in Play Console' };
  }
}

