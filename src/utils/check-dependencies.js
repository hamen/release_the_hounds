/**
 * Dependency checking utilities
 * Verifies all required tools are installed and configured
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if a command exists
 */
async function commandExists(command) {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
async function getVersion(command) {
  try {
    const { stdout } = await execAsync(`${command} --version`);
    return stdout.trim().split('\n')[0];
  } catch {
    return null;
  }
}

/**
 * Check all dependencies
 */
export async function checkAllDependencies() {
  const results = {
    node: { installed: false, version: null },
    npm: { installed: false, version: null },
    gcloud: { installed: false, version: null, initialized: false }
  };

  // Check Node.js
  results.node.installed = await commandExists('node');
  if (results.node.installed) {
    results.node.version = await getVersion('node');
  }

  // Check npm
  results.npm.installed = await commandExists('npm');
  if (results.npm.installed) {
    results.npm.version = await getVersion('npm');
  }

  // Check gcloud
  results.gcloud.installed = await commandExists('gcloud');
  if (results.gcloud.installed) {
    results.gcloud.version = await getVersion('gcloud');
    
    // Check if gcloud is initialized
    try {
      await execAsync('gcloud config list --format="value(core.account)"');
      results.gcloud.initialized = true;
    } catch {
      results.gcloud.initialized = false;
    }
  }

  return results;
}

/**
 * Print dependency status
 */
export function printDependencyStatus(results) {
  console.log('\n📋 Dependency Status:\n');

  // Node.js
  if (results.node.installed) {
    console.log(`✅ Node.js: ${results.node.version}`);
  } else {
    console.log('❌ Node.js: Not installed');
    console.log('   Install: https://nodejs.org/');
  }

  // npm
  if (results.npm.installed) {
    console.log(`✅ npm: ${results.npm.version}`);
  } else {
    console.log('❌ npm: Not installed');
    console.log('   npm comes with Node.js');
  }

  // gcloud
  if (results.gcloud.installed) {
    console.log(`✅ Google Cloud SDK: ${results.gcloud.version}`);
    if (!results.gcloud.initialized) {
      console.log('⚠️  gcloud not initialized. Run: gcloud init');
    }
  } else {
    console.log('❌ Google Cloud SDK: Not installed');
    console.log('   Install: https://cloud.google.com/sdk/docs/install');
  }

  console.log('');

  // Check if all critical dependencies are installed
  const allInstalled = results.node.installed && results.npm.installed && results.gcloud.installed;
  return allInstalled;
}

