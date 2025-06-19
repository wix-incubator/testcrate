import type { IRequest } from 'itty-router';
import {jsonResponse} from '@app/utils';

import type { ServerCompositionRoot } from './composition-root';

export interface AppRequest extends IRequest {
	compositionRoot: ServerCompositionRoot;
}

/**
 * Register all routes with the router
 */
export function registerRoutes(router: any) {
	router.get('/api/v1/status', async (request: AppRequest) => {
		const migrationStatus = await request.compositionRoot.authMigrations.getStatus();

		return jsonResponse({
			status: 'ok',
			migrations: {
				total: migrationStatus.total,
				applied: migrationStatus.applied,
				pending: migrationStatus.pending,
				upToDate: migrationStatus.pending === 0
			},
			timestamp: new Date().toISOString()
		});
	});

	return router;
}
