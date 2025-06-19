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
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the worker
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Initialize the system on first request (idempotent)
			const compositionRoot = await getCompositionRootFromEnv(env);

			// Run initialization in the background (don't block the request)
			ctx.waitUntil(initializeSystem(compositionRoot, {
				adminUserId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
			}));

			// Handle the request
			return router.fetch(request, env, ctx);
		} catch (error) {
			console.error('Worker error:', error);
			return new Response(JSON.stringify({
				error: 'Internal Server Error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	},
} satisfies ExportedHandler<Env>;
