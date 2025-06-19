/**
 * Interslavic Database Engine Worker
 *
 * This worker provides API endpoints for the Interslavic database,
 * using event sourcing and CQRS patterns with separate D1 databases
 * for events, auth, and main data.
 */

import { AutoRouter } from 'itty-router';
import { getCompositionRootFromEnv } from './composition-root';
import { initializeSystem } from './initialization';
import { registerRoutes, type AppRequest } from './routes';
import {errorResponse} from "@app/utils";

// Create a router with middleware
const router = AutoRouter();

// Middleware to attach composition root to requests
router.all('*', async (request: AppRequest, env: Env, ctx: ExecutionContext) => {
	// Get or create the composition root singleton
	request.compositionRoot = await getCompositionRootFromEnv(env);
});

// Register all routes
registerRoutes(router);

// 404 handler
router.all('*', () => errorResponse('Not Found', 404));

// Export the worker
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Initialize the system on first request (idempotent)
			const compositionRoot = await getCompositionRootFromEnv(env);
			await initializeSystem(compositionRoot);
			return router.fetch(request, env, ctx);
		} catch (error) {
			return errorResponse(error, 500);
		}
	},
} satisfies ExportedHandler<Env>;
