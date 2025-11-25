/**
 * Play Store config template generator
 * Generates play-store-config.json with pre-filled values from Firebase
 */

import { loadFirebaseProjectState } from '../firebase/project.js';
import { loadProjectState } from '../gcp/project.js';
import { listAndroidApps } from '../firebase/project.js';
import { writeJsonFile, fileExists } from '../utils/fs.js';
import { getDefaultConfigPath } from './config-loader.js';
import { join } from 'path';

/**
 * Generate Play Store config template
 * Pre-fills values from Firebase Android app if available
 * @param {string} outputPath - Path to write config file (defaults to play-store-config.json)
 * @returns {Promise<string>} Path to generated config file
 */
export async function generatePlayStoreConfigTemplate(outputPath = null, force = false) {
  const configPath = outputPath || getDefaultConfigPath();

  // Check if config already exists (unless force is true)
  if (!force && await fileExists(configPath)) {
    throw new Error(`Config file already exists: ${configPath}\nUse --force to overwrite`);
  }

  console.log(`\n📝 Generating Play Store config template...`);

  // Load Firebase and GCP project state
  const firebaseState = await loadFirebaseProjectState();
  const projectState = await loadProjectState();

  let packageName = null;
  let appDisplayName = null;

  // Try to get Android app info from Firebase
  if (firebaseState && projectState) {
    console.log(`   🔍 Looking for Android apps in Firebase project...`);
    
    try {
      const androidApps = await listAndroidApps(firebaseState.projectId);
      
      if (androidApps && androidApps.length > 0) {
        // Use first Android app
        const androidApp = androidApps[0];
        packageName = androidApp.packageName;
        appDisplayName = androidApp.displayName;
        
        console.log(`   ✅ Found Android app: ${appDisplayName}`);
        console.log(`   Package: ${packageName}`);
      } else {
        console.log(`   ℹ️  No Android apps found in Firebase project`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not list Android apps: ${error.message}`);
    }
  } else {
    if (!firebaseState) {
      console.log(`   ⚠️  No Firebase project found. Run 'setup-firebase' first.`);
    }
    if (!projectState) {
      console.log(`   ⚠️  No GCP project found. Run 'create-project' first.`);
    }
  }

  // Generate config template
  const config = {
    packageName: packageName || "com.example.app",
    build: {
      aab: "./android/app/build/outputs/bundle/release/app-release.aab",
      apk: null
    },
    metadata: {
      title: appDisplayName || "My Awesome App",
      shortDescription: "Short description (max 80 characters)",
      fullDescription: "Full description with details about your app. This can be up to 4000 characters and should describe what your app does, its features, and any important information users should know.",
      category: "APPLICATION_PRODUCTIVITY",
      privacyPolicyUrl: "https://example.com/privacy"
    },
    graphics: {
      screenshotsDir: "./screenshots/android",
      icon: null,
      featureGraphic: null
    },
    contentRating: {
      isFinancialApp: false,
      isHealthApp: false,
      isGamblingApp: false,
      targetAgeGroup: "EVERYONE",
      containsViolence: false,
      containsSexualContent: false,
      containsDrugs: false,
      dataSafety: {
        collectsPersonalData: false,
        sharesPersonalData: false,
        collectsLocation: false
      }
    },
    distribution: {
      track: "internal",
      pricing: {
        free: true
      },
      countries: "all"
    }
  };

  // Write config file
  await writeJsonFile(configPath, config);

  console.log(`\n✅ Config template generated: ${configPath}`);
  console.log(`\n📋 Pre-filled values:`);
  if (packageName) {
    console.log(`   ✅ Package name: ${packageName}`);
  } else {
    console.log(`   ⚠️  Package name: (please fill in)`);
  }
  if (appDisplayName) {
    console.log(`   ✅ App title: ${appDisplayName}`);
  } else {
    console.log(`   ⚠️  App title: (please fill in)`);
  }
  
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Edit ${configPath}`);
  console.log(`   2. Fill in metadata (descriptions, category, privacy policy)`);
  console.log(`   3. Update build path if different`);
  console.log(`   4. Add screenshots to screenshots/android/`);
  console.log(`   5. Answer content rating questions`);
  console.log(`   6. Run: ./release-the-hounds.sh publish-play-store\n`);

  return configPath;
}

