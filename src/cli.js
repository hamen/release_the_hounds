#!/usr/bin/env node

/**
 * CLI entry point for auto-publisher
 */

import 'dotenv/config';
import { Command } from 'commander';
import { startOAuthFlow, checkAuthStatus as checkOAuthStatus } from './auth/oauth.js';
import { authenticateWithGcloud, checkAuthStatus as checkGcloudStatus, isGcloudInstalled } from './auth/gcloud-auth.js';
import { createProject, generateProjectId, listProjects, loadProjectState } from './gcp/project.js';
import { enableAllRequiredApis } from './gcp/apis.js';
import { setupServiceAccount, loadServiceAccountKey } from './gcp/service-account.js';
import { grantAllRequiredRoles, REQUIRED_ROLES } from './gcp/iam.js';
import { createOrLinkFirebaseProject, addAndroidApp, addIOSApp, downloadGoogleServicesJson, downloadGoogleServiceInfoPlist, loadFirebaseProjectState, listAndroidApps, listIOSApps, getFirebaseProject } from './firebase/project.js';
import { question, confirm } from './utils/prompt.js';
import { checkAllDependencies, printDependencyStatus } from './utils/check-dependencies.js';
import { fileExists, deleteFile } from './utils/fs.js';
import { PATHS } from './config.js';

const program = new Command();

program
  .name('auto-publisher')
  .description('Automated mobile app publishing pipeline for Google Play Store and iOS App Store')
  .version('0.1.0');

// Check dependencies command
program
  .command('check-deps')
  .description('Check if all required dependencies are installed')
  .action(async () => {
    try {
      const results = await checkAllDependencies();
      const allInstalled = printDependencyStatus(results);
      
      if (!allInstalled) {
        console.log('❌ Some dependencies are missing. Please install them before proceeding.\n');
        process.exit(1);
      } else {
        console.log('✅ All dependencies are installed!\n');
      }
    } catch (error) {
      console.error('Error checking dependencies:', error.message);
      process.exit(1);
    }
  });

// Auth command - uses gcloud CLI for true automation
program
  .command('auth')
  .description('Authenticate with Google (uses gcloud CLI - fully automated)')
  .option('--force', 'Force re-authentication even if already authenticated')
  .action(async (options) => {
    try {
      // Check if gcloud is installed
      if (!await isGcloudInstalled()) {
        console.error('\n❌ gcloud CLI not found.');
        console.error('\n📦 Install Google Cloud SDK:');
        console.error('   Linux: https://cloud.google.com/sdk/docs/install#linux');
        console.error('   macOS: brew install google-cloud-sdk');
        console.error('   Windows: https://cloud.google.com/sdk/docs/install#windows');
        console.error('\nAfter installation, run "./release-the-hounds.sh auth" again.\n');
        process.exit(1);
      }

      // Check if already authenticated
      if (!options.force) {
        const status = await checkGcloudStatus();
        if (status.authenticated) {
          console.log('✅ Already authenticated!');
          console.log('Account:', status.account);
          console.log('Method:', status.method);
          console.log('\nUse --force to re-authenticate.');
          return;
        }
      }

      // Authenticate using gcloud
      await authenticateWithGcloud();
      
      console.log('🎉 Authentication complete!');
      console.log('   You can now use all release-the-hounds commands.');
      console.log('   Run: ./release-the-hounds.sh create-project\n');
    } catch (error) {
      console.error('\n❌ Authentication failed:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    try {
      const status = await checkGcloudStatus();
      
      if (status.authenticated) {
        console.log('✅ Authenticated');
        console.log('Account:', status.account);
        console.log('Method:', status.method);
        
        // Show project state if available
        const projectState = await loadProjectState();
        if (projectState) {
          console.log('\n📁 Current Project:');
          console.log(`   Project ID: ${projectState.projectId}`);
          console.log(`   Project Number: ${projectState.projectNumber}`);
          console.log(`   Name: ${projectState.name}`);
        }
      } else {
        console.log('❌ Not authenticated');
        console.log('Message:', status.message);
        if (status.error) {
          console.log('Error:', status.error);
        }
        console.log('\nRun "./release-the-hounds.sh auth" to authenticate.');
      }
    } catch (error) {
      console.error('Error checking status:', error.message);
      process.exit(1);
    }
  });

// Create project command
program
  .command('create-project')
  .description('Create a new Google Cloud project with full setup (APIs, service account, IAM roles)')
  .option('--project-id <id>', 'Custom project ID (auto-generated if not provided)')
  .option('--name <name>', 'Project display name', 'Auto-Publisher Project')
  .option('--skip-service-account', 'Skip service account creation (create manually later)')
  .action(async (options) => {
    try {
      // Check authentication first
      const authStatus = await checkGcloudStatus();
      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Run "./release-the-hounds.sh auth" first.');
        process.exit(1);
      }

      const projectId = options.projectId || generateProjectId();
      
      // Step 1: Create project
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📁 Step 1: Creating Google Cloud Project');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      const project = await createProject(projectId, options.name);
      
      // Step 2: Enable required APIs
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔌 Step 2: Enabling Required APIs');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      await enableAllRequiredApis(projectId);
      
      // Step 3: Create service account and grant roles
      if (!options.skipServiceAccount) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Step 3: Setting Up Service Account');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
          const { serviceAccount, keyPath } = await setupServiceAccount(
            projectId,
            'app-publisher',
            'Auto-Publisher Service Account'
          );
          
          await grantAllRequiredRoles(projectId, serviceAccount.email);
          
          console.log('\n✅ Service account configured');
          console.log(`   Email: ${serviceAccount.email}`);
          console.log(`   Key: ${keyPath}`);
        } catch (error) {
          console.error('\n⚠️  Service account setup failed:', error.message);
          console.error('   You can create it later with: ./release-the-hounds.sh setup-service-account');
          console.error('   Continuing with project setup...\n');
        }
      } else {
        console.log('\n⏭️  Skipping service account setup (use --skip-service-account to hide this)');
        console.log('   Create it later with: ./release-the-hounds.sh setup-service-account\n');
      }
      
      // Summary
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Project Setup Complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`   Project ID: ${project.projectId}`);
      console.log(`   Project Number: ${project.projectNumber}`);
      console.log(`   Name: ${project.name}`);
      console.log(`   State: ${project.lifecycleState}`);
      console.log('\n✅ Ready for Firebase setup!');
      console.log('   Next: ./release-the-hounds.sh setup-firebase\n');
    } catch (error) {
      console.error('\n❌ Project setup failed:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.response?.data?.error) {
        console.error(`   Details: ${JSON.stringify(error.response.data.error, null, 2)}`);
      }
      console.error('\n💡 Troubleshooting:');
      console.error('   - Ensure you have proper permissions');
      console.error('   - Check that billing is enabled (if required)');
      console.error('   - Verify project ID is unique\n');
      process.exit(1);
    }
  });

// List projects command
program
  .command('list-projects')
  .description('List all accessible Google Cloud projects')
  .action(async () => {
    try {
      const authStatus = await checkGcloudStatus();
      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Run "./release-the-hounds.sh auth" first.');
        process.exit(1);
      }

      console.log('\n📁 Accessible Projects:\n');
      const projects = await listProjects();
      
      if (projects.length === 0) {
        console.log('   No projects found.');
      } else {
        projects.forEach(project => {
          console.log(`   ${project.projectId} - ${project.name} (${project.projectNumber})`);
        });
      }
    } catch (error) {
      console.error('❌ Error listing projects:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      process.exit(1);
    }
  });

// Setup service account command
program
  .command('setup-service-account')
  .description('Create service account and grant required IAM roles')
  .option('--project-id <id>', 'GCP project ID (uses current project if not provided)')
  .option('--account-id <id>', 'Service account ID', 'app-publisher')
  .option('--name <name>', 'Service account display name', 'Auto-Publisher Service Account')
  .option('--force', 'Recreate service account key even if it already exists')
  .action(async (options) => {
    try {
      const authStatus = await checkGcloudStatus();
      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Run "./release-the-hounds.sh auth" first.');
        process.exit(1);
      }

      // Get project ID
      let projectId = options.projectId;
      if (!projectId) {
        const projectState = await loadProjectState();
        if (!projectState || !projectState.projectId) {
          console.error('❌ No project found. Create a project first:');
          console.error('   ./release-the-hounds.sh create-project');
          process.exit(1);
        }
        projectId = projectState.projectId;
        console.log(`\n📁 Using project: ${projectId}`);
      }

      // Check if service account key already exists
      const existingKey = await loadServiceAccountKey(projectId);
      if (existingKey) {
        if (options.force) {
          console.log(`\n⚠️  --force flag used: Deleting existing key file...`);
          await deleteFile(existingKey.keyPath);
          console.log(`   ✅ Deleted: ${existingKey.keyPath}\n`);
        } else {
          console.log(`\n⚠️  Service account key already exists: ${existingKey.keyPath}`);
          console.log('   Use --force to recreate (or delete the existing key file first)');
          return;
        }
      }

      // Create service account
      const { serviceAccount, keyPath } = await setupServiceAccount(
        projectId,
        options.accountId,
        options.name
      );

      // Grant IAM roles
      await grantAllRequiredRoles(projectId, serviceAccount.email);

      console.log('\n🎉 Service account setup complete!');
      console.log(`   Service account: ${serviceAccount.email}`);
      console.log(`   Key file: ${keyPath}`);
      console.log(`   GCP IAM roles granted: ${REQUIRED_ROLES.length}`);
      console.log('\n✅ Ready for Firebase operations!');
      console.log('   Note: Play Console permissions must be granted manually in Play Console.\n');
    } catch (error) {
      console.error('\n❌ Service account setup failed:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.response?.data?.error) {
        console.error(`   Details: ${JSON.stringify(error.response.data.error, null, 2)}`);
      }
      console.error('\n💡 Troubleshooting:');
      console.error('   - Ensure you have "Service Account Admin" role');
      console.error('   - Ensure you have "Project IAM Admin" role');
      console.error('   - Check that the project exists and APIs are enabled\n');
      process.exit(1);
    }
  });

// Setup Firebase command
program
  .command('setup-firebase')
  .description('Create or link Firebase project and register Android/iOS apps')
  .option('--project-id <id>', 'GCP project ID (uses current project if not provided)')
  .option('--name <name>', 'Firebase project display name')
  .option('--android-package <package>', 'Android package name (e.g., com.example.app)')
  .option('--android-name <name>', 'Android app display name')
  .option('--android-sha1 <sha1>', 'Android SHA-1 fingerprint (optional)')
  .option('--ios-bundle <bundle>', 'iOS bundle ID (e.g., com.example.app)')
  .option('--ios-name <name>', 'iOS app display name')
  .option('--skip-android', 'Skip Android app registration')
  .option('--skip-ios', 'Skip iOS app registration')
  .option('--no-interactive', 'Skip interactive Firebase project picker')
  .action(async (options) => {
    try {
      const authStatus = await checkGcloudStatus();
      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Run "./release-the-hounds.sh auth" first.');
        process.exit(1);
      }

      // Get project ID
      let projectId = options.projectId;
      if (!projectId) {
        const projectState = await loadProjectState();
        if (!projectState || !projectState.projectId) {
          console.error('❌ No project found. Create a project first:');
          console.error('   ./release-the-hounds.sh create-project');
          process.exit(1);
        }
        projectId = projectState.projectId;
      }

      const projectState = await loadProjectState();
      const displayName = options.name || projectState?.name || 'Firebase Project';

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log('🔥 Firebase Project Setup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   GCP Project: ${projectId}`);
      console.log(`   Display name: ${displayName}\n`);

      // Step 1: Create or link Firebase project
      console.log('📋 Step 1: Creating/Linking Firebase Project');
      const interactive = options.interactive !== false; // Default to true unless --no-interactive
      const firebaseProject = await createOrLinkFirebaseProject(projectId, displayName, interactive);

      // Step 2: Handle apps (existing or new)
      console.log('\n📋 Step 2: Setting up Apps');
      
      let androidApp = null;
      let iosApp = null;
      
      try {
        // Verify Firebase project is active before listing apps
        const firebaseProjectCheck = await getFirebaseProject(projectId);
        if (!firebaseProjectCheck) {
          throw new Error(`Firebase project not found for GCP project ${projectId}. Please set up Firebase first.`);
        }
        
        const existingAndroidApps = await listAndroidApps(projectId);
        const existingIOSApps = await listIOSApps(projectId);
        
        // Handle Android apps
        if (!options.skipAndroid) {
          if (existingAndroidApps.length > 0) {
            console.log(`\n📱 Found ${existingAndroidApps.length} existing Android app(s):`);
            existingAndroidApps.forEach((app, index) => {
              console.log(`   ${index + 1}. ${app.displayName || app.packageName} (${app.packageName})`);
            });
            
            if (options.androidPackage) {
              // User provided package name - find matching app
              androidApp = existingAndroidApps.find(app => app.packageName === options.androidPackage);
              if (!androidApp) {
                console.log(`\n   ℹ️  No existing app found with package "${options.androidPackage}"`);
                console.log(`   Creating new Android app...`);
                androidApp = await addAndroidApp(
                  projectId,
                  options.androidPackage,
                  options.androidName || 'Android App',
                  options.androidSha1 || null
                );
              } else {
                console.log(`\n   ✅ Using existing Android app: ${androidApp.displayName || androidApp.packageName}`);
              }
            } else {
              // No package provided - download configs for all existing apps
              console.log(`\n   📥 Downloading config files for existing Android apps...`);
              for (const app of existingAndroidApps) {
                if (app.appId) {
                  const fileName = `google-services-${app.packageName.replace(/\./g, '-')}.json`;
                  await downloadGoogleServicesJson(projectId, app.appId, `${PATHS.FIREBASE_CONFIG_DIR}/${fileName}`);
                }
              }
              androidApp = existingAndroidApps[0]; // Use first one for summary
            }
            
            // Download config for the selected/new app
            if (androidApp?.appId && options.androidPackage) {
              await downloadGoogleServicesJson(projectId, androidApp.appId);
            }
          } else {
            // No existing Android apps
            if (options.androidPackage) {
              console.log(`\n📱 No existing Android apps found. Creating new app...`);
              androidApp = await addAndroidApp(
                projectId,
                options.androidPackage,
                options.androidName || 'Android App',
                options.androidSha1 || null
              );
              if (androidApp.appId) {
                await downloadGoogleServicesJson(projectId, androidApp.appId);
              }
            } else if (interactive) {
              // Ask user if they want to create Android app
              const createAndroid = await confirm('\n   No Android apps found. Create one?', false);
              if (createAndroid) {
                const packageName = await question('   Enter Android package name (e.g., com.example.app): ');
                if (packageName.trim()) {
                  const displayName = await question('   Enter app display name (optional): ') || 'Android App';
                  androidApp = await addAndroidApp(projectId, packageName.trim(), displayName.trim() || 'Android App');
                  if (androidApp.appId) {
                    await downloadGoogleServicesJson(projectId, androidApp.appId);
                  }
                }
              }
            } else {
              console.log(`\n   ⚠️  No Android apps found. Use --android-package to create one.`);
            }
          }
        }
        
        // Handle iOS apps
        if (!options.skipIos) {
          if (existingIOSApps.length > 0) {
            console.log(`\n🍎 Found ${existingIOSApps.length} existing iOS app(s):`);
            existingIOSApps.forEach((app, index) => {
              console.log(`   ${index + 1}. ${app.displayName || app.bundleId} (${app.bundleId})`);
            });
            
            if (options.iosBundle) {
              // User provided bundle ID - find matching app
              iosApp = existingIOSApps.find(app => app.bundleId === options.iosBundle);
              if (!iosApp) {
                console.log(`\n   ℹ️  No existing app found with bundle "${options.iosBundle}"`);
                console.log(`   Creating new iOS app...`);
                iosApp = await addIOSApp(
                  projectId,
                  options.iosBundle,
                  options.iosName || 'iOS App'
                );
              } else {
                console.log(`\n   ✅ Using existing iOS app: ${iosApp.displayName || iosApp.bundleId}`);
              }
            } else {
              // No bundle provided - download configs for all existing apps
              console.log(`\n   📥 Downloading config files for existing iOS apps...`);
              for (const app of existingIOSApps) {
                if (app.appId) {
                  const fileName = `GoogleService-Info-${app.bundleId.replace(/\./g, '-')}.plist`;
                  await downloadGoogleServiceInfoPlist(projectId, app.appId, `${PATHS.FIREBASE_CONFIG_DIR}/${fileName}`);
                }
              }
              iosApp = existingIOSApps[0]; // Use first one for summary
            }
            
            // Download config for the selected/new app
            if (iosApp?.appId && options.iosBundle) {
              await downloadGoogleServiceInfoPlist(projectId, iosApp.appId);
            }
          } else {
            // No existing iOS apps
            if (options.iosBundle) {
              console.log(`\n🍎 No existing iOS apps found. Creating new app...`);
              iosApp = await addIOSApp(
                projectId,
                options.iosBundle,
                options.iosName || 'iOS App'
              );
              if (iosApp.appId) {
                await downloadGoogleServiceInfoPlist(projectId, iosApp.appId);
              }
            } else if (interactive) {
              // Ask user if they want to create iOS app
              const createIOS = await confirm('\n   No iOS apps found. Create one?', false);
              if (createIOS) {
                const bundleId = await question('   Enter iOS bundle ID (e.g., com.example.app): ');
                if (bundleId.trim()) {
                  const displayName = await question('   Enter app display name (optional): ') || 'iOS App';
                  iosApp = await addIOSApp(projectId, bundleId.trim(), displayName.trim() || 'iOS App');
                  if (iosApp.appId) {
                    await downloadGoogleServiceInfoPlist(projectId, iosApp.appId);
                  }
                }
              }
            } else {
              console.log(`\n   ⚠️  No iOS apps found. Use --ios-bundle to create one.`);
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error handling apps: ${error.message}`);
        throw error;
      }

      // Summary
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Firebase Setup Complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`   Firebase Project ID: ${firebaseProject.projectId}`);
      console.log(`   Display Name: ${firebaseProject.displayName}`);
      
      if (androidApp) {
        console.log(`\n   ✅ Android App: ${androidApp.packageName}`);
        console.log(`      App ID: ${androidApp.appId}`);
        console.log(`      Config: ${PATHS.FIREBASE_CONFIG_DIR}/google-services.json`);
      }
      
      if (iosApp) {
        console.log(`\n   ✅ iOS App: ${iosApp.bundleId}`);
        console.log(`      App ID: ${iosApp.appId}`);
        console.log(`      Config: ${PATHS.FIREBASE_CONFIG_DIR}/GoogleService-Info.plist`);
      }

      console.log('\n✅ Ready for app development and Play Store publishing!\n');
    } catch (error) {
      console.error('\n❌ Firebase setup failed:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      console.error('\n💡 Troubleshooting:');
      console.error('   - Ensure Firebase API is enabled');
      console.error('   - Check that service account has Firebase Admin role');
      console.error('   - Verify project exists and is active');
      console.error('   - Note: If Firebase project already exists for another GCP project,');
      console.error('     you may need to use that GCP project or create a new Firebase project\n');
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

