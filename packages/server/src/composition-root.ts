import type { D1Database } from '@cloudflare/workers-types';
import { createD1CompositionRoot } from '@testcrate/core-d1';

export interface ServerCompositionRootConfig {
  mainDb: D1Database;
}

export type ServerCompositionRoot = ReturnType<typeof createD1CompositionRoot>;

// Singleton instance
let compositionRootPromise: Promise<ServerCompositionRoot> | null = null;

/**
 * Detailed composition root creation function
 * Use this for testing or when you need full control over configuration
 */
async function createServerCompositionRoot(
  config: ServerCompositionRootConfig,
): Promise<ServerCompositionRoot> {
  const { mainDb: db } = config;
  return createD1CompositionRoot({ db })
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
 * Reset the singleton (useful for testing)
 */
export function resetCompositionRoot(): void {
  compositionRootPromise = null;
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

