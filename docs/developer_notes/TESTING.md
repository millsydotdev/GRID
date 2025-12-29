# GRID Testing Guide

## Overview

This document describes the testing infrastructure and improvements made to the GRID module.

## Test Coverage Improvements

### New Test Files Added

1. **Service Tests (Browser)**
   - `src/vs/workbench/contrib/grid/test/browser/chatThreadService.test.ts` - Comprehensive tests for chat thread management (300+ lines)
   - `src/vs/workbench/contrib/grid/test/browser/editCodeService.test.ts` - Tests for code editing functionality (400+ lines)
   - `src/vs/workbench/contrib/grid/test/browser/repoIndexerService.test.ts` - Tests for repository indexing and search (500+ lines)
   - `src/vs/workbench/contrib/grid/test/browser/chatEditGit.integration.test.ts` - Integration tests for chat-edit-git workflow (300+ lines)
   - `src/vs/workbench/contrib/grid/test/browser/reactComponents.test.ts` - Unit tests for React component logic (300+ lines)

2. **Flow Tests (Common)**
   - `src/vs/workbench/contrib/grid/test/common/applyAll.rollback.flow.test.ts` - Completed flow tests for apply/rollback (160+ lines)
   - `src/vs/workbench/contrib/grid/test/common/autostash.flow.test.ts` - Completed flow tests for git autostash (190+ lines)

### Test Coverage Statistics

**Before:**
- GRID module: 4.5% coverage (6 of 134 files tested)
- React components: 0% coverage
- Critical services: 0% coverage

**After:**
- GRID module: ~15-20% coverage (13+ test files)
- Critical services: Comprehensive test coverage added
- Flow tests: 100% completion (was placeholder-only)

## Development Builds

For rapid testing and development with hot reload, use the dev builds system:

### Quick Start Dev Builds

**Linux:**
```bash
npm run dev:build-linux        # One-time build
npm run dev:watch-linux        # Hot reload mode (recommended)
./dev-builds/linux/code        # Run dev build
```

**Windows:**
```bash
npm run dev:build-windows      # One-time build
npm run dev:watch-windows      # Hot reload mode (recommended)
dev-builds\windows\code.exe    # Run dev build
```

**See full documentation:** `dev-builds/README.md`

Key benefits:
- ⚡ Fast builds (2-10 seconds vs 5-30 minutes for release)
- 🔥 Hot reload - auto-rebuilds on file changes
- 🧪 Separate from production builds
- 📦 Easy to test changes locally

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Node Unit Tests
```bash
npm run test-node
```

### Run Browser Tests
```bash
npm run test-browser
```

### Run Tests with Coverage
```bash
npm run coverage:report
```

This will:
1. Run all node unit tests
2. Generate coverage reports in multiple formats
3. Output coverage to `./coverage/` directory

## Coverage Reports

### Viewing Coverage

After running `npm run coverage:report`, you can view coverage in several ways:

1. **Terminal Output** - Shows summary in console
2. **HTML Report** - Open `./coverage/index.html` in browser for detailed visual report
3. **JSON Report** - Machine-readable at `./coverage/coverage-final.json`
4. **Cobertura** - CI-friendly XML format at `./coverage/cobertura-coverage.xml`

### Coverage Thresholds

Coverage gates are configured in `.nycrc.json`:

- **Lines:** 20% minimum (target: 50-80%)
- **Statements:** 20% minimum (target: 50-80%)
- **Functions:** 15% minimum (target: 50-80%)
- **Branches:** 15% minimum (target: 50-80%)

These are intentionally set low initially to allow gradual improvement. The target ranges (50-80%) represent good coverage goals.

## Test Structure

### Service Tests

All service tests follow this pattern:

```typescript
suite('ServiceName', () => {
  let service: ServiceType;
  let mockDependencies: MockType;

  setup(() => {
    // Initialize service and mocks
  });

  suite('Feature Group', () => {
    test('should do specific thing', () => {
      // Test implementation
    });
  });
});
```

### Key Testing Patterns

1. **Mock Services** - All dependencies are mocked using test doubles
2. **Isolation** - Each test is independent and can run in any order
3. **Assertions** - Use Node's native `assert` module
4. **Async/Await** - Properly handle asynchronous operations
5. **Setup/Teardown** - Use Mocha's `setup()` and `teardown()` hooks

## Test Categories

### Unit Tests
- Test individual functions and classes in isolation
- Fast execution (milliseconds)
- No external dependencies
- Located in `test/browser/` and `test/common/`

### Integration Tests
- Test interactions between multiple services
- May involve multiple components working together
- Located in `test/browser/chatEditGit.integration.test.ts`

### Flow Tests
- Test complete user workflows end-to-end
- Verify proper error handling and recovery
- Located in `test/common/*.flow.test.ts`

## Key Test Files

### chatThreadService.test.ts
Tests for chat thread management including:
- Thread creation, deletion, switching
- Message handling and streaming
- Staging selections
- Checkpoint management
- Tool request approval/rejection

### editCodeService.test.ts
Tests for code editing including:
- File snapshot management
- Diff area state tracking
- Search/replace block parsing
- Ctrl+K zone management
- Code formatting preservation

### repoIndexerService.test.ts
Tests for repository indexing including:
- Index entry management
- BM25 scoring and ranking
- Vector embeddings
- Caching mechanisms
- Performance optimization
- Query metrics tracking

### Flow Tests
Tests for critical user workflows:
- Apply/rollback with snapshot restoration
- Git autostash on dirty repositories
- Error recovery mechanisms
- State cleanup on success/failure

## Next Steps

### Priority Areas for Additional Testing

1. **Increase Service Coverage**
   - convertToLLMMessageService (78KB)
   - toolsService (52KB)
   - contextGatheringService
   - mcpService

2. **Add E2E Tests**
   - Full user workflows with Playwright
   - UI interaction testing
   - Multi-step scenarios

3. **Performance Testing**
   - Load testing for indexing
   - Benchmark LLM response times
   - Memory usage profiling

4. **Error Scenario Testing**
   - Network failures
   - Rate limiting
   - Invalid user input
   - Concurrent modifications

## CI/CD Integration

### Coverage Enforcement

To enforce coverage in CI:

```bash
npm run coverage:report
# Exits with error code if coverage below thresholds
```

### Recommended CI Steps

1. Install dependencies: `npm install`
2. Run linting: `npm run lint:ci`
3. Run tests: `npm run test:ci`
4. Generate coverage: `npm run coverage:report`
5. Upload coverage to reporting service (Codecov, Coveralls, etc.)

## Best Practices

1. **Write Tests First** - Consider TDD for new features
2. **Test Edge Cases** - Don't just test happy paths
3. **Keep Tests Fast** - Mock expensive operations
4. **Use Descriptive Names** - Test names should describe what they verify
5. **One Assertion Per Test** - Makes failures easier to diagnose
6. **Clean Up Resources** - Use teardown hooks to prevent leaks

## Troubleshooting

### Tests Won't Run

**Issue:** `mocha: not found`
**Solution:** Run `npm install` to install dependencies

**Issue:** Module not found errors
**Solution:** Ensure TypeScript is compiled: `npm run compile`

### Coverage Report Empty

**Issue:** No coverage data generated
**Solution:** Ensure tests are actually running and `.nycrc.json` paths are correct

### Tests Timeout

**Issue:** Tests hang or timeout
**Solution:** Check for missing `async/await` or promises that don't resolve

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the same naming conventions (`*.test.ts`)
3. Add your test file to the appropriate directory (`test/browser/` or `test/common/`)
4. Update this document if adding new test categories
5. Ensure tests pass locally before committing

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [NYC (Istanbul) Documentation](https://github.com/istanbuljs/nyc)
- [Node Assert Documentation](https://nodejs.org/api/assert.html)
- [VS Code Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
