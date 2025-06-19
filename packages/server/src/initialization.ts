import type { ServerCompositionRoot } from './composition-root';

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
  await compositionRoot.migrations.up();
}

/**
 * Check if the system is properly initialized
 */
export async function isSystemInitialized(
  compositionRoot: ServerCompositionRoot,
): Promise<boolean> {
  try {
    return await compositionRoot.migrations.isUpToDate();
  } catch {
    return false;
  }
}
