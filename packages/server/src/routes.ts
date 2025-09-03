import type { IRequest, RouterType } from 'itty-router';
import { errorResponse, jsonResponse } from '@server/utils';
import type { UserRole } from '@testcrate/core';
import {
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
  PutStoredItemRequestSchema,
  PatchStoredItemRequestSchema,
  DeleteStoredItemRequestSchema,
  GetStoredItemRequestSchema,
  ExportBuildResultsRequestSchema,
  GetAttachmentRequestSchema,
  ListBuildAttachmentsRequestSchema
} from '@testcrate/core';
import tar from 'tar-stream';
import { z } from 'zod';

import type { ServerCompositionRoot } from './composition-root';

const AuthLevels: Record<UserRole | '', number> = {
  '': 0,
  user: 1,
  agent: 2,
  admin: 3,
};

export interface AppRequest extends IRequest {
  compositionRoot: ServerCompositionRoot;
}

/**
 * Check if the user has the required authentication level
 */
function checkRole(requiredRole: UserRole, actualRole: UserRole | null): boolean {
  const requiredLevel = AuthLevels[requiredRole || ''];
  const actualLevel = AuthLevels[actualRole || ''];

  return actualLevel >= requiredLevel;
}

/**
 * Automatic schema-via-zod routing helper with authentication
 * Extracts URL params and request body to create validated requests
 */
function createSchemaRoute<T>(
  router: RouterType,
  role: UserRole,
  method: string,
  path: string,
  schema: z.ZodType<T>,
  // Optional controller invoker; called after validation. Receives the AppRequest for access to compositionRoot
  invoke?: (req: AppRequest, parsed: T) => Promise<unknown> | unknown,
) {
  const handler = async (request: AppRequest) => {
    try {
      // Check authentication level
      if (!checkRole(role, request.compositionRoot.userService.getUserRole())) {
        return errorResponse(new Error('Insufficient permissions'), 403);
      }

      // Extract request body for non-GET requests
      let payload;
      if (method !== 'GET') {
        try {
          payload = await request.json();
        } catch {
          // No body provided, use empty object
        }
      }

      const { page, size, ...query } = request.query;
      const pagination = page != null || size != null ? {
        page: page != null ? Number(page) : undefined,
        size: size != null ? Number(size) : undefined,
      } : undefined;

      // Combine URL params and body into request object
      const requestData = {
        ...request.params,
        ...query,
        ...(pagination ? { pagination } : {}),
        ...(payload ? { payload } : {}),
      };

      // Validate with schema
      const validatedRequest = schema.parse(requestData);

      // Invoke controller and return its result as data
      const result = await invoke?.(request, validatedRequest);
      return result instanceof Response ? result : jsonResponse(result ?? null);
    } catch (error) {
      return errorResponse(error);
    }
  };

  // Register the route directly
  router[method.toLowerCase()](path, handler);
}

/**
 * Register all routes with the router
 */
export function registerRoutes(router: any) {
  // #region DEBUG ROUTES - Admin only
  createSchemaRoute(router, 'admin', 'GET', '/api/private/migrations/status', z.any(), (r, _req) => r.compositionRoot.migrations.getStatus());
  createSchemaRoute(router, 'admin', 'GET', '/api/private/migrations/applied', z.any(), (r, _req) => r.compositionRoot.migrations.getAppliedMigrations());
  createSchemaRoute(router, 'admin', 'GET', '/api/private/migrations/pending', z.any(), (r, _req) => r.compositionRoot.migrations.getPendingMigrations());
  // #endregion

  // #region PROJECT ROUTES - User level required for write operations
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects', ListProjectsRequestSchema, (r, req) => r.compositionRoot.projectController.listProjects(req));
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId', GetProjectRequestSchema, (r, req) => r.compositionRoot.projectController.getProject(req));
  createSchemaRoute(router, 'admin', 'PUT', '/api/v1/projects/:projectId', PutProjectRequestSchema, (r, req) => r.compositionRoot.projectController.putProject(req));
  createSchemaRoute(router, 'admin', 'PATCH', '/api/v1/projects/:projectId', PatchProjectRequestSchema, (r, req) => r.compositionRoot.projectController.patchProject(req));
  createSchemaRoute(router, 'admin', 'DELETE', '/api/v1/projects/:projectId', DeleteProjectRequestSchema, (r, req) => r.compositionRoot.projectController.deleteProject(req));
  // #endregion

  // #region BUILD ROUTES - User level required for write operations
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId/builds', ListBuildsRequestSchema, (r, req) => r.compositionRoot.buildController.listBuilds(req));
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId/builds/:buildId', GetBuildRequestSchema, (r, req) => r.compositionRoot.buildController.getBuild(req));
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId/builds/:buildId/all', GetBuildRequestSchema, (r, req) => r.compositionRoot.buildController.getBuildWithChildren(req));
  createSchemaRoute(router, 'agent', 'PUT', '/api/v1/projects/:projectId/builds/:buildId', PutBuildRequestSchema, (r, req) => r.compositionRoot.buildController.putBuild(req));
  createSchemaRoute(router, 'agent', 'PATCH', '/api/v1/projects/:projectId/builds/:buildId', PatchBuildRequestSchema, (r, req) => r.compositionRoot.buildController.patchBuild(req));
  createSchemaRoute(router, 'admin', 'DELETE', '/api/v1/projects/:projectId/builds/:buildId', DeleteBuildRequestSchema, (r, req) => r.compositionRoot.buildController.deleteBuild(req));
  // #endregion

  // #region ATTACHMENT ROUTES - User level required for write operations
  createSchemaRoute(router, 'user', 'GET', '/api/v1/attachments/:attachmentId', GetAttachmentRequestSchema, (r, req) => r.compositionRoot.attachmentController.getAttachment(req));
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId/builds/:buildId/attachments', ListBuildAttachmentsRequestSchema, (r, req) => r.compositionRoot.attachmentController.listAttachments(req));
  createSchemaRoute(router, 'agent', 'PUT', '/api/v1/projects/:projectId/builds/:buildId/attachments/:attachmentId', PutBuildAttachmentRequestSchema, (r, req) => r.compositionRoot.attachmentController.putAttachment(req));
  // #endregion

  // #region STORED ITEM ROUTES - User level required for write operations
  createSchemaRoute(router, 'user', 'GET', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', GetStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.getStoredItem(req));
  createSchemaRoute(router, 'agent', 'PUT', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PutStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.putStoredItem(req));
  createSchemaRoute(router, 'agent', 'PATCH', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', PatchStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.patchStoredItem(req));
  createSchemaRoute(router, 'agent', 'DELETE', '/api/v1/projects/:projectId/builds/:buildId/items/:itemId', DeleteStoredItemRequestSchema, (r, req) => r.compositionRoot.storedItemController.deleteStoredItem(req));
  // #endregion

  // #region EXPORT ROUTES - User level required for exports
  createSchemaRoute(
    router,
    'user',
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

          const allureStream =
            compositionRoot.exportController.allure.exportBuildResults(
              projectId,
              buildId,
            );

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
          const markdown =
            await compositionRoot.exportController.mcp.exportBuildResults(
              projectId,
              buildId,
            );
          return new Response(markdown, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': `attachment; filename="${projectId}-${buildId}-report.md"`,
            },
          });
        }

        default: {
          return new Response(`Unsupported format: ${format}`, { status: 400 });
        }
      }
    },
  );
  // #endregion

  return router;
}
