#!/usr/bin/env node

/**
 * Provider Verification Script
 * Checks that all required context providers are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying provider hierarchy...\n');

const errors = [];
const warnings = [];

// Check main.tsx for provider hierarchy
const mainPath = path.join(__dirname, '../app/main.tsx');
const mainContent = fs.readFileSync(mainPath, 'utf-8');

// Required providers
const requiredProviders = [
  { name: 'HelmetProvider', package: 'react-helmet-async' },
  { name: 'AuthProvider', file: 'app/context/AuthContext' },
  { name: 'SettingsProvider', file: 'app/context/SettingsContext' },
  { name: 'PlanSettingsProvider', file: 'app/context/PlanSettingsContext' },
];

console.log('✅ Checking provider imports and usage:\n');

requiredProviders.forEach(provider => {
  if (mainContent.includes(provider.name)) {
    console.log(`  ✓ ${provider.name} imported and used`);
  } else {
    errors.push(`Missing ${provider.name} in provider hierarchy`);
    console.error(`  ❌ ${provider.name} not found in main.tsx`);
  }
});

// Check App.tsx for OrderlyProvider conditional logic
const appPath = path.join(__dirname, '../app/App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8');

  console.log('\n✅ Checking App.tsx provider setup:\n');

  if (appContent.includes('OrderlyProvider')) {
    console.log('  ✓ OrderlyProvider conditional rendering found');

    // Check if needsOrderlyProvider logic exists
    if (appContent.includes('needsOrderlyProvider')) {
      console.log('  ✓ needsOrderlyProvider routing logic exists');
    } else {
      warnings.push('needsOrderlyProvider logic may be missing');
      console.warn('  ⚠️  needsOrderlyProvider logic not found');
    }
  } else {
    warnings.push('OrderlyProvider not found in App.tsx');
    console.warn('  ⚠️  OrderlyProvider not found in App.tsx');
  }
}

// Check OrderlyProvider index.tsx
const orderlyProviderPath = path.join(__dirname, '../app/components/orderlyProvider/index.tsx');
if (fs.existsSync(orderlyProviderPath)) {
  const providerContent = fs.readFileSync(orderlyProviderPath, 'utf-8');

  console.log('\n✅ Checking OrderlyProvider configuration:\n');

  // Check for wallet connectors
  const connectors = [
    'PrivyConnector',
    'WalletConnector',
    'OrderlyAppProvider',
    'LocaleProvider',
  ];

  connectors.forEach(connector => {
    if (providerContent.includes(connector)) {
      console.log(`  ✓ ${connector} configured`);
    } else {
      warnings.push(`${connector} not found in OrderlyProvider`);
      console.warn(`  ⚠️  ${connector} not found`);
    }
  });

  // Check for lazy loading issues
  if (providerContent.includes('lazy(')) {
    warnings.push('Lazy loading detected in OrderlyProvider - may cause race conditions');
    console.warn('  ⚠️  Lazy loading detected - consider eager imports for connectors');
  }
} else {
  errors.push('OrderlyProvider index.tsx not found');
  console.error('  ❌ OrderlyProvider index.tsx not found');
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Provider Verification Summary`);
console.log(`${'='.repeat(60)}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log(`\n❌ Critical Issues:`);
  errors.forEach(e => console.log(`   • ${e}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings:`);
  warnings.forEach(w => console.log(`   • ${w}`));
}

if (errors.length === 0) {
  console.log(`\n✅ Provider hierarchy verified successfully!`);
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s) found - review recommended`);
  }
  process.exit(0);
} else {
  console.log(`\n❌ ${errors.length} critical issue(s) found - must be fixed`);
  process.exit(1);
}
