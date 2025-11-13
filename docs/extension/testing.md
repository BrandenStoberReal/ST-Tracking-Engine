# Testing and Quality Assurance

This project uses Jest for testing and maintains quality standards through GitHub Actions CI/CD workflows.

## Test Structure

The test suite is organized in the `tests/` directory and includes:

- **Unit Tests**: Testing individual functions and utilities
- **Integration Tests**: Testing component interactions
- **Mock Setup**: Properly mocking browser and SillyTavern dependencies

## Running Tests

| Command                 | Description                    |
|-------------------------|--------------------------------|
| `npm test`              | Run all tests                  |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch`    | Run tests in watch mode        |

## Coverage Thresholds

The project maintains realistic coverage thresholds that account for the browser-dependent nature of the extension:

- Statements: 1%
- Branches: 0.5%
- Functions: 1%
- Lines: 1%

## GitHub Actions Workflows

The project uses comprehensive GitHub Actions workflows for continuous integration and delivery:

### CI Workflow (.github/workflows/ci.yml)
- Cross-platform testing (Linux, Windows, macOS)
- Multi-version Node.js testing (18.x, 20.x)
- Code formatting checks
- Type checking
- Linting
- Unit tests
- Build artifacts
- Coverage reporting

### Release Workflow (.github/workflows/release.yml)
- Automated releases on version tags
- Package creation
- GitHub release publishing

### Security Workflow (.github/workflows/security.yml)
- Weekly security scanning
- Dependency vulnerability checks
- CodeQL analysis

## Improving Test Coverage

While the current thresholds are set to allow the build to pass with the current test setup, the goal is to gradually improve test coverage by:

1. Refactoring tests to use actual implementations rather than mocks where possible
2. Adding more comprehensive tests for business logic
3. Implementing integration tests for UI components
4. Improving the overall test coverage over time

## Best Practices

- Write tests that verify actual implementation logic
- Use appropriate mocks for browser/SillyTavern dependencies
- Maintain clean, readable test code
- Follow the existing test patterns in the project
- Ensure new features are properly tested