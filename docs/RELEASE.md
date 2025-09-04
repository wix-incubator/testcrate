# Release Process

This document describes how to create releases for TestCrate packages.

## Overview

TestCrate uses a tag-based release system where GitHub releases automatically trigger npm publishing for the following packages:

- `@testcrate/core`
- `@testcrate/core-d1`
- `@testcrate/database-d1`

The root `testcrate` package and `@testcrate/server` are private and will not be published.

## Release Steps

### 1. Update Package Versions

Use the helper script to update all publishable packages to the same version:

```bash
yarn version:update 1.2.0
```

This will:
- Update the version in all publishable package.json files
- Display a summary of changes
- Provide next steps

### 2. Review and Commit Changes

```bash
git add .
git commit -m "chore: bump version to 1.2.0"
```

### 3. Create and Push Git Tag

```bash
git tag v1.2.0
git push origin v1.2.0
```

### 4. Create GitHub Release

1. Go to the [Releases page](https://github.com/wix-incubator/testcrate/releases)
2. Click "Create a new release"
3. Select the tag you just created (`v1.2.0`)
4. Add release title and description
5. Click "Publish release"

### 5. Automatic Publishing

Once the GitHub release is published, the GitHub Actions workflow will:

1. Check out the code
2. Install dependencies
3. Build the project
4. Run linting and tests
5. Update package versions to match the tag
6. Publish all non-private packages to npm

## Requirements

### Environment Setup

The following secrets must be configured in the GitHub repository:

- `NPM_TOKEN`: An npm access token with publish permissions for the `@testcrate` scope

### Version Format

Versions should follow [semantic versioning](https://semver.org/):
- `1.0.0` - Major release
- `1.1.0` - Minor release (new features)
- `1.0.1` - Patch release (bug fixes)
- `1.0.0-beta.1` - Pre-release

## Troubleshooting

### Publishing Failed

If the GitHub Actions workflow fails:

1. Check the workflow logs in the Actions tab
2. Verify the `NPM_TOKEN` secret is correctly configured
3. Ensure all tests pass locally
4. Re-run the workflow if it was a temporary issue

### Version Conflicts

If npm rejects the publish due to existing versions:

1. Check what versions are already published: `npm view @testcrate/core versions --json`
2. Update to a new version number
3. Create a new tag and release

### Rollback

To rollback a problematic release:

1. Use npm deprecate: `npm deprecate @testcrate/core@1.2.0 "This version has critical issues, please upgrade"`
2. Publish a fixed version immediately
3. Update documentation if needed

## Manual Publishing (Emergency)

In case automatic publishing fails and you need to publish manually:

```bash
# Build and test
yarn build
yarn lint
yarn test

# Update versions
yarn version:update 1.2.1

# Publish all non-private packages at once
yarn workspaces foreach --no-private yarn npm publish --access public

# OR publish each package individually
cd packages/core && yarn npm publish --access public
cd ../core-d1 && yarn npm publish --access public
cd ../database-d1 && yarn npm publish --access public
```

## CI/CD Workflows

### CI Workflow
- **Triggers**: Pull requests and pushes to master
- **Actions**: Lint, test, build
- **File**: `.github/workflows/ci.yml`

### Release Workflow
- **Triggers**: GitHub releases
- **Actions**: Build, test, version update, npm publish
- **File**: `.github/workflows/release.yml`
