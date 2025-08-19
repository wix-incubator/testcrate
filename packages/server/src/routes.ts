import type { IRequest, IRouter } from 'itty-router';
import { jsonResponse } from '@server/utils';
import { HttpError } from '@testcrate/core';
import tar from 'tar-stream';
import { z } from 'zod';

import type { ServerCompositionRoot } from './composition-root';
import {
  SuccessResponseSchema,
  GetProjectRequestSchema,
  ListProjectsRequestSchema,
  PutProjectRequestSchema,
  PatchProjectRequestSchema,
  DeleteProjectRequestSchema,
  ListBuildsRequestSchema,
  GetBuildRequestSchema,
  PutBuildRequestSchema,
  PatchBuildRequestSchema,
  DeleteBuildRequestSchema,
  PutBuildAttachmentRequestSchema,
  ListBuildStepsRequestSchema,
  PutBuildStepRequestSchema,
  PatchBuildStepRequestSchema,
  DeleteBuildStepRequestSchema,
  PutBuildStepAttachmentRequestSchema,
  PutStoredItemRequestSchema,
  PatchStoredItemRequestSchema,
  DeleteStoredItemRequestSchema,
  GetStoredItemRequestSchema,
  ExportBuildResultsRequestSchema,
  GetAttachmentRequestSchema,
  ListBuildAttachmentsRequestSchema,
  ListBuildStepAttachmentsRequestSchema,
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
  router: IRouter,
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
          result = await invoke(request, validatedRequest);
        } catch (controllerError) {
          return jsonResponse({
            success: false,
            error: controllerError instanceof z.ZodError ? controllerError.errors : `${controllerError}`,
            timestamp: Date.now(),
          }, controllerError instanceof HttpError ? controllerError.statusCode : 400);
        }
      }

      return result instanceof Response ? result : createSuccessResponse(result ?? null);
    } catch (error) {
      return jsonResponse({
        success: false,
        error: error instanceof z.ZodError ? error.errors : error?.message ?? error,
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

  // #region DEBUG ROUTES - Zod validation (no-op invoke for now)
  createSchemaRoute(router, 'GET', '/api/v1/dump', z.any(), (r, req) => r.compositionRoot.db.dump());
  // #endregion

  // #region PROJECT ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects', ListProjectsRequestSchema, (r, req) => r.compositionRoot.projectController.listProjects(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId', GetProjectRequestSchema, (r, req) => r.compositionRoot.projectController.getProject(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId', PutProjectRequestSchema, (r, req) => r.compositionRoot.projectController.putProject(req));
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId', PatchProjectRequestSchema, (r, req) => r.compositionRoot.projectController.patchProject(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId', DeleteProjectRequestSchema, (r, req) => r.compositionRoot.projectController.deleteProject(req));
  // #endregion

  // #region BUILD ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds', ListBuildsRequestSchema, (r, req) => r.compositionRoot.buildController.listBuilds(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId', GetBuildRequestSchema, (r, req) => r.compositionRoot.buildController.getBuild(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId', PutBuildRequestSchema, (r, req) => r.compositionRoot.buildController.putBuild(req));
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId', PatchBuildRequestSchema, (r, req) => r.compositionRoot.buildController.patchBuild(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId', DeleteBuildRequestSchema, (r, req) => r.compositionRoot.buildController.deleteBuild(req));
  // #endregion

  // #region BUILD STEP ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/steps', ListBuildStepsRequestSchema, (r, req) => r.compositionRoot.buildStepController.listBuildSteps(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', PutBuildStepRequestSchema, (r, req) => r.compositionRoot.buildStepController.putBuildStep(req));
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', PatchBuildStepRequestSchema, (r, req) => r.compositionRoot.buildStepController.patchBuildStep(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId', DeleteBuildStepRequestSchema, (r, req) => r.compositionRoot.buildStepController.deleteBuildStep(req));
  // #endregion

  // #region ATTACHMENT ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'GET', '/api/v1/attachments/:attachmentId', GetAttachmentRequestSchema, (r, req) => r.compositionRoot.attachmentController.getAttachment(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/attachments', ListBuildAttachmentsRequestSchema, (r, req) => r.compositionRoot.attachmentController.listAttachments(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId/attachments', ListBuildStepAttachmentsRequestSchema, (r, req) => r.compositionRoot.attachmentController.listAttachments(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/attachments/:attachmentId', PutBuildAttachmentRequestSchema, (r, req) => r.compositionRoot.attachmentController.putBuildAttachment(req));
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/steps/:stepId/attachments/:attachmentId', PutBuildStepAttachmentRequestSchema, (r, req) => r.compositionRoot.attachmentController.putBuildStepAttachment(req));
  // #endregion

  // #region STORED ITEM ROUTES - Zod validation + controller invocation
  createSchemaRoute(router, 'PUT', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PutStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.putStoredItem(req));
  createSchemaRoute(router, 'PATCH', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PatchStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.patchStoredItem(req));
  createSchemaRoute(router, 'DELETE', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', DeleteStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.deleteStoredItem(req));
  createSchemaRoute(router, 'GET', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', GetStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.getStoredItem(req));
  // #endregion

  // #region EXPORT ROUTES - Zod validation (no-op invoke for now)
  createSchemaRoute(
    router,
    'GET',
    '/api/v1/projects/:projectId/builds/:buildId/export/:format',
    ExportBuildResultsRequestSchema,
    async ({ compositionRoot }, { projectId, buildId, format }) => {
      switch (format) {
        case 'allure-results': {
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const pack = tar.pack();

          pack.on('data', (chunk) => writer.write(chunk));
          pack.on('end', () => writer.close());

          const allureStream = compositionRoot.exportController.allure.exportBuildResults(projectId, buildId)

          for await (const { path, content } of allureStream) {
            pack.entry({ name: path }, content);
          }
          pack.finalize();

          return new Response(readable, {
            headers: {
              'Content-Type': 'application/x-tar',
              'Content-Disposition': `attachment; filename="${projectId}-${buildId}-allure-results.tar"`,
            },
          });
        }

        case 'markdown': {
          const markdown = await compositionRoot.exportController.mcp.exportBuildResults(projectId, buildId);
          return new Response(markdown, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': `attachment; filename="${projectId}-${buildId}-report.md"`,
            },
          });
        }

        default:
          return new Response(`Unsupported format: ${format}`, { status: 400 });
      }
    },
  );
  // #endregion

  return router;
}
