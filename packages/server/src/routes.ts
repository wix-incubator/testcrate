import type { IRequest } from 'itty-router';
import {jsonResponse} from '@server/utils';
import { z } from 'zod';

import type { ServerCompositionRoot } from './composition-root';
import {
  SuccessResponseSchema,
  ListProjectsRequestSchema,
  PutProjectRequestSchema,
  PatchProjectRequestSchema,
  DeleteProjectRequestSchema,
  ListBuildsRequestSchema,
  PutBuildRequestSchema,
  PatchBuildRequestSchema,
  DeleteBuildRequestSchema,
  ListBuildStepsRequestSchema,
  PutBuildStepRequestSchema,
  PatchBuildStepRequestSchema,
  DeleteBuildStepRequestSchema,
  PutStoredItemRequestSchema,
  PatchStoredItemRequestSchema,
  DeleteStoredItemRequestSchema,
  GetStoredItemRequestSchema,
  ExportBuildResultsRequestSchema,
} from '@testcrate/core';

export interface AppRequest extends IRequest {
	compositionRoot: ServerCompositionRoot;
}

/**
 * Helper function to create success response with timestamp
 */
function createSuccessResponse<T>(data: T) {
  return jsonResponse({
    success: true,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Automatic schema-via-zod routing helper
 * Extracts URL params and request body to create validated requests
 */
function createSchemaRoute<T>(
  router: any,
  method: string,
  path: string,
  schema: z.ZodType<T>,
  // Optional controller invoker; called after validation. Receives the AppRequest for access to compositionRoot
  invoke?: (req: AppRequest, parsed: T) => Promise<unknown> | unknown,
) {
  const handler = async (request: AppRequest) => {
    try {
      // Extract URL params
      const urlParams = request.params || {};

      // Extract request body for non-GET requests
      let body = {};
      if (method !== 'GET') {
        try {
          body = await request.json();
        } catch {
          // No body provided, use empty object
        }
      }

      // Combine URL params and body into request object
      const requestData = { ...urlParams, ...(method !== 'GET' ? { payload: body } : {}) };

      // Validate with schema
      const validatedRequest = schema.parse(requestData);

      // Invoke controller and return its result as data
      let result: unknown = null;
      if (invoke) {
        try {
          result = await Promise.resolve(invoke(request, validatedRequest));
        } catch (controllerError) {
          return jsonResponse({
            success: false,
            error: controllerError instanceof z.ZodError ? controllerError.errors : `${controllerError}`,
            timestamp: Date.now(),
          }, 400);
        }
      }

      return createSuccessResponse(result ?? null);
    } catch (error) {
      return jsonResponse({
        success: false,
        error: error instanceof z.ZodError ? error.errors : error,
        timestamp: Date.now(),
      }, 400);
    }
  };

  // Register the route directly
  router[method.toLowerCase()](path, handler);
}

/**
 * Register all routes with the router
 */
export function registerRoutes(router: any) {
	router.get('/api/v1/status', async (request: AppRequest) => {
		// const migrationStatus = await request.compositionRoot.authMigrations.getStatus();
		const migrationStatus = {
			total: 1,
			applied: 1,
			pending: 0,
			upToDate: true
		};

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

  // #region PROJECT ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects', ListProjectsRequestSchema, (r, req: any) => r.compositionRoot.projectController.listProjects(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:id', PutProjectRequestSchema, async (r, req: any) => {
    await r.compositionRoot.projectController.putProject(req);
    return r.compositionRoot.projectController.getProject({ id: req.id });
  });
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:id', PatchProjectRequestSchema, (r, req: any) => r.compositionRoot.projectController.patchProject(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:id', DeleteProjectRequestSchema, (r, req: any) => r.compositionRoot.projectController.deleteProject(req));
	// #endregion

  // #region BUILD ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds', ListBuildsRequestSchema, (r, req: any) => r.compositionRoot.buildController.listBuilds(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId', PutBuildRequestSchema, (r, req: any) => r.compositionRoot.buildController.putBuild(req));
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId', PatchBuildRequestSchema, (r, req: any) => r.compositionRoot.buildController.patchBuild(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId', DeleteBuildRequestSchema, (r, req: any) => r.compositionRoot.buildController.deleteBuild(req));
	// #endregion

  // #region BUILD STEP ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/steps', ListBuildStepsRequestSchema, (r, req: any) => r.compositionRoot.buildStepController.listBuildSteps(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', PutBuildStepRequestSchema, async (r, req: any) => {
    await r.compositionRoot.buildStepController.putBuildStep(req);
    return r.compositionRoot.buildStepController.getBuildStep(req);
  });
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', PatchBuildStepRequestSchema, (r, req: any) => r.compositionRoot.buildStepController.patchBuildStep(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', DeleteBuildStepRequestSchema, (r, req: any) => r.compositionRoot.buildStepController.deleteBuildStep(req));
	// #endregion

  // #region STORED ITEM ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PutStoredItemRequestSchema, async (r, req: any) => {
    await r.compositionRoot.storedItemController.putStoredItem(req);
    return r.compositionRoot.storedItemController.getStoredItem(req);
  });
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PatchStoredItemRequestSchema, (r, req: any) => r.compositionRoot.storedItemController.patchStoredItem(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', DeleteStoredItemRequestSchema, (r, req: any) => r.compositionRoot.storedItemController.deleteStoredItem(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', GetStoredItemRequestSchema, (r, req: any) => r.compositionRoot.storedItemController.getStoredItem(req));
	// #endregion

  // #region EXPORT ROUTES - Zod validation (no-op invoke for now)
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/export/:format', ExportBuildResultsRequestSchema);
	// #endregion

	return router;
}
