#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Packages that should be published (not private)
const publishablePackages = [
  'packages/core',
  'packages/core-d1',
  'packages/database-d1',
  'packages/adapter-allure'
];

function updatePackageVersion(packagePath, newVersion) {
  const packageJsonPath = path.join(rootDir, packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Package.json not found at ${packageJsonPath}`);
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;

  packageJson.version = newVersion;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated ${packageJson.name}: ${oldVersion} → ${newVersion}`);

  return true;
}

function main() {
  const newVersion = process.argv[2];

  if (!newVersion) {
    console.error('Usage: node scripts/update-version.js <version>');
    console.error('Example: node scripts/update-version.js 1.2.0');
    process.exit(1);
  }

  // Validate version format (basic semver check)
  const versionRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?$/;
  if (!versionRegex.test(newVersion)) {
    console.error(`Invalid version format: ${newVersion}`);
    console.error('Version should be in semver format (e.g., 1.2.3 or 1.2.3-beta.1)');
    process.exit(1);
  }

  console.log(`Updating all publishable packages to version ${newVersion}...\n`);

  let allSuccessful = true;
  for (const packagePath of publishablePackages) {
    const success = updatePackageVersion(packagePath, newVersion);
    if (!success) {
      allSuccessful = false;
    }
  }

  if (allSuccessful) {
    console.log(`\n✅ All packages updated successfully to ${newVersion}!`);
    console.log('\nNext steps:');
    console.log('1. Review the changes');
    console.log('2. Commit the version updates');
    console.log(`3. Create and push a git tag: git tag v${newVersion} && git push origin v${newVersion}`);
    console.log('4. Create a GitHub release for the tag to trigger publishing');
  } else {
    console.log('\n❌ Some packages failed to update');
    process.exit(1);
  }
}

main();
