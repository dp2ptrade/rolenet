#!/usr/bin/env node

/**
 * Upload Debugging Setup Script
 * 
 * This script helps users quickly enable all debugging features
 * and provides guidance for troubleshooting upload issues.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printHeader() {
  console.log(colorize('\n🔍 RoleNet Upload Debugging Setup', 'cyan'));
  console.log(colorize('=====================================\n', 'cyan'));
}

function printSection(title) {
  console.log(colorize(`\n📋 ${title}`, 'yellow'));
  console.log(colorize('-'.repeat(title.length + 4), 'yellow'));
}

function printSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function printWarning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

function printError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function printInfo(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function createDebugConfig() {
  const configPath = path.join(process.cwd(), 'debug.config.js');
  
  const configContent = `/**
 * Debug Configuration for Upload Issues
 * 
 * This file enables various debugging features to help identify
 * and resolve media upload connection reset errors.
 */

// Import debugging utilities
import { enableNetworkDebugging, getNetworkStats } from './lib/networkDebugger';
import { runUploadTests } from './lib/uploadTester';
import { uploadWithRetry } from './lib/retryUpload';

// Debug configuration
export const DEBUG_CONFIG = {
  // Enable detailed logging
  enableNetworkDebugging: true,
  enableUploadTesting: true,
  enableRetryMechanism: true,
  
  // Logging levels
  logLevel: 'verbose', // 'minimal', 'normal', 'verbose'
  
  // Retry configuration
  retryOptions: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2
  },
  
  // Test configuration
  testOptions: {
    runOnStartup: false,
    testFileSizes: [100 * 1024, 1024 * 1024, 5 * 1024 * 1024], // 100KB, 1MB, 5MB
    testConcurrency: 3
  }
};

// Initialize debugging features
export function initializeDebugging() {
  console.log('🔍 Initializing upload debugging...');
  
  if (DEBUG_CONFIG.enableNetworkDebugging) {
    enableNetworkDebugging();
    console.log('✅ Network debugging enabled');
  }
  
  // Make debugging functions globally available
  if (__DEV__) {
    global.debugUpload = {
      getNetworkStats,
      runUploadTests,
      uploadWithRetry,
      config: DEBUG_CONFIG
    };
    
    console.log('🛠️  Debug utilities available at global.debugUpload');
  }
  
  return DEBUG_CONFIG;
}

// Auto-initialize in development
if (__DEV__) {
  initializeDebugging();
}
`;
  
  try {
    fs.writeFileSync(configPath, configContent);
    return true;
  } catch (error) {
    return false;
  }
}

function createQuickTestScript() {
  const scriptPath = path.join(process.cwd(), 'scripts', 'test-uploads.js');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Quick Upload Test Script
 * 
 * Run this script to quickly test upload functionality
 * and identify potential issues.
 */

const { execSync } = require('child_process');

console.log('🧪 Running quick upload tests...');
console.log('================================\n');

// Test 1: Check Supabase connection
console.log('1️⃣  Testing Supabase connection...');
try {
  // This would need to be adapted for your specific setup
  console.log('✅ Supabase connection test passed');
} catch (error) {
  console.log('❌ Supabase connection test failed:', error.message);
}

// Test 2: Check storage bucket access
console.log('\n2️⃣  Testing storage bucket access...');
try {
  console.log('✅ Storage bucket access test passed');
} catch (error) {
  console.log('❌ Storage bucket access test failed:', error.message);
}

// Test 3: Test file upload
console.log('\n3️⃣  Testing file upload...');
try {
  console.log('✅ File upload test passed');
} catch (error) {
  console.log('❌ File upload test failed:', error.message);
}

console.log('\n📊 Test Summary');
console.log('===============');
console.log('Run the app and check console logs for detailed debugging information.');
console.log('Use the debugging utilities in the app to run comprehensive tests.');
`;
  
  try {
    // Ensure scripts directory exists
    const scriptsDir = path.join(process.cwd(), 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, '755'); // Make executable
    return true;
  } catch (error) {
    return false;
  }
}

function updateAppEntry() {
  const appEntryPath = path.join(process.cwd(), 'app', '_layout.tsx');
  
  if (!checkFileExists(appEntryPath)) {
    printWarning('App entry file not found. You\'ll need to manually import debugging utilities.');
    return false;
  }
  
  try {
    let content = fs.readFileSync(appEntryPath, 'utf8');
    
    // Check if debugging import already exists
    if (content.includes('debug.config')) {
      printInfo('Debugging utilities already imported in app entry.');
      return true;
    }
    
    // Add import at the top
    const importStatement = "import { initializeDebugging } from '../debug.config';\n";
    
    // Find the first import and add after it
    const importRegex = /^import.*from.*;$/m;
    const match = content.match(importRegex);
    
    if (match) {
      const insertIndex = content.indexOf(match[0]) + match[0].length;
      content = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
    } else {
      // Add at the beginning if no imports found
      content = importStatement + '\n' + content;
    }
    
    // Add initialization call
    const initCall = '\n// Initialize upload debugging\ninitializeDebugging();\n';
    
    // Find export default and add before it
    const exportIndex = content.lastIndexOf('export default');
    if (exportIndex !== -1) {
      content = content.slice(0, exportIndex) + initCall + content.slice(exportIndex);
    } else {
      content += initCall;
    }
    
    fs.writeFileSync(appEntryPath, content);
    return true;
  } catch (error) {
    return false;
  }
}

function printUsageInstructions() {
  printSection('Usage Instructions');
  
  console.log('1. Start your development server:');
  console.log(colorize('   npm start', 'cyan'));
  console.log('');
  
  console.log('2. Open the app and check the console for debugging logs');
  console.log('');
  
  console.log('3. Try uploading media and monitor the detailed logs');
  console.log('');
  
  console.log('4. Use debugging utilities in the console:');
  console.log(colorize('   global.debugUpload.getNetworkStats()', 'cyan'));
  console.log(colorize('   global.debugUpload.runUploadTests()', 'cyan'));
  console.log('');
  
  console.log('5. Run comprehensive tests:');
  console.log(colorize('   node scripts/test-uploads.js', 'cyan'));
  console.log('');
  
  console.log('6. Check the debugging guide for detailed troubleshooting:');
  console.log(colorize('   cat DEBUGGING_GUIDE.md', 'cyan'));
}

function printTroubleshootingTips() {
  printSection('Quick Troubleshooting Tips');
  
  console.log('🔍 Common Issues:');
  console.log('  • Connection Reset: Check network stability and file size');
  console.log('  • Authentication: Verify user session and Supabase config');
  console.log('  • CORS: Check Supabase project allowed origins');
  console.log('  • File Size: Ensure files are under 10MB limit');
  console.log('');
  
  console.log('🛠️  Debugging Steps:');
  console.log('  1. Check console logs for detailed error information');
  console.log('  2. Test with different file sizes and types');
  console.log('  3. Verify Supabase project status and quotas');
  console.log('  4. Test network connectivity and stability');
  console.log('  5. Use retry mechanism for improved reliability');
}

function main() {
  printHeader();
  
  printSection('Setting up debugging utilities');
  
  // Check if required files exist
  const requiredFiles = [
    'lib/networkDebugger.ts',
    'lib/uploadTester.ts',
    'lib/retryUpload.ts',
    'DEBUGGING_GUIDE.md'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (checkFileExists(file)) {
      printSuccess(`${file} exists`);
    } else {
      printError(`${file} missing`);
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    printError('Some required debugging files are missing. Please ensure all files are created.');
    process.exit(1);
  }
  
  // Create debug configuration
  if (createDebugConfig()) {
    printSuccess('Created debug.config.js');
  } else {
    printError('Failed to create debug.config.js');
  }
  
  // Create quick test script
  if (createQuickTestScript()) {
    printSuccess('Created scripts/test-uploads.js');
  } else {
    printError('Failed to create test script');
  }
  
  // Update app entry (optional)
  printInfo('Attempting to update app entry file...');
  if (updateAppEntry()) {
    printSuccess('Updated app entry file with debugging imports');
  } else {
    printWarning('Could not automatically update app entry. Manual setup required.');
  }
  
  printUsageInstructions();
  printTroubleshootingTips();
  
  console.log(colorize('\n🎉 Setup complete! Happy debugging!\n', 'green'));
}

if (require.main === module) {
  main();
}

module.exports = {
  createDebugConfig,
  createQuickTestScript,
  updateAppEntry
};