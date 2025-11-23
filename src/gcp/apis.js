/**
 * Google Cloud API enabling module
 * Handles enabling required APIs for the project
 */

import { google } from 'googleapis';
import { getAuthenticatedClient } from '../auth/gcloud-auth.js';
import { loadProjectState } from './project.js';

/**
 * Required APIs to enable
 */
export const REQUIRED_APIS = [
  'iam.googleapis.com',
  'cloudresourcemanager.googleapis.com',
  'firebase.googleapis.com',
  'androidpublisher.googleapis.com',
  'serviceusage.googleapis.com'
];

/**
 * Enable a single API
 */
export async function enableApi(projectId, apiName) {
  const authClient = await getAuthenticatedClient();
  const serviceUsage = google.serviceusage({
    version: 'v1',
    auth: authClient
  });

  // Get project number (required for service usage API)
  const projectState = await loadProjectState();
  if (!projectState || projectState.projectId !== projectId) {
    throw new Error(`Project state not found for ${projectId}. Please create project first.`);
  }

  const projectNumber = projectState.projectNumber;
  const serviceName = `projects/${projectNumber}/services/${apiName}`;

  console.log(`   Enabling ${apiName}...`);

  try {
    const response = await serviceUsage.services.enable({
      name: serviceName
    });

    // Wait for API to be enabled (poll operation)
    if (response.data.name) {
      await pollApiEnablement(serviceUsage, response.data.name, apiName);
    }

    console.log(`   ✅ ${apiName} enabled`);
    return true;
  } catch (error) {
    if (error.code === 409) {
      // API already enabled
      console.log(`   ✅ ${apiName} already enabled`);
      return true;
    }
    console.error(`   ❌ Failed to enable ${apiName}: ${error.message}`);
    throw error;
  }
}

/**
 * Poll for API enablement completion
 */
async function pollApiEnablement(serviceUsage, operationName, apiName, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const operation = await serviceUsage.operations.get({
        name: operationName
      });

      if (operation.data.done) {
        return true;
      }

      if (attempt < maxAttempts) {
        await sleep(1000); // Wait 1 second
      }
    } catch (error) {
      // Operation might not be found, assume success
      if (error.code === 404) {
        return true;
      }
      if (attempt < maxAttempts) {
        await sleep(1000);
        continue;
      }
    }
  }

  // Timeout - API might still be enabling, but we'll continue
  console.warn(`   ⚠️  ${apiName} enablement may still be in progress`);
  return true;
}

/**
 * Enable all required APIs
 */
export async function enableAllRequiredApis(projectId) {
  console.log(`\n🔌 Enabling required APIs for project: ${projectId}`);

  const results = {
    enabled: [],
    failed: []
  };

  for (const api of REQUIRED_APIS) {
    try {
      await enableApi(projectId, api);
      results.enabled.push(api);
    } catch (error) {
      console.error(`Failed to enable ${api}:`, error.message);
      results.failed.push({ api, error: error.message });
    }
  }

  console.log(`\n✅ Enabled ${results.enabled.length} APIs`);
  if (results.failed.length > 0) {
    console.log(`⚠️  Failed to enable ${results.failed.length} APIs:`);
    results.failed.forEach(({ api, error }) => {
      console.log(`   - ${api}: ${error}`);
    });
  }

  return results;
}

/**
 * Check if an API is enabled
 */
export async function isApiEnabled(projectId, apiName) {
  const authClient = await getAuthenticatedClient();
  const serviceUsage = google.serviceusage({
    version: 'v1',
    auth: authClient
  });

  const projectState = await loadProjectState();
  if (!projectState || projectState.projectId !== projectId) {
    return false;
  }

  const projectNumber = projectState.projectNumber;
  const serviceName = `projects/${projectNumber}/services/${apiName}`;

  try {
    const response = await serviceUsage.services.get({
      name: serviceName
    });
    return response.data.state === 'ENABLED';
  } catch (error) {
    return false;
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

