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
import { checkAllDependencies, printDependencyStatus } from './utils/check-dependencies.js';
import { fileExists } from './utils/fs.js';
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
  .description('Create a new Google Cloud project')
  .option('--project-id <id>', 'Custom project ID (auto-generated if not provided)')
  .option('--name <name>', 'Project display name', 'Auto-Publisher Project')
  .action(async (options) => {
    try {
      // Check authentication first
      const authStatus = await checkGcloudStatus();
      if (!authStatus.authenticated) {
        console.error('❌ Not authenticated. Run "./release-the-hounds.sh auth" first.');
        process.exit(1);
      }

      const projectId = options.projectId || generateProjectId();
      const project = await createProject(projectId, options.name);
      
      // Enable required APIs
      await enableAllRequiredApis(projectId);
      
      console.log('\n🎉 Project setup complete!');
      console.log(`   Project ID: ${project.projectId}`);
      console.log(`   Project Number: ${project.projectNumber}`);
    } catch (error) {
      console.error('\n❌ Failed to create project:', error.message);
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
      console.error('Error listing projects:', error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

