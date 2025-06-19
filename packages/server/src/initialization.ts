import type {ServerCompositionRoot} from './composition-root';

export interface InitializationConfig {
  adminUserId?: string;
  adminEmail?: string;
}

/**
 * Initialize the system: run migrations and ensure admin user exists
 */
export async function initializeSystem(
  compositionRoot: ServerCompositionRoot,
): Promise<void> {
  console.log('[Initialization] Starting system initialization...');

  console.log('[Initialization] Running auth migrations...');
  const migrationResult = await compositionRoot.authMigrations.up();
  console.log('[Initialization] Auth migrations completed:', migrationResult);

  console.log('[Initialization] Running event store migrations...');
  const eventStoreMigrationResult = await compositionRoot.eventStoreMigrations.up();
  console.log('[Initialization] Event store migrations completed:', eventStoreMigrationResult);
}

/**
 * Check if the system is properly initialized
 */
export async function isSystemInitialized(compositionRoot: ServerCompositionRoot): Promise<boolean> {
  try {
	  return await compositionRoot.authMigrations.isUpToDate();
  } catch {
    return false;
  }
}
