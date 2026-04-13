# Testing Guide for CodePop Frontend

This guide explains how to run unit tests and end-to-end (e2e) tests for the CodePop frontend application.

## Prerequisites

Make sure you have installed the dependencies:

```bash
npm install
```

## Unit Tests

Unit tests are written using Jest and React Testing Library. They test individual components and functions in isolation.

### Running Unit Tests

```bash
# Run all unit tests once
npm test

# Run unit tests in watch mode (re-runs on file changes)
npm run test:watch

# Run unit tests with coverage
npm test -- --coverage
```

### Unit Test Structure

- Unit tests are located in the `__tests__/` directory
- Test files follow the naming convention: `*.test.tsx` or `*.test.ts`
- Example: `__tests__/inputField.test.tsx`

## End-to-End Tests

E2E tests are written using Playwright. They test the complete user journey from the browser perspective.

### Running E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests with UI mode (visual test runner)
npm run test:e2e:ui

# Run e2e tests in a specific browser
npx playwright test --project=chromium
```

### E2E Test Structure

- E2E tests are located in the `tests/e2e/` directory
- Test files follow the naming convention: `*.spec.ts`
- Example: `tests/e2e/homepage.spec.ts`

## Test Configuration

### Jest Configuration
- Configured in `jest.config.js`
- Uses Next.js integration for proper module resolution
- Includes setup file for additional configurations

### Playwright Configuration
- Configured in `playwright.config.ts`
- Runs tests across multiple browsers (Chrome, Firefox, Safari)
- Includes mobile viewport testing
- Automatically starts the dev server before running tests

## Writing Tests

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('my e2e test', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Welcome')
})
```

## Continuous Integration

For CI/CD pipelines, you can run:

```bash
# Run unit tests (headless)
npm test

# Run e2e tests (headless)
npm run test:e2e
```

## Troubleshooting

- If tests fail due to missing dependencies, run `npm install`
- For e2e tests, ensure the dev server can start on port 3000
- Check that all required environment variables are set
- Use `npm run test:e2e:ui` to debug e2e tests visually

## Test Coverage

To generate a coverage report for unit tests:

```bash
npm test -- --coverage
```

The report will be available in the `coverage/` directory.