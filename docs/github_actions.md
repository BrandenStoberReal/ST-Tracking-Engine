# GitHub Actions Workflows

This document explains the GitHub Actions workflows set up for the SillyTavern Outfit Engine project.

## Workflows

### CI (Continuous Integration)

**File**: `.github/workflows/ci.yml`

This workflow runs on every push to `main` and `develop` branches, and on every pull request to these branches.

**Jobs**:

1. **Test**:
   - Runs on multiple operating systems: Ubuntu, Windows, and macOS
   - Tests against multiple Node.js versions: 18.x and 20.x
   - Performs the following checks:
     - Code formatting (using Prettier)
     - Type checking (using TypeScript)
     - Linting (using ESLint)
     - Unit tests with coverage
     - Build process
   - Uploads coverage reports to Codecov (only on Ubuntu with Node 20.x)

2. **Build Artifacts**:
   - Runs after the test job completes successfully
   - Builds the project and uploads the built files as artifacts
   - Retains artifacts for 30 days

### Release

**File**: `.github/workflows/release.yml`

This workflow runs when a new git tag matching the pattern `v*` is pushed (e.g., `v1.0.0`).

**Jobs**:

1. **Release**:
   - Checks out the tagged code
   - Sets up Node.js environment
   - Runs type checking, linting, and tests
   - Builds the project
   - Packages the extension files into a ZIP archive
   - Creates a GitHub release with:
     - The tag name as the release name
     - Changelog content extracted from CHANGELOG.md
     - Build artifacts (extension ZIP, manifest.json, style.css, README.md)

### Security Scan

**File**: `.github/workflows/security.yml`

This workflow runs:
- Weekly (every Monday at 9 AM UTC)
- When changes are made to package.json or package-lock.json on main/develop branches
- On pull requests that modify package.json or package-lock.json

**Jobs**:

1. **Security Audit**:
   - Performs npm audit to check for security vulnerabilities
   - Runs CodeQL analysis for code security scanning
   - Optionally runs Snyk scans if a SNYK_TOKEN secret is provided

## Secrets Required

To use all features of these workflows, the following GitHub secrets should be configured in the repository:

- `SNYK_TOKEN`: (Optional) For Snyk security scanning in the security workflow

## Artifacts

Build artifacts are automatically retained for 30 days and can be downloaded from the Actions tab on GitHub.

## Code Coverage

Code coverage reports are uploaded to Codecov. The badge can be added to the README if desired.