import type { IRequest } from 'itty-router';
import type { UserAggregate } from '@testcrate/core';

import type { ServerCompositionRoot } from './composition-root';

export interface AppRequest extends IRequest {
  compositionRoot: ServerCompositionRoot;
}

/**
 * Register all routes with the router
 */
export function registerRoutes(router: any) {
  // Health check route
  router.get('/health', async (request: AppRequest) => {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  // System status route
  router.get('/system/status', async (request: AppRequest) => {
    try {
      const migrationStatus = await request.compositionRoot.authMigrations.getStatus();

      return new Response(JSON.stringify({
        status: 'ok',
        migrations: {
          total: migrationStatus.total,
          applied: migrationStatus.applied,
          pending: migrationStatus.pending,
          upToDate: migrationStatus.pending === 0
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Admin user info route
  router.get('/admin/user', async (request: AppRequest) => {
    try {
      const adminUserId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const adminAggregate = await request.compositionRoot.aggregateRepository.load<UserAggregate>(
        `users/${adminUserId}`
      );

      return Response.json({
        success: true,
        data: {
          userId: adminAggregate.state.id,
          roles: [...adminAggregate.state.roles],
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  return router;
}
