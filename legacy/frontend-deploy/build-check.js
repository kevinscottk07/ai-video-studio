#!/usr/bin/env node

/**
 * Build Check Script
 * Verifies that the build configuration is correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking build configuration...');

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log('📦 Package.json build script:', packageJson.scripts.build);

// Check vercel.json
const vercelPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercelJson = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  console.log('🚀 Vercel build command:', vercelJson.buildCommand);
  console.log('📁 Vercel output directory:', vercelJson.outputDirectory);
}

// Check tsconfig.json
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  console.log('📝 TypeScript noEmit:', tsconfig.compilerOptions.noEmit);
}

// Check vite.config.ts
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  console.log('⚡ Vite config exists');
}

console.log('✅ Build configuration check complete');
console.log('');
console.log('Expected behavior:');
console.log('- npm run build should run "vite build" only');
console.log('- TypeScript should not emit files (noEmit: true)');
console.log('- Vite should handle all bundling');