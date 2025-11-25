/**
 * Play Store state management
 * Tracks Play Store app state in .autopublish/state.json
 */

import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { PATHS } from '../config.js';

/**
 * Save Play Store app state
 * @param {string} packageName - Android package name
 * @param {Object} appState - App state data
 */
export async function savePlayStoreAppState(packageName, appState) {
  const state = await readJsonFile(PATHS.STATE_FILE) || {};
  
  if (!state.playStore) {
    state.playStore = {};
  }
  if (!state.playStore.apps) {
    state.playStore.apps = {};
  }

  state.playStore.apps[packageName] = {
    ...appState,
    updatedAt: new Date().toISOString()
  };

  await writeJsonFile(PATHS.STATE_FILE, state);
}

/**
 * Load Play Store app state
 * @param {string} packageName - Android package name
 * @returns {Promise<Object|null>} App state or null if not found
 */
export async function loadPlayStoreAppState(packageName) {
  const state = await readJsonFile(PATHS.STATE_FILE);
  return state?.playStore?.apps?.[packageName] || null;
}

/**
 * Save edit state
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit ID
 */
export async function saveEditState(packageName, editId) {
  const state = await readJsonFile(PATHS.STATE_FILE) || {};
  
  if (!state.playStore) {
    state.playStore = {};
  }
  if (!state.playStore.edits) {
    state.playStore.edits = {};
  }

  state.playStore.edits[packageName] = {
    editId: editId,
    createdAt: new Date().toISOString()
  };

  await writeJsonFile(PATHS.STATE_FILE, state);
}

/**
 * Load edit state
 * @param {string} packageName - Android package name
 * @returns {Promise<Object|null>} Edit state or null if not found
 */
export async function loadEditState(packageName) {
  const state = await readJsonFile(PATHS.STATE_FILE);
  return state?.playStore?.edits?.[packageName] || null;
}

/**
 * Clear edit state
 * @param {string} packageName - Android package name
 */
export async function clearEditState(packageName) {
  const state = await readJsonFile(PATHS.STATE_FILE) || {};
  
  if (state.playStore?.edits?.[packageName]) {
    delete state.playStore.edits[packageName];
    await writeJsonFile(PATHS.STATE_FILE, state);
  }
}

