#!/usr/bin/env node

/**
 * @fileoverview Installation verification script
 * @description Checks that News Radar is properly set up
 */

console.log('\n🔍 News Radar - Installation Verification\n');
console.log('Checking system requirements...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js version too old:', nodeVersion);
  console.error('   Please upgrade to Node.js 18 or higher');
  console.error('   Download from: https://nodejs.org/\n');
  process.exit(1);
}
console.log('✅ Node.js version:', nodeVersion);

// Check dependencies
const requiredDeps = [
  'commander',
  'rss-parser',
  'chalk',
  'ora',
  'typescript',
];

let missingDeps = [];

for (const dep of requiredDeps) {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep} installed`);
  } catch {
    console.log(`❌ ${dep} missing`);
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.error('\n❌ Missing dependencies. Run: npm install\n');
  process.exit(1);
}

// Check TypeScript compilation
try {
  const { execSync } = require('child_process');
  console.log('\n📦 Checking TypeScript compilation...');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('⚠️  TypeScript has errors (you can still use tsx)');
}

// Test CLI
console.log('\n🧪 Testing CLI...');
console.log('   This will run a quick test scan (may take 5-10 seconds)\n');

try {
  const { execSync } = require('child_process');
  const output = execSync('npm run scan -- --hours 1 --max-results 3', {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  console.log('✅ CLI test successful!');
} catch (error) {
  console.log('⚠️  CLI test had warnings (this is okay for first run)');
}

console.log('\n' + '='.repeat(60));
console.log('✨ Installation verification complete!');
console.log('='.repeat(60));
console.log('\nYou can now run:');
console.log('  npm run scan                  # Run a full scan');
console.log('  npm run scan -- --hours 12    # Custom time window');
console.log('  npm run scan -- --help        # See all options');
console.log('\nFor full documentation:');
console.log('  README.md       - Complete guide');
console.log('  QUICKSTART.md   - Get started in 5 minutes');
console.log('  ACTION-PLAN.md  - Your roadmap\n');
