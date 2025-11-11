#!/usr/bin/env node

/**
 * Route Verification Script
 * Scans all route imports in main.tsx and verifies that the files exist
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];
let totalRoutes = 0;
let missingRoutes = 0;

console.log('🔍 Verifying route imports...\n');

// Read main.tsx
const mainTsxPath = path.join(__dirname, '../app/main.tsx');
if (!fs.existsSync(mainTsxPath)) {
  console.error('❌ main.tsx not found at:', mainTsxPath);
  process.exit(1);
}

const mainContent = fs.readFileSync(mainTsxPath, 'utf-8');

// Extract lazy imports
const lazyImportRegex = /const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"](.+?)['"]\)\)/g;
let match;

while ((match = lazyImportRegex.exec(mainContent)) !== null) {
  const componentName = match[1];
  const importPath = match[2];
  totalRoutes++;

  // Convert import path to file path
  let filePath = importPath.replace('@/', 'app/');

  // Try different extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  let found = false;

  for (const ext of extensions) {
    const testPath = path.join(__dirname, '..', filePath + ext);
    if (fs.existsSync(testPath)) {
      found = true;
      console.log(`✅ ${componentName}: ${importPath}${ext}`);
      break;
    }
  }

  if (!found) {
    missingRoutes++;
    errors.push(`❌ ${componentName}: ${importPath} (FILE NOT FOUND)`);
    console.error(`❌ ${componentName}: ${importPath} (FILE NOT FOUND)`);
  }
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Route Verification Summary`);
console.log(`${'='.repeat(60)}`);
console.log(`Total routes checked: ${totalRoutes}`);
console.log(`✅ Valid routes: ${totalRoutes - missingRoutes}`);
console.log(`❌ Missing routes: ${missingRoutes}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings:`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log(`\n❌ Errors:`);
  errors.forEach(e => console.log(`   ${e}`));
  console.log(`\n💡 Fix these issues before running the app.`);
  process.exit(1);
}

console.log(`\n✅ All route imports verified successfully!`);
process.exit(0);
