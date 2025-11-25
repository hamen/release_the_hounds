/**
 * Play Store config file loader
 * Loads and validates play-store-config.json
 */

import { readJsonFile, fileExists } from '../utils/fs.js';
import { join } from 'path';

/**
 * Load and validate Play Store config file
 * @param {string} configPath - Path to config file
 * @returns {Promise<Object>} Validated config object
 */
export async function loadPlayStoreConfig(configPath) {
  if (!(await fileExists(configPath))) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const config = await readJsonFile(configPath);
  
  if (!config) {
    throw new Error(`Failed to parse config file: ${configPath}`);
  }

  // Validate required fields
  validateConfig(config);

  return config;
}

/**
 * Validate config structure
 */
function validateConfig(config) {
  const required = ['packageName', 'build', 'metadata'];
  const missing = required.filter(field => !config[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required config fields: ${missing.join(', ')}`);
  }

  // Validate build section
  if (!config.build.aab && !config.build.apk) {
    throw new Error('Config must specify either build.aab or build.apk');
  }

  // Validate metadata section
  const requiredMetadata = ['title', 'shortDescription', 'fullDescription', 'category', 'privacyPolicyUrl'];
  const missingMetadata = requiredMetadata.filter(field => !config.metadata[field]);

  if (missingMetadata.length > 0) {
    throw new Error(`Missing required metadata fields: ${missingMetadata.join(', ')}`);
  }

  // Validate category format
  const validCategories = [
    'APPLICATION_PRODUCTIVITY',
    'APPLICATION_GAME',
    'APPLICATION_FINANCE',
    'APPLICATION_MEDICAL',
    'GAME_ACTION',
    'GAME_ADVENTURE',
    'GAME_ARCADE',
    'GAME_BOARD',
    'GAME_CARD',
    'GAME_CASINO',
    'GAME_CASUAL',
    'GAME_EDUCATIONAL',
    'GAME_MUSIC',
    'GAME_PUZZLE',
    'GAME_RACING',
    'GAME_ROLE_PLAYING',
    'GAME_SIMULATION',
    'GAME_SPORTS',
    'GAME_STRATEGY',
    'GAME_TRIVIA',
    'GAME_WORD'
  ];

  if (!validCategories.includes(config.metadata.category)) {
    console.warn(`⚠️  Category "${config.metadata.category}" may not be valid. Valid categories: ${validCategories.slice(0, 5).join(', ')}...`);
  }
}

/**
 * Get default config path
 * @returns {string} Default config path
 */
export function getDefaultConfigPath() {
  return join(process.cwd(), 'play-store-config.json');
}

/**
 * Create example config file
 * @param {string} outputPath - Path to write example config
 */
export async function createExampleConfig(outputPath) {
  const exampleConfig = {
    packageName: "com.example.app",
    build: {
      aab: "./app/build/outputs/bundle/release/app-release.aab",
      apk: null
    },
    metadata: {
      title: "My Awesome App",
      shortDescription: "Short description (max 80 characters)",
      fullDescription: "Full description with details about your app. This can be up to 4000 characters.",
      category: "APPLICATION_PRODUCTIVITY",
      privacyPolicyUrl: "https://example.com/privacy"
    },
    graphics: {
      screenshotsDir: "./screenshots/android",
      icon: "./assets/icon-512.png",
      featureGraphic: "./assets/feature-graphic-1024x500.png"
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

  const { writeJsonFile } = await import('../utils/fs.js');
  await writeJsonFile(outputPath, exampleConfig);
}

