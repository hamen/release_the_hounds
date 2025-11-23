/**
 * IAM role assignment module
 * Handles granting roles to service accounts
 */

import { google } from 'googleapis';
import { getAuthenticatedClient } from '../auth/gcloud-auth.js';
import { loadProjectState } from './project.js';

/**
 * Required roles for the service account
 * 
 * Note: 
 * - roles/androidpublisher is NOT a GCP IAM role - it's granted in Play Console
 * - roles/cloudresourcemanager.projectEditor doesn't exist - use roles/editor instead
 */
export const REQUIRED_ROLES = [
  'roles/editor',              // General project editor (for API access)
  'roles/firebase.admin'       // Firebase admin access
];

/**
 * Roles that need to be granted in Play Console (not via GCP IAM)
 * These are documented here for reference but must be granted manually in Play Console
 */
export const PLAY_CONSOLE_ROLES = [
  'roles/androidpublisher'  // This is granted in Play Console, not GCP IAM
];

/**
 * Grant a role to a service account
 * @param {string} projectId - GCP project ID
 * @param {string} serviceAccountEmail - Full service account email
 * @param {string} role - IAM role to grant (e.g., 'roles/firebase.admin')
 * @returns {Promise<boolean>} True if role was granted
 */
export async function grantRole(projectId, serviceAccountEmail, role) {
  const authClient = await getAuthenticatedClient();
  const crm = google.cloudresourcemanager({
    version: 'v1',
    auth: authClient
  });

  console.log(`   Granting ${role}...`);

  try {
    // Get current IAM policy
    const getPolicyResponse = await crm.projects.getIamPolicy({
      resource: projectId,
      requestBody: {}
    });

    const policy = getPolicyResponse.data;
    const member = `serviceAccount:${serviceAccountEmail}`;

    // Check if binding already exists
    let binding = policy.bindings?.find(b => b.role === role);
    
    if (binding) {
      // Check if service account already has this role
      if (binding.members?.includes(member)) {
        console.log(`   ✅ ${role} already granted`);
        return true;
      }
      // Add member to existing binding
      binding.members.push(member);
    } else {
      // Create new binding
      if (!policy.bindings) {
        policy.bindings = [];
      }
      binding = {
        role: role,
        members: [member]
      };
      policy.bindings.push(binding);
    }

    // Set updated policy
    await crm.projects.setIamPolicy({
      resource: projectId,
      requestBody: {
        policy: policy
      }
    });

    console.log(`   ✅ ${role} granted`);
    return true;
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`Permission denied. Ensure your account has "Project IAM Admin" role to grant ${role}.`);
    }
    if (error.code === 404) {
      throw new Error(`Project ${projectId} not found.`);
    }
    throw new Error(`Failed to grant role ${role}: ${error.message}`);
  }
}

/**
 * Grant all required roles to a service account
 * @param {string} projectId - GCP project ID
 * @param {string} serviceAccountEmail - Full service account email
 * @returns {Promise<Object>} Results of role grants
 */
export async function grantAllRequiredRoles(projectId, serviceAccountEmail) {
  console.log(`\n🛂 Granting IAM roles to service account...`);
  console.log(`   Service account: ${serviceAccountEmail}`);
  console.log(`   Project: ${projectId}`);

  const results = {
    granted: [],
    failed: [],
    alreadyGranted: []
  };

  for (const role of REQUIRED_ROLES) {
    try {
      const granted = await grantRole(projectId, serviceAccountEmail, role);
      if (granted) {
        // Check if it was already granted or newly granted
        // (grantRole returns true for both cases, but logs differently)
        results.granted.push(role);
      }
    } catch (error) {
      console.error(`   ❌ Failed to grant ${role}: ${error.message}`);
      results.failed.push({ role, error: error.message });
    }
  }

  console.log(`\n✅ Role assignment complete`);
  console.log(`   Granted: ${results.granted.length} roles`);
  if (results.failed.length > 0) {
    console.log(`   ⚠️  Failed: ${results.failed.length} roles`);
    results.failed.forEach(({ role, error }) => {
      console.log(`      - ${role}: ${error}`);
    });
  }

  // Note about Play Console permissions
  console.log(`\n📝 Important: Play Console Permissions`);
  console.log(`   The service account also needs Play Console access.`);
  console.log(`   Add ${serviceAccountEmail} in Play Console → Settings → Users & Permissions`);
  console.log(`   Grant "View app information" and "Manage production releases" permissions.\n`);

  return results;
}

/**
 * Check if service account has a specific role
 */
export async function hasRole(projectId, serviceAccountEmail, role) {
  const authClient = await getAuthenticatedClient();
  const crm = google.cloudresourcemanager({
    version: 'v1',
    auth: authClient
  });

  try {
    const response = await crm.projects.getIamPolicy({
      resource: projectId,
      requestBody: {}
    });

    const policy = response.data;
    const member = `serviceAccount:${serviceAccountEmail}`;
    const binding = policy.bindings?.find(b => b.role === role);
    
    return binding?.members?.includes(member) || false;
  } catch (error) {
    console.warn(`Failed to check role ${role}: ${error.message}`);
    return false;
  }
}

