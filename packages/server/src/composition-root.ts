import type { D1Database } from '@cloudflare/workers-types';
import { memory } from '@testcrate/core';
import type {
  AttachmentController,
  ProjectController,
  BuildController,
  BuildStepController,
  ExportController,
  StoredItemController,
} from '@testcrate/core';

export interface ServerCompositionRootConfig {
  mainDb: D1Database;
}

export interface ServerCompositionRoot {
  readonly db: memory.InMemoryDatabase;
  readonly mainDb: D1Database;
  readonly attachmentController: AttachmentController;
  readonly buildController: BuildController;
  readonly buildStepController: BuildStepController;
  readonly exportController: ExportController;
  readonly projectController: ProjectController;
  readonly storedItemController: StoredItemController;
}

// Singleton instance
let compositionRootPromise: Promise<ServerCompositionRoot> | null = null;

/**
 * Detailed composition root creation function
 * Use this for testing or when you need full control over configuration
 */
async function createServerCompositionRoot(
  config: ServerCompositionRootConfig,
): Promise<ServerCompositionRoot> {
  const { mainDb } = config;
  const {
    db,
    attachmentController,
    projectController,
    buildController,
    buildStepController,
    exportController,
    storedItemController,
  } = memory.createCompositionRoot();

  const root: ServerCompositionRoot = {
    db,
    mainDb,
    attachmentController,
    projectController,
    buildController,
    buildStepController,
    exportController,
    storedItemController,
  };
  return root;
}

/**
 * Get or create the singleton composition root instance (detailed version)
 * Use this for testing or when you need full control over configuration
 */
export function getCompositionRoot(config: ServerCompositionRootConfig): Promise<ServerCompositionRoot> {
  if (!compositionRootPromise) {
    compositionRootPromise = createServerCompositionRoot(config);
  }
  return compositionRootPromise;
}

/**
 * Simplified composition root creation for Cloudflare Workers
 * Takes the Cloudflare Env directly and extracts what we need
 */
export function getCompositionRootFromEnv(env: Env): Promise<ServerCompositionRoot> {
  return getCompositionRoot({
    // eventsDb: env.testcrate_events,
    // authDb: env.testcrate_auth,
    mainDb: env.testcrate_db,
    // tokenPepper: env.TOKEN_PEPPER,
  });
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetCompositionRoot(): void {
  compositionRootPromise = null;
}
