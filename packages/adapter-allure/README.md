# @testcrate/adapter-allure

A TestCrate adapter for Allure that implements the AllureWriter interface and sends Allure test results to the TestCrate API.

## Installation

```bash
npm install @testcrate/adapter-allure
```

## Usage

```typescript
import { TestCrateAllureWriter } from '@testcrate/adapter-allure';

const writer = new TestCrateAllureWriter({
  baseUrl: 'https://testcrate.noomorph.workers.dev',
  projectId: 'your-project-id',
  buildId: 'your-build-id',
  apiKey: 'your-api-key' // Optional
});

await writer.init();

// Write categories
await writer.writeCategories([
  { name: 'Product defects', matchedStatuses: ['failed'] },
  { name: 'Test defects', matchedStatuses: ['broken'] }
]);

// Write environment info
await writer.writeEnvironmentInfo({
  NODE_ENV: 'production',
  SERVICE_URL: 'https://api.example.com'
});

// Write executor info
await writer.writeExecutorInfo({
  name: 'CI/CD Pipeline',
  type: 'github-actions',
  buildName: 'build-123',
  buildUrl: 'https://github.com/example/repo/actions/runs/123'
});

// Write test results
await writer.writeResult({
  uuid: 'test-result-123',
  name: 'Test Example',
  status: 'passed',
  // ... other result properties
});

// Write containers
await writer.writeContainer({
  uuid: 'container-123',
  name: 'Example Test Suite',
  children: ['test-result-123'],
  // ... other container properties
});

await writer.cleanup();
```

## Configuration

The `TestCrateAllureWriter` accepts the following configuration:

- `baseUrl`: The base URL of your TestCrate instance
- `projectId`: The ID of the project to store results in
- `buildId`: The ID of the build to store results in
- `apiKey`: Optional API key for authentication

## API Endpoints

The adapter uses the following TestCrate API endpoints:

- `PUT /api/v1/projects/{projectId}/builds/{buildId}` - Creates or updates a build
- `PUT /api/v1/projects/{projectId}/builds/{buildId}/items/{itemId}` - Stores Allure data as stored items

## Data Storage

All Allure data is stored as "stored items" within the specified build:

- Categories are stored as `allure-categories`
- Environment info is stored as `allure-environment`
- Executor info is stored as `allure-executor`
- Test results are stored as `result-{uuid}`
- Containers are stored as `container-{uuid}`

## Integration with allure-store

This adapter is compatible with the `allure-store` library and can be used as a custom writer:

```typescript
import { fromConfig } from 'allure-store';
import { TestCrateAllureWriter } from '@testcrate/adapter-allure';

const writer = new TestCrateAllureWriter({
  baseUrl: 'https://testcrate.noomorph.workers.dev',
  projectId: 'detox',
  buildId: 'build-123'
});

const store = await fromConfig({ writer });
```


