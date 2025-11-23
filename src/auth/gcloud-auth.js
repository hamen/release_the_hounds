/**
 * Google Cloud authentication using gcloud CLI
 * This bypasses the need for OAuth2 client credentials entirely
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { google } from 'googleapis';
import { writeJsonFile, readJsonFile } from '../utils/fs.js';
import { PATHS } from '../config.js';

const execAsync = promisify(exec);

/**
 * Check if gcloud CLI is installed
 */
export async function isGcloudInstalled() {
  try {
    await execAsync('gcloud --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Authenticate using gcloud CLI
 * This handles OAuth2 automatically without needing client credentials
 */
export async function authenticateWithGcloud() {
  console.log('\n🔐 Authenticating with Google Cloud...');
  console.log('   This will open your browser for Google sign-in...\n');

  try {
    // Run gcloud auth login
    // This automatically handles OAuth2 flow and sets up Application Default Credentials
    const { stdout, stderr } = await execAsync('gcloud auth login --brief');
    
    if (stderr && !stderr.includes('You are now logged in')) {
      console.error('gcloud auth output:', stderr);
    }

    console.log('✅ Authentication successful!\n');

    // Also run application-default login to set up ADC
    console.log('🔧 Setting up Application Default Credentials...\n');
    await execAsync('gcloud auth application-default login');
    
    console.log('✅ Application Default Credentials configured!\n');
    
    return true;
  } catch (error) {
    if (error.message.includes('command not found') || error.message.includes('not found')) {
      throw new Error('gcloud CLI not found. Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
    }
    throw error;
  }
}

/**
 * Get authenticated client using Application Default Credentials
 * This works without OAuth2 client credentials
 */
export async function getAuthenticatedClient() {
  // Use Application Default Credentials (set up by gcloud)
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/androidpublisher',
      'https://www.googleapis.com/auth/firebase'
    ]
  });

  const client = await auth.getClient();
  return client;
}

/**
 * Check authentication status
 */
export async function checkAuthStatus() {
  try {
    // Check if gcloud is authenticated
    const { stdout } = await execAsync('gcloud auth list --filter=status:ACTIVE --format="value(account)"');
    const account = stdout.trim();

    if (!account) {
    return {
      authenticated: false,
      message: 'Not authenticated. Run "./release-the-hounds.sh auth" to authenticate.'
    };
    }

    // Verify we can get an access token
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/androidpublisher',
        'https://www.googleapis.com/auth/firebase'
      ]
    });

    await auth.getAccessToken();

    return {
      authenticated: true,
      account: account,
      method: 'gcloud'
    };
  } catch (error) {
    return {
      authenticated: false,
      message: 'Authentication check failed. Run "./release-the-hounds.sh auth" to authenticate.',
      error: error.message
    };
  }
}

