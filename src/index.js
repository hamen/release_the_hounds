/**
 * Main entry point (for programmatic use)
 * 
 * Note: This tool is primarily used via CLI (./release-the-hounds.sh)
 * Programmatic API exports may be added in the future.
 */

// Export main CLI functions for programmatic use
export { authenticateWithGcloud, checkAuthStatus as checkGcloudAuthStatus } from './auth/gcloud-auth.js';
export { createProject, listProjects, loadProjectState } from './gcp/project.js';
export { enableAllRequiredApis } from './gcp/apis.js';
export { setupServiceAccount } from './gcp/service-account.js';
export { createOrLinkFirebaseProject, listAndroidApps, listIOSApps } from './firebase/project.js';

