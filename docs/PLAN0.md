# Allure Server Implementation Plan v0 (Minimalistic)

## Project Overview

### What We're Building
A minimalistic Allure test results server that:
- Stores raw Allure Result and Container objects
- Manages projects with their builds and test history
- Tracks test execution history with category assignments
- Provides HTTP API for data ingestion and retrieval
- Enables reconstruction of allure-results folders per build

### Core Concepts
- **Projects**: Top-level containers with categories configuration
- **Builds**: Test executions within a project (with metadata like executor, environment)
- **Results & Containers**: Raw Allure objects stored globally with project/build references
- **Test History**: Per-project tracking of test execution patterns

## Data Model Design

Using Wix CloudStore (see `docs/features/cloud-store.md`):

### 1. Projects Collection (Global)
```typescript
interface Project {
  id: string;              // projectId (e.g., "my-test-project")
  name: string;             // Human-readable project name
  description?: string;     // Optional description
  categories: Category[];   // Project-specific categories
  categoriesRevision: number; // Incremented when categories change
  createdAt: number;
  updatedAt: number;
}

// Allure Category definition
interface Category {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  messageRegex?: string;
  traceRegex?: string;
  matchedStatuses?: Status[];
  flaky?: boolean;
}

// Usage:
const projects = ctx.cloudStore.collection<Project>('AllureProjects').build();
```

### 2. Builds Collection (Per Project)
```typescript
interface Build {
  id: string;               // buildId (generated UUID)
  groupId?: string; // Build group id
  name?: string;
  url?: string;
  order?: number;

  // Allure metadata
  environment?: Record<string, string>;

  // References to content
  resultUuids: string[];    // UUIDs of results in this build
  containerUuids: string[]; // UUIDs of containers in this build

  // Statistics (updated as results come in)
  categoriesTrend?: CategoriesTrend;
  durationTrend?: DurationTrend;
  historyTrend?: HistoryTrend;
  retryTrend?: RetryTrend;

  createdAt: number;
  updatedAt: number;
}

// Usage: One collection per project
const builds = ctx.cloudStore
  .collection<Build>(`Builds_${projectId}`)
  .indexedBy('buildOrder')
  .build();
```

### 3. Allure Results Collection (Global)
```typescript
interface StoredResult {
  uuid: string;             // result.uuid (globally unique)
  projectId: string;        // Project this belongs to
  buildId: string;          // Build this belongs to
  result: Result;           // Raw Allure Result object (as provided in requirements)
  computedCategories?: string[]; // Cached category matches
  categoriesRevision?: number;   // Revision when categories were computed
  createdAt: number;
}

// Usage: Global collection
const results = ctx.cloudStore
  .collection<StoredResult>('AllureResults')
  .build();
```

### 4. Allure Containers Collection (Global)
```typescript
interface StoredContainer {
  uuid: string;             // container.uuid (globally unique)
  projectId: string;        // Project this belongs to
  buildId: string;          // Build this belongs to
  container: Container;     // Raw Allure Container object (as provided in requirements)
  createdAt: number;
}

// Usage: Global collection
const containers = ctx.cloudStore
  .collection<StoredContainer>('AllureContainers')
  .build();
```

### 5. Test History Collection (Per Project)

```typescript
interface TestHistoryEntry {
  historyId: string;        // historyId (e.g., md5 of fullName)
  statistic: TestHistoryEntryStatistic;
  items: TestHistoryEntryItem;
  updatedAt: number;
}

interface TestHistoryEntryStatistic {
  failed: number;
  broken: number;
  skipped: number;
  passed: number;
  unknown: number;
  total: number;
}

interface TestHistoryEntryItem {
  uid: string;
  status: string;
  time: {
    start: number;
    stop: number;
    duration: number;
  };
}

// Usage: One collection per project
const testHistory = ctx.cloudStore
  .collection<TestHistoryEntry>(`TestHistory_${projectId}`)
  .build();
```

## API Design

### HTTP Endpoints

#### Public HTTP Endpoints (Read/Reporting)

```typescript
// Project Information
GET    /api/projects                    // List all projects
GET    /api/projects/:projectId         // Get project details

// Build Information
GET    /api/projects/:projectId/builds  // List builds for project
GET    /api/projects/:projectId/builds/:buildId  // Get build details
PUT    /api/projects/:projectId/builds/:buildId  // Create or update a build

// Data Retrieval
GET    /api/projects/:projectId/results/:resultId  // Get specific result
GET    /api/projects/:projectId/containers/:containerId  // Get specific container
GET    /api/projects/:projectId/builds/:buildId/allure-results  // Get all data for a build (reconstructable)

// History & Analysis
GET    /api/projects/:projectId/history          // Get all test history
GET    /api/projects/:projectId/history/:historyId // Get specific test history
GET    /api/projects/:projectId/flaky-tests      // Tests with high flakiness
GET    /api/projects/:projectId/statistics       // Project statistics

// Allure-Compatible Endpoints
GET    /api/allure-results/:id-result.json
GET    /api/allure-results/:id-container.json
GET    /api/projects/:projectId/categories.json
GET    /api/projects/:projectId/allure-history/categories-trend.json
GET    /api/projects/:projectId/allure-history/duration-trend.json
GET    /api/projects/:projectId/allure-history/history-trend.json
GET    /api/projects/:projectId/allure-history/history.json
GET    /api/projects/:projectId/allure-history/retry-trend.json
GET    /api/projects/:projectId/builds/:buildId/allure-results/list
GET    /api/projects/:projectId/builds/:buildId/environment.properties
GET    /api/projects/:projectId/builds/:buildId/executor.json
GET    /api/projects/:projectId/builds/:buildId/download

```

#### gRPC-only Endpoints (Write/Dangerous Operations)

```typescript
CreateProject
AddCategory
UpdateCategory
DeleteCategory
PurgeProject
DeleteProject
DeleteBuild
DeleteHistory
DeleteResult
DeleteContainer
```

## Implementation Details

### 1. Creating a Project
```typescript
async function createProject(name: string, description?: string): Promise<string> {
  const projectId = generateId();
  const project: Project = {
    id: projectId,
    name,
    description,
    categories: [],
    categoriesRevision: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await ctx.cloudStore.collection<Project>('AllureProjects').set(project);
  return projectId;
}
```

### 2. Creating a Build
```typescript
async function createBuild(projectId: string, metadata: Partial<Build>): Promise<string> {
  const buildsCollection = ctx.cloudStore
    .collection<Build>(`Builds_${projectId}`)
    .indexedBy('buildOrder')
    .build();

  // Get next build order
  const lastBuild = await buildsCollection
    .query()
    .orderBy(SortOrder.Descending)
    .limit(1)
    .execute();

  const buildOrder = lastBuild.items.length > 0 ? lastBuild.items[0].buildOrder + 1 : 1;
  const buildId = generateId();

  const build: Build = {
    id: buildId,
    projectId,
    buildOrder,
    buildHash: metadata.buildHash || `${Date.now()}-${buildId}`,
    reportName: metadata.reportName || `Build #${buildOrder}`,
    startTime: Date.now(),
    status: 'running',
    resultUuids: [],
    containerUuids: [],
    categoriesTrend: {},
    durationTrend: {},
    historyTrend: {},
    retryTrend: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...metadata
  };

  await buildsCollection.set(build);
  return buildId;
}
```

### 3. Writing Test Results
```typescript
async function writeResult(buildId: string, result: Result) {
  // Get build info
  const build = await getBuild(buildId);
  if (!build) throw new Error('Build not found');

  // Get project for categories
  const project = await getProject(build.projectId);

  // Store result
  const storedResult: StoredResult = {
    uuid: result.uuid,
    projectId: build.projectId,
    buildId,
    result,
    computedCategories: computeCategories(result, project.categories),
    categoriesRevision: project.categoriesRevision,
    createdAt: Date.now()
  };

  await ctx.cloudStore.collection<StoredResult>('AllureResults').set(storedResult);

  // Update build
  await updateBuildWithResult(buildId, result);

  // Update test history
  await updateTestHistory(build.projectId, buildId, result, storedResult.computedCategories, project.categoriesRevision);
}

async function updateTestHistory(
  projectId: string,
  buildId: string,
  result: Result,
  categories: string[],
  categoriesRevision: number
) {
  const historyCollection = ctx.cloudStore
    .collection<TestHistoryEntry>(`TestHistory_${projectId}`)
    .build();

  await historyCollection.getAndUpdate(result.historyId, (entry) => {
    const execution: TestHistoryExecution = {
      uid: result.uuid,
      buildId,
      status: result.status,
      time: {
        start: result.start,
        stop: result.stop,
        duration: result.stop - result.start
      },
      categories,
      categoriesRevision,
      timestamp: Date.now()
    };

    if (!entry) {
      // First time seeing this test
      return {
        historyId: result.historyId,
        statistics: { [result.status]: 1 },
        executions: [execution],
        updatedAt: Date.now()
      };
    }

    // Update existing entry
    entry.executions.push(execution);
    entry.statistics[result.status] = (entry.statistics[result.status] || 0) + 1;
    entry.updatedAt = Date.now();
    return entry;
  });
}
```

### 4. Category Updates and Lazy Recomputation
```typescript
async function updateProjectCategories(projectId: string, categories: Category[]) {
  await ctx.cloudStore.collection<Project>('AllureProjects').getAndUpdate(projectId, (p) => {
    if (!p) return undefined;
    p.categories = categories;
    p.categoriesRevision++;
    p.updatedAt = Date.now();
    return p;
  });
  // Note: We don't recompute immediately.
  // When fetching history, we can check if categoriesRevision is outdated
  // and recompute on-demand or via background job
}

// Example of lazy recomputation when fetching history
async function getTestHistory(projectId: string, historyId: string): Promise<TestHistoryEntry | null> {
  const project = await getProject(projectId);
  const history = await ctx.cloudStore
    .collection<TestHistoryEntry>(`TestHistory_${projectId}`)
    .get(historyId);

  if (!history) return null;

  // Check if any executions have outdated categories
  const needsUpdate = history.executions.some(
    exec => exec.categoriesRevision < project.categoriesRevision
  );

  if (needsUpdate) {
    // Recompute categories for outdated executions
    await recomputeHistoryCategories(history, project);
  }

  return history;
}
```

### 5. Reconstructing Allure Results for a Build
```typescript
async function getAllureResultsForBuild(buildId: string): Promise<AllureResultsBundle> {
  const build = await getBuild(buildId);
  if (!build) throw new Error('Build not found');

  const project = await getProject(build.projectId);

  const bundle = {
    results: [],
    containers: [],
    categories: project.categories,
    environment: build.environment || {},
    executor: build.executorInfo || null
  };

  // Fetch all results
  for (const uuid of build.resultUuids) {
    const storedResult = await ctx.cloudStore
      .collection<StoredResult>('AllureResults')
      .get(uuid);

    if (storedResult) {
      bundle.results.push({
        filename: `${uuid}-result.json`,
        content: storedResult.result
      });
    }
  }

  // Fetch all containers
  for (const uuid of build.containerUuids) {
    const storedContainer = await ctx.cloudStore
      .collection<StoredContainer>('AllureContainers')
      .get(uuid);

    if (storedContainer) {
      bundle.containers.push({
        filename: `${uuid}-container.json`,
        content: storedContainer.container
      });
    }
  }

  return bundle;
}
```

## Key Design Decisions

1. **Simple Hierarchy**: Project → Build → Results/Containers
2. **Global Storage**: Results and Containers stored globally (UUID is unique)
3. **Per-Project Collections**: Builds and TestHistory are per-project for isolation
4. **Categories with Revision**: Track revision to enable lazy recomputation
5. **Minimal History**: Store only essential data in history, reference full results by UUID

## Development Workflow

1. Implement project CRUD operations
2. Implement build creation and management
3. Add result/container storage endpoints
4. Implement test history tracking
5. Add category computation logic
6. Implement Allure-compatible history endpoints
7. Add analysis endpoints (flaky tests, statistics)
8. Optimize with batching where needed

## Future Enhancements

- Background job for category recomputation
- Archival of old builds
- Advanced analytics
- Real-time updates
- gRPC layer for internal tools

## References for Implementation

- **CloudStore Usage**: `docs/features/cloud-store.md`
- **HTTP Endpoints**: `examples/web-function-example/`
- **gRPC Setup**: `examples/grpc-server-example/`
- **Testing**: `docs/devex/` (check for testing guides)
- **Deployment**: `docs/operations/deploy-runtime-process.md`
- **Allure Report Format**: https://github.com/allure-framework/allure2
