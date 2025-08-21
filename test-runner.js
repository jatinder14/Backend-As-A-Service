#!/usr/bin/env node

/**
 * Simple Test Runner for Webhook and Refund System
 *
 * This script runs various tests for the webhook and refund functionality
 * without requiring Jest or other testing frameworks.
 */

const { execSync } = require('child_process');

console.log('🧪 Backend-As-A-Service Test Runner\n');

// Test configurations
const tests = [
  {
    name: 'Webhook & Refund Tests',
    file: 'tests/webhook-refund.test.js',
    description: 'Tests webhook signature generation and refund validation',
  },
];

// Run individual test
function runTest(test) {
  console.log(`\n📋 Running: ${test.name}`);
  console.log(`📄 Description: ${test.description}`);
  console.log(`📁 File: ${test.file}`);
  console.log('-'.repeat(60));

  try {
    // Run the test file
    execSync(`node ${test.file}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log(`✅ ${test.name} completed successfully!\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${test.name} failed!`);
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

// Main test runner
function runAllTests() {
  console.log('Starting test suite...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Use the generated cURL commands to test your API');
    console.log('3. Check server logs for webhook processing');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
// console.log('-------------------',args);

if (args.length === 0) {
  // Run all tests
  runAllTests();
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log('Usage:');
  console.log('  node test-runner.js           # Run all tests');
  console.log('  node test-runner.js --help    # Show this help');
  console.log('  node test-runner.js --list    # List available tests');
} else if (args[0] === '--list' || args[0] === '-l') {
  console.log('Available tests:');
  tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   File: ${test.file}`);
    console.log(`   Description: ${test.description}\n`);
  });
} else {
  console.log('Unknown argument. Use --help for usage information.');
  process.exit(1);
}
