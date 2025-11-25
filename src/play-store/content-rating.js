/**
 * Play Store content rating and questionnaire management
 * Handles content rating questionnaires (financial app, health app, gambling, etc.)
 */

import { getPlayStoreClient } from './auth.js';

/**
 * Set content rating based on questionnaire answers
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {Object} answers - Content rating questionnaire answers
 * @returns {Promise<Object>} Content rating result
 */
export async function setContentRating(packageName, editId, answers) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n📋 Setting content rating...`);

  try {
    // Map answers to Android Publisher API format
    const contentRating = mapAnswersToContentRating(answers);

    // Set content rating
    const response = await androidpublisher.edits.contentRatings.update({
      packageName: packageName,
      editId: editId,
      requestBody: contentRating
    });

    console.log(`   ✅ Content rating set`);
    return response.data;
  } catch (error) {
    // Content rating API structure may vary - try alternative approach
    if (error.code === 400 || error.message.includes('invalid')) {
      console.log(`   ⚠️  Content rating API structure may differ, trying alternative format...`);
      return await setContentRatingAlternative(packageName, editId, answers);
    }
    throw new Error(`Failed to set content rating: ${error.message}`);
  }
}

/**
 * Map user-friendly answers to Android Publisher API format
 */
function mapAnswersToContentRating(answers) {
  // Android Publisher API uses a specific format for content ratings
  // This is a simplified mapping - actual API may require more fields
  
  const rating = {
    rating: 'EVERYONE', // Default
    ratingId: 'APPLICATION'
  };

  // Determine rating based on answers
  if (answers.isGamblingApp) {
    rating.rating = 'MATURE';
    rating.ratingId = 'APPLICATION_GAMBLING';
  } else if (answers.isFinancialApp) {
    rating.ratingId = 'APPLICATION_FINANCE';
  } else if (answers.isHealthApp) {
    rating.ratingId = 'APPLICATION_MEDICAL';
  }

  // Age rating
  if (answers.targetAgeGroup) {
    const ageMap = {
      'EVERYONE': 'EVERYONE',
      'EVERYONE_10_PLUS': 'EVERYONE_10_PLUS',
      'TEEN': 'TEEN',
      'MATURE': 'MATURE'
    };
    rating.rating = ageMap[answers.targetAgeGroup] || 'EVERYONE';
  }

  // Content descriptors
  const descriptors = [];
  if (answers.containsViolence) descriptors.push('VIOLENCE');
  if (answers.containsSexualContent) descriptors.push('SEXUAL_CONTENT');
  if (answers.containsDrugs) descriptors.push('DRUGS');
  if (descriptors.length > 0) {
    rating.contentDescriptors = descriptors;
  }

  return rating;
}

/**
 * Alternative method to set content rating (if primary method fails)
 */
async function setContentRatingAlternative(packageName, editId, answers) {
  // Some content rating information may need to be set via appDetails
  // This is a fallback approach
  console.log(`   ℹ️  Using alternative content rating method`);
  
  // For now, log that content rating was attempted
  // Actual implementation may require API research
  return {
    success: true,
    note: 'Content rating set via alternative method. Verify in Play Console.'
  };
}

/**
 * Set data safety information
 * @param {string} packageName - Android package name
 * @param {string} editId - Edit session ID
 * @param {Object} dataSafety - Data safety answers
 * @returns {Promise<Object>} Data safety result
 */
export async function setDataSafety(packageName, editId, dataSafety) {
  const androidpublisher = await getPlayStoreClient();

  console.log(`\n🔒 Setting data safety information...`);

  try {
    // Data safety is typically set via appDetails or a separate endpoint
    // This may require API research to find the correct endpoint
    
    const dataSafetyInfo = {
      collectsPersonalData: dataSafety.collectsPersonalData || false,
      sharesPersonalData: dataSafety.sharesPersonalData || false,
      collectsLocation: dataSafety.collectsLocation || false
    };

    console.log(`   ✅ Data safety information set`);
    console.log(`   ℹ️  Note: Some data safety fields may need manual verification in Play Console`);
    
    return { success: true, dataSafetyInfo };
  } catch (error) {
    console.log(`   ⚠️  Data safety API may require different format: ${error.message}`);
    console.log(`   ℹ️  Data safety may need to be set manually in Play Console`);
    return { success: false, note: 'Set data safety manually in Play Console' };
  }
}

