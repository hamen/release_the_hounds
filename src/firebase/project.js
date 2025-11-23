/**
 * Firebase project management module
 * Handles Firebase project creation, linking, and app registration
 */

import { google } from 'googleapis';
import { getAuthenticatedClient } from '../auth/gcloud-auth.js';
import { loadProjectState, switchProject } from '../gcp/project.js';
import { writeJsonFile, readJsonFile, ensureDir } from '../utils/fs.js';
import { selectOption, confirm, question } from '../utils/prompt.js';
import { PATHS } from '../config.js';

/**
 * List all Firebase projects the user has access to
 * @returns {Promise<Array>} List of Firebase projects
 */
export async function listFirebaseProjects() {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  try {
    const response = await fetch(`${firebaseAPI}/projects`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to list Firebase projects (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    // Firebase API returns projects in different formats, handle both
    if (data.projects) {
      return data.projects;
    }
    if (data.results) {
      return data.results;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    throw new Error(`Failed to list Firebase projects: ${error.message}`);
  }
}

/**
 * Check if Firebase project exists for a GCP project
 * @param {string} projectId - GCP project ID
 * @returns {Promise<Object|null>} Firebase project details or null if not found
 */
export async function getFirebaseProject(projectId) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  try {
    const response = await fetch(`${firebaseAPI}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get Firebase project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create or link Firebase project to GCP project
 * @param {string} projectId - GCP project ID
 * @param {string} displayName - Firebase project display name
 * @param {boolean} interactive - Show interactive project picker if no Firebase project exists
 * @returns {Promise<Object>} Firebase project details
 */
export async function createOrLinkFirebaseProject(projectId, displayName, interactive = false) {
  const authClient = await getAuthenticatedClient();

  console.log(`\n🔥 Setting up Firebase project...`);
  console.log(`   GCP Project: ${projectId}`);
  console.log(`   Display name: ${displayName}`);

  // Firebase Management API endpoint
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  try {
    // First check if we have saved Firebase state for this project
    const savedFirebaseState = await loadFirebaseProjectState();
    if (savedFirebaseState && savedFirebaseState.projectId === projectId) {
      console.log(`   ✅ Using saved Firebase project: ${savedFirebaseState.displayName || savedFirebaseState.projectId}`);
      return savedFirebaseState;
    }

    // Get access token
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    // Try to get existing Firebase project for this GCP project
    const existingFirebaseProject = await getFirebaseProject(projectId);

    if (existingFirebaseProject) {
      console.log(`   ✅ Firebase project already exists`);
      console.log(`   Project ID: ${existingFirebaseProject.projectId}`);
      console.log(`   Display name: ${existingFirebaseProject.displayName || 'N/A'}`);

      // Save Firebase project state
      await saveFirebaseProjectState(projectId, existingFirebaseProject);

      return existingFirebaseProject;
    }

    // No Firebase project exists for this GCP project
    // If interactive mode, show project picker
    if (interactive) {
      console.log(`\n   ℹ️  No Firebase project found for this GCP project.`);
      console.log(`   Listing your existing Firebase projects...\n`);

      try {
        const firebaseProjects = await listFirebaseProjects();

        if (firebaseProjects.length > 0) {
          console.log(`   Found ${firebaseProjects.length} Firebase project(s):\n`);

          const options = firebaseProjects.map(proj => ({
            value: proj.projectId,
            label: `${proj.displayName || proj.projectId} (GCP: ${proj.projectId})`
          }));

          // Add option to create new
          options.push({
            value: '__CREATE_NEW__',
            label: 'Create a new Firebase project for this GCP project'
          });

          const selected = await selectOption(
            options,
            'Select a Firebase project to use:'
          );

          if (selected === '__CREATE_NEW__') {
            // Create new Firebase project
            return await createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI);
          } else {
            // User selected an existing Firebase project
            const selectedProject = firebaseProjects.find(p => p.projectId === selected);

            if (selectedProject.projectId !== projectId) {
              console.log(`\n   ⚠️  Important: Firebase project "${selectedProject.displayName}"`);
              console.log(`      is linked to GCP project "${selectedProject.projectId}"`);
              console.log(`      You cannot link it to a different GCP project.`);
              console.log(`\n   Options:`);
              console.log(`   1. Use GCP project "${selectedProject.projectId}" instead`);
              console.log(`   2. Create a new Firebase project for "${projectId}"`);

              const useDifferentGcp = await confirm(
                `   Use GCP project "${selectedProject.projectId}" instead?`,
                false
              );

              if (useDifferentGcp) {
                console.log(`\n   ✅ Using Firebase project: ${selectedProject.displayName}`);
                console.log(`   🔄 Switching to GCP project "${selectedProject.projectId}"...`);

                // Switch to the GCP project that this Firebase project is linked to
                try {
                  const gcpProject = await switchProject(selectedProject.projectId);
                  console.log(`   ✅ Switched to GCP project: ${gcpProject.projectId}`);
                  console.log(`   Project Number: ${gcpProject.projectNumber}`);
                } catch (error) {
                  console.log(`   ⚠️  Could not switch GCP project: ${error.message}`);
                  console.log(`   Continuing with Firebase project selection...`);
                }

                await saveFirebaseProjectState(selectedProject.projectId, selectedProject);
                return selectedProject;
              } else {
                // Create new
                return await createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI);
              }
            } else {
              // Same project ID - this shouldn't happen, but handle it
              await saveFirebaseProjectState(projectId, selectedProject);
              return selectedProject;
            }
          }
        } else {
          console.log(`   No existing Firebase projects found. Creating new one...\n`);
          return await createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not list Firebase projects: ${error.message}`);
        console.log(`   Creating new Firebase project...\n`);
        return await createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI);
      }
    } else {
      // Non-interactive: just create new
      return await createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI);
    }
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('409')) {
      // Firebase project might already be linked
      console.log(`   ℹ️  Firebase project may already be linked to this GCP project`);
      return await getFirebaseProject(projectId);
    }
    throw new Error(`Failed to setup Firebase project: ${error.message}`);
  }
}

/**
 * Create a new Firebase project (add Firebase to existing GCP project)
 */
async function createNewFirebaseProject(projectId, displayName, accessToken, firebaseAPI) {
  console.log(`   Adding Firebase to GCP project...`);

  // First, try to add Firebase to the GCP project
  // Firebase projects are GCP projects with Firebase enabled
  const addFirebaseResponse = await fetch(`${firebaseAPI}/projects/${projectId}:addFirebase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  // If addFirebase doesn't work, try creating directly
  if (!addFirebaseResponse.ok && addFirebaseResponse.status !== 409) {
    // Try the direct project creation endpoint
    const createResponse = await fetch(`${firebaseAPI}/projects/${projectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: displayName
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({ error: { message: createResponse.statusText } }));
      const errorMessage = errorData.error?.message || createResponse.statusText;

      // If it's a 404, Firebase API might not be fully enabled yet
      if (createResponse.status === 404) {
        throw new Error(`Firebase API not available. Please ensure Firebase API is enabled and try again.`);
      }

      throw new Error(`Failed to create Firebase project: ${errorMessage}`);
    }

    const firebaseProject = await createResponse.json();

    // Wait for Firebase project to be ready
    console.log(`   ⏳ Waiting for Firebase project to be ready...`);
    await waitForFirebaseProjectReady(projectId, accessToken);

    console.log(`   ✅ Firebase project created successfully!`);
    console.log(`   Project ID: ${firebaseProject.projectId}`);

    // Save Firebase project state
    await saveFirebaseProjectState(projectId, firebaseProject);

    return firebaseProject;
  }

  // If addFirebase worked or returned 409 (already exists), get the project
  if (addFirebaseResponse.status === 409) {
    console.log(`   ℹ️  Firebase already added to this project`);
  } else if (!addFirebaseResponse.ok) {
    const errorData = await addFirebaseResponse.json().catch(() => ({ error: { message: addFirebaseResponse.statusText } }));
    throw new Error(`Failed to add Firebase: ${errorData.error?.message || addFirebaseResponse.statusText}`);
  }

  // Wait a bit for Firebase to be ready, then fetch the project
  console.log(`   ⏳ Waiting for Firebase to be ready...`);
  await waitForFirebaseProjectReady(projectId, accessToken);

  // Get the Firebase project details
  const getResponse = await fetch(`${firebaseAPI}/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to get Firebase project after creation: ${getResponse.statusText}`);
  }

  const firebaseProject = await getResponse.json();

  console.log(`   ✅ Firebase project ready!`);
  console.log(`   Project ID: ${firebaseProject.projectId}`);

  // Save Firebase project state
  await saveFirebaseProjectState(projectId, firebaseProject);

  return firebaseProject;
}

/**
 * Wait for Firebase project to be ready
 */
async function waitForFirebaseProjectReady(projectId, accessToken, maxAttempts = 30) {
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      const response = await fetch(`${firebaseAPI}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const project = await response.json();
        if (project.state === 'ACTIVE') {
          return true;
        }
      }
    } catch (error) {
      // Continue polling
    }

    process.stdout.write('.');
  }

  console.log(''); // New line after dots
  // Timeout - project might still be activating, but continue anyway
  return true;
}

/**
 * List all Android apps in a Firebase project
 * @param {string} projectId - Firebase/GCP project ID
 * @returns {Promise<Array>} List of Android apps
 */
export async function listAndroidApps(projectId) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  try {
    const response = await fetch(`${firebaseAPI}/projects/${projectId}/androidApps`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Handle 404 - Firebase might not be initialized or no apps exist
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to list Android apps (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.apps || [];
  } catch (error) {
    // If it's a network error or 404, return empty array instead of throwing
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return [];
    }
    throw new Error(`Failed to list Android apps: ${error.message}`);
  }
}

/**
 * List all iOS apps in a Firebase project
 * @param {string} projectId - Firebase/GCP project ID
 * @returns {Promise<Array>} List of iOS apps
 */
export async function listIOSApps(projectId) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  try {
    const response = await fetch(`${firebaseAPI}/projects/${projectId}/iosApps`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Handle 404 - Firebase might not be initialized or no apps exist
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to list iOS apps (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.apps || [];
  } catch (error) {
    // If it's a network error or 404, return empty array instead of throwing
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return [];
    }
    throw new Error(`Failed to list iOS apps: ${error.message}`);
  }
}

/**
 * Add Android app to Firebase project
 * @param {string} projectId - Firebase/GCP project ID
 * @param {string} packageName - Android package name (e.g., com.example.app)
 * @param {string} displayName - App display name
 * @param {string} sha1Fingerprint - SHA-1 fingerprint (optional)
 * @returns {Promise<Object>} Android app details
 */
export async function addAndroidApp(projectId, packageName, displayName, sha1Fingerprint = null) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  console.log(`\n📱 Adding Android app to Firebase...`);
  console.log(`   Package name: ${packageName}`);
  console.log(`   Display name: ${displayName}`);

  try {
    const requestBody = {
      packageName: packageName,
      displayName: displayName
    };

    if (sha1Fingerprint) {
      requestBody.sha1Fingerprint = sha1Fingerprint;
    }

    const response = await fetch(`${firebaseAPI}/projects/${projectId}/androidApps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.message?.includes('already exists')) {
        console.log(`   ⚠️  Android app already exists, fetching details...`);
        // Try to get existing app
        const getResponse = await fetch(`${firebaseAPI}/projects/${projectId}/androidApps?packageName=${packageName}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (getResponse.ok) {
          const apps = await getResponse.json();
          const existingApp = apps.apps?.find(app => app.packageName === packageName);
          if (existingApp) {
            console.log(`   ✅ Using existing Android app`);
            return existingApp;
          }
        }
      }
      throw new Error(`Failed to add Android app: ${error.error?.message || response.statusText}`);
    }

    const androidApp = await response.json();
    console.log(`   ✅ Android app added successfully!`);
    console.log(`   App ID: ${androidApp.appId}`);

    return androidApp;
  } catch (error) {
    throw new Error(`Failed to add Android app: ${error.message}`);
  }
}

/**
 * Download google-services.json for Android app
 * @param {string} projectId - Firebase project ID
 * @param {string} appId - Android app ID
 * @param {string} outputPath - Optional output path (defaults to current directory)
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadGoogleServicesJson(projectId, appId, outputPath = null) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  console.log(`\n📥 Downloading google-services.json...`);

  try {
    // Get Android app config
    const response = await fetch(`${firebaseAPI}/projects/${projectId}/androidApps/${appId}/config`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get Android app config: ${response.statusText}`);
    }

    const config = await response.json();

    // Save to file (use provided path or default to Firebase config directory)
    if (!outputPath) {
      await ensureDir(PATHS.FIREBASE_CONFIG_DIR);
      outputPath = `${PATHS.FIREBASE_CONFIG_DIR}/google-services.json`;
    }
    await writeJsonFile(outputPath, config.configFileContents);

    console.log(`   ✅ Downloaded: ${filePath}`);

    return filePath;
  } catch (error) {
    throw new Error(`Failed to download google-services.json: ${error.message}`);
  }
}

/**
 * Add iOS app to Firebase project
 * @param {string} projectId - Firebase/GCP project ID
 * @param {string} bundleId - iOS bundle ID (e.g., com.example.app)
 * @param {string} displayName - App display name
 * @returns {Promise<Object>} iOS app details
 */
export async function addIOSApp(projectId, bundleId, displayName) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  console.log(`\n🍎 Adding iOS app to Firebase...`);
  console.log(`   Bundle ID: ${bundleId}`);
  console.log(`   Display name: ${displayName}`);

  try {
    const response = await fetch(`${firebaseAPI}/projects/${projectId}/iosApps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bundleId: bundleId,
        displayName: displayName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.message?.includes('already exists')) {
        console.log(`   ⚠️  iOS app already exists, fetching details...`);
        // Try to get existing app
        const getResponse = await fetch(`${firebaseAPI}/projects/${projectId}/iosApps?bundleId=${bundleId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (getResponse.ok) {
          const apps = await getResponse.json();
          const existingApp = apps.apps?.find(app => app.bundleId === bundleId);
          if (existingApp) {
            console.log(`   ✅ Using existing iOS app`);
            return existingApp;
          }
        }
      }
      throw new Error(`Failed to add iOS app: ${error.error?.message || response.statusText}`);
    }

    const iosApp = await response.json();
    console.log(`   ✅ iOS app added successfully!`);
    console.log(`   App ID: ${iosApp.appId}`);

    return iosApp;
  } catch (error) {
    throw new Error(`Failed to add iOS app: ${error.message}`);
  }
}

/**
 * Download GoogleService-Info.plist for iOS app
 * @param {string} projectId - Firebase project ID
 * @param {string} appId - iOS app ID
 * @param {string} outputPath - Optional output path (defaults to current directory)
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadGoogleServiceInfoPlist(projectId, appId, outputPath = null) {
  const authClient = await getAuthenticatedClient();
  const tokenResponse = await authClient.getAccessToken();
  const accessToken = tokenResponse.token;
  const firebaseAPI = 'https://firebase.googleapis.com/v1beta1';

  console.log(`\n📥 Downloading GoogleService-Info.plist...`);

  try {
    // Get iOS app config
    const response = await fetch(`${firebaseAPI}/projects/${projectId}/iosApps/${appId}/config`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get iOS app config: ${response.statusText}`);
    }

    const config = await response.json();

    // Save to file (plist is XML format, but API returns JSON with configFileContents)
    if (!outputPath) {
      await ensureDir(PATHS.FIREBASE_CONFIG_DIR);
      outputPath = `${PATHS.FIREBASE_CONFIG_DIR}/GoogleService-Info.plist`;
    }
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, config.configFileContents, 'utf-8');

    console.log(`   ✅ Downloaded: ${filePath}`);

    return filePath;
  } catch (error) {
    throw new Error(`Failed to download GoogleService-Info.plist: ${error.message}`);
  }
}

/**
 * Save Firebase project state
 */
async function saveFirebaseProjectState(gcpProjectId, firebaseProject) {
  const state = await readJsonFile(PATHS.STATE_FILE) || {};
  state.firebaseProject = {
    projectId: firebaseProject.projectId,
    displayName: firebaseProject.displayName,
    gcpProjectId: gcpProjectId,
    created_at: new Date().toISOString()
  };
  await writeJsonFile(PATHS.STATE_FILE, state);
}

/**
 * Load Firebase project state
 */
export async function loadFirebaseProjectState() {
  const state = await readJsonFile(PATHS.STATE_FILE);
  return state?.firebaseProject || null;
}

