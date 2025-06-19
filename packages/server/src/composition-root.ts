import type { D1Database } from '@cloudflare/workers-types';
import { createAuthCompositionRoot } from '@testcrate/auth';
import { createD1EventStoreRoot } from '@testcrate/eventstore-d1';
import { UserAggregate, type UserState } from '@testcrate/core';

export interface ServerCompositionRootConfig {
  eventsDb: D1Database;
  authDb: D1Database;
  mainDb: D1Database;
  tokenPepper: string;
}

export interface ServerCompositionRoot {
  // Auth components
  authMigrations: ReturnType<typeof createAuthCompositionRoot>['migrations'];
  authService: ReturnType<typeof createAuthCompositionRoot>['authService'];
  authUnitOfWork: ReturnType<typeof createAuthCompositionRoot>['unitOfWork'];

  // Event store components
  aggregateRegistry: ReturnType<typeof createD1EventStoreRoot>['aggregateRegistry'];
  aggregateRepository: ReturnType<typeof createD1EventStoreRoot>['aggregateRepository'];

  // Combined functionality
  eventsDb: D1Database;
  authDb: D1Database;
  mainDb: D1Database;
}

// Singleton instance
let compositionRootPromise: Promise<ServerCompositionRoot> | null = null;

/**
 * Detailed composition root creation function
 * Use this for testing or when you need full control over configuration
 */
async function createServerCompositionRoot(config: ServerCompositionRootConfig): Promise<ServerCompositionRoot> {
  const { eventsDb, authDb, mainDb, tokenPepper } = config;

  // Create auth composition root
  const authRoot = createAuthCompositionRoot({
    db: authDb,
    tokenPepper,
  });

  // Create event store root
  const eventStoreRoot = createD1EventStoreRoot({
    db: eventsDb,
  });

  // Register UserAggregate with trivial registration
  eventStoreRoot.aggregateRegistry.register<UserState>({
    prefix: 'users',
    factory: UserAggregate.factory,
    deserialize: UserAggregate.parseSnapshotData,
  });

  return {
    // Auth components
    authMigrations: authRoot.migrations,
    authService: authRoot.authService,
    authUnitOfWork: authRoot.unitOfWork,

    // Event store components
    aggregateRegistry: eventStoreRoot.aggregateRegistry,
    aggregateRepository: eventStoreRoot.aggregateRepository,

    // Combined functionality
    eventsDb,
    authDb,
    mainDb,
  };
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
    eventsDb: env.testcrate_events,
    authDb: env.testcrate_auth,
    mainDb: env.testcrate_db,
    tokenPepper: env.TOKEN_PEPPER,
  });
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetCompositionRoot(): void {
  compositionRootPromise = null;
}
