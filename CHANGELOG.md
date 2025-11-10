# Changelog

All notable changes to ST-Outfits-Extended will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-dev] - 2025-11-10

### Added

- **Development Tools**: Added ESLint and Prettier for code quality and consistency
- **Type Checking**: Added `npm run typecheck` script for TypeScript validation
- **Build Scripts**: Added `npm run clean` script to remove build artifacts
- **Code Quality**: Added comprehensive linting rules and formatting standards
- **Testing**: Set minimum coverage thresholds (80% for functions, lines, statements; 70% for branches)
- **CI/CD**: Added GitHub Actions workflow for automated testing and building
- **Documentation**: Created AGENTS.md with coding guidelines and development standards
- **Version Management**: Aligned package.json version with README

### Changed

- **Dependencies**: Updated Jest and jest-environment-jsdom to v30.2.0
- **Project Structure**: Improved .gitignore with ESLint cache and coverage directories

### Developer Experience

- **Scripts**: Added `lint`, `lint:fix`, `format`, and `format:check` commands
- **Quality Gates**: CI pipeline enforces type checking, linting, and test coverage
- **Standards**: Established coding conventions and contribution guidelines

### Technical Improvements

- **Code Quality**: Implemented automated code formatting and linting
- **Testing**: Enhanced test configuration with coverage requirements
- **Build Process**: Streamlined development workflow with new scripts

## [1.4.36] - Previous Version

For changes prior to v2.0.0-dev, please refer to the git history or previous documentation.

---

## Types of changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities