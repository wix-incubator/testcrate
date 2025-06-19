import { UserAggregate } from '@testcrate/core';
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
  config: InitializationConfig = {}
): Promise<void> {
  console.log('[Initialization] Starting system initialization...');

  // 1. Run auth migrations
  console.log('[Initialization] Running auth migrations...');
  const migrationResult = await compositionRoot.authMigrations.up();
  console.log('[Initialization] Auth migrations completed:', migrationResult);

  // 2. Ensure admin user exists
  const adminUserId = config.adminUserId || 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  console.log(`[Initialization] Ensuring admin user exists with ID: ${adminUserId}`);

  try {
    // Check if admin user already exists
    const existingAdmin = await compositionRoot.aggregateRepository.load<UserAggregate>(`users/${adminUserId}`);
    if (existingAdmin) {
      console.log('Admin user already exists, skipping initialization');
      return;
    }
  } catch (error) {
    // Admin user doesn't exist, continue with initialization
    console.log('Admin user not found, creating...');

    const adminAggregate = new UserAggregate(adminUserId);
    adminAggregate.initializeUser();
    adminAggregate.assignRole(adminUserId, 'admin'); // Self-assign admin role

    // Save the admin user through event store
    await compositionRoot.aggregateRepository.save(adminAggregate);

    console.log('[Initialization] Admin user created successfully');

    // Verify the admin user was created successfully
    try {
      await compositionRoot.aggregateRepository.load<UserAggregate>(`users/${adminUserId}`);
      console.log('[Initialization] ✅ Admin user created and verified successfully');
    } catch (error) {
      console.error('[Initialization] ❌ Failed to verify admin user creation:', error);
      throw error;
    }
  }

  console.log('[Initialization] System initialization completed');
}

/**
 * Check if the system is properly initialized
 */
export async function isSystemInitialized(compositionRoot: ServerCompositionRoot): Promise<boolean> {
  try {
    // Check if migrations are up to date
    const isUpToDate = await compositionRoot.authMigrations.isUpToDate();
    if (!isUpToDate) {
      return false;
    }

    // Check if admin user exists
    const adminUserId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    await compositionRoot.aggregateRepository.load<UserAggregate>(`users/${adminUserId}`);

    return true;
  } catch (error) {
    return false;
  }
}
