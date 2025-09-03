import type { D1Database } from '@cloudflare/workers-types';
import type { UserService } from '@testcrate/core';
import { createD1CompositionRoot } from '@testcrate/core-d1';

import { SimpleUserService } from './utils';

export interface ServerCompositionRootConfig {
  db: D1Database;
  userService?: UserService;
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
  return createD1CompositionRoot({
    db: config.db,
    userService: config.userService,
  });
}

/**
 * Get or create the singleton composition root instance (detailed version)
 * Use this for testing or when you need full control over configuration
 */
export function getCompositionRoot(
  config: ServerCompositionRootConfig,
): Promise<ServerCompositionRoot> {
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
export function getCompositionRootFromEnv(
  env: Env,
  request: Request,
): Promise<ServerCompositionRoot> {
  return getCompositionRoot({
    db: env.testcrate_db,
    userService: new SimpleUserService(request, {
      adminApiKey: env.ADMIN_API_KEY,
      agentApiKey: env.AGENT_API_KEY,
      userApiKey: env.USER_API_KEY,
    }),
  });
}
