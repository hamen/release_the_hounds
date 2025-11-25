/**
 * Play Store graphics management
 * Handles screenshot, icon, and feature graphic uploads
 */

import { getPlayStoreClient } from './auth.js';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileExists } from '../utils/fs.js';

/**
 * Upload screenshots for a specific device type
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code (e.g., 'en-US')
 * @param {string} imageType - Image type ('phoneScreenshots', 'sevenInchScreenshots', 'tenInchScreenshots', 'tvScreenshots', 'wearScreenshots')
 * @param {Array<string>} screenshotPaths - Array of screenshot file paths
 * @returns {Promise<Object>} Upload result
 */
export async function uploadScreenshots(packageName, editId, language, imageType, screenshotPaths) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n📸 Uploading ${imageType} screenshots (${screenshotPaths.length} images)...`);

  try {
    const uploadPromises = screenshotPaths.map(async (screenshotPath, index) => {
      const imageData = await readFile(screenshotPath);
      
      await androidpublisher.edits.images.upload({
        packageName: packageName,
        editId: editId,
        language: language,
        imageType: imageType,
        media: {
          mimeType: getImageMimeType(screenshotPath),
          body: imageData
        }
      });

      console.log(`   ✅ Uploaded ${index + 1}/${screenshotPaths.length}: ${screenshotPath}`);
    });

    await Promise.all(uploadPromises);

    console.log(`   ✅ All ${screenshotPaths.length} screenshots uploaded`);
    return { uploaded: screenshotPaths.length };
  } catch (error) {
    throw new Error(`Failed to upload screenshots: ${error.message}`);
  }
}

/**
 * Upload all screenshots from directory
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code
 * @param {string} screenshotsDir - Base directory for screenshots
 * @returns {Promise<Object>} Upload summary
 */
export async function uploadScreenshotsFromDirectory(packageName, editId, language, screenshotsDir) {
  console.log(`\n📸 Uploading screenshots from: ${screenshotsDir}`);

  const summary = {
    phone: 0,
    tablet: 0,
    tablet10: 0,
    tv: 0,
    wear: 0
  };

  // Check if directory exists
  if (!(await fileExists(screenshotsDir))) {
    console.log(`   ⚠️  Screenshots directory not found: ${screenshotsDir}`);
    return summary;
  }

  // Try to read subdirectories
  const subdirs = ['phone', 'tablet', 'tablet-10', 'tv', 'wear'];
  const imageTypes = {
    'phone': 'phoneScreenshots',
    'tablet': 'sevenInchScreenshots',
    'tablet-10': 'tenInchScreenshots',
    'tv': 'tvScreenshots',
    'wear': 'wearScreenshots'
  };

  for (const subdir of subdirs) {
    const subdirPath = join(screenshotsDir, subdir);
    
    if (await fileExists(subdirPath)) {
      const files = await readdir(subdirPath);
      const imageFiles = files.filter(file => 
        ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase())
      );

      if (imageFiles.length > 0) {
        const screenshotPaths = imageFiles.map(file => join(subdirPath, file));
        await uploadScreenshots(
          packageName,
          editId,
          language,
          imageTypes[subdir],
          screenshotPaths
        );
        summary[subdir.replace('-', '')] = imageFiles.length;
      }
    }
  }

  // If no subdirectories, try to detect device type from root directory
  if (summary.phone === 0 && summary.tablet === 0) {
    const files = await readdir(screenshotsDir);
    const imageFiles = files.filter(file => 
      ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase())
    );

    if (imageFiles.length > 0) {
      // Default to phone screenshots if no subdirectories
      const screenshotPaths = imageFiles.map(file => join(screenshotsDir, file));
      await uploadScreenshots(
        packageName,
        editId,
        language,
        'phoneScreenshots',
        screenshotPaths
      );
      summary.phone = imageFiles.length;
    }
  }

  return summary;
}

/**
 * Upload app icon
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code
 * @param {string} iconPath - Path to icon file (512x512px)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadAppIcon(packageName, editId, language, iconPath) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n🖼️  Uploading app icon: ${iconPath}`);

  try {
    const imageData = await readFile(iconPath);

    await androidpublisher.edits.images.upload({
      packageName: packageName,
      editId: editId,
      language: language,
      imageType: 'icon',
      media: {
        mimeType: getImageMimeType(iconPath),
        body: imageData
      }
    });

    console.log(`   ✅ App icon uploaded`);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to upload app icon: ${error.message}`);
  }
}

/**
 * Upload feature graphic
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {string} language - Language code
 * @param {string} graphicPath - Path to feature graphic file (1024x500px)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFeatureGraphic(packageName, editId, language, graphicPath) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n🖼️  Uploading feature graphic: ${graphicPath}`);

  try {
    const imageData = await readFile(graphicPath);

    await androidpublisher.edits.images.upload({
      packageName: packageName,
      editId: editId,
      language: language,
      imageType: 'featureGraphic',
      media: {
        mimeType: getImageMimeType(graphicPath),
        body: imageData
      }
    });

    console.log(`   ✅ Feature graphic uploaded`);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to upload feature graphic: ${error.message}`);
  }
}

/**
 * Get MIME type from file extension
 */
function getImageMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };
  return mimeTypes[ext] || 'image/png';
}

