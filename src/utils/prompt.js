/**
 * Interactive prompt utilities for CLI
 */

import readline from 'readline';

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
export function question(query) {
  const rl = createInterface();
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompt user to select from a list of options
 * @param {Array} options - Array of {value, label} objects or strings
 * @param {string} prompt - Prompt message
 * @returns {Promise<string>} Selected value
 */
export async function selectOption(options, prompt = 'Select an option:') {
  console.log(`\n${prompt}\n`);
  
  // Normalize options
  const normalizedOptions = options.map((opt, index) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt, index: index + 1 };
    }
    return { ...opt, index: index + 1 };
  });

  // Display options
  normalizedOptions.forEach(opt => {
    console.log(`   ${opt.index}. ${opt.label}`);
  });
  console.log(`   0. Cancel\n`);

  const rl = createInterface();
  
  return new Promise((resolve, reject) => {
    const ask = () => {
      rl.question('Enter number: ', answer => {
        rl.close();
        const choice = parseInt(answer, 10);
        
        if (choice === 0) {
          reject(new Error('Cancelled by user'));
          return;
        }
        
        const selected = normalizedOptions.find(opt => opt.index === choice);
        if (selected) {
          resolve(selected.value);
        } else {
          console.error(`Invalid choice: ${choice}`);
          reject(new Error('Invalid selection'));
        }
      });
    };
    
    ask();
  });
}

/**
 * Confirm yes/no question
 */
export async function confirm(message, defaultValue = true) {
  const rl = createInterface();
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  
  return new Promise(resolve => {
    rl.question(`${message} [${defaultText}]: `, answer => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      
      if (normalized === '') {
        resolve(defaultValue);
      } else if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
      } else if (normalized === 'n' || normalized === 'no') {
        resolve(false);
      } else {
        resolve(defaultValue);
      }
    });
  });
}

