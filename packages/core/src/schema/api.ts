import { z } from 'zod';

import {
  ProjectRequestSchema,
  AttachmentIdSchema,
  AttachmentSchema,
  BuildSchema,
  BuildStepSchema,
  ProjectIdSchema,
  BuildIdSchema,
  BuildStepIdSchema,
  StoredItemIdSchema,
  StoredItemTypeSchema,
  StoredItemRequestSchema,
  StoredItemSchemaPartial,
  BuildStatusSchema,
  BuildStageSchema,
} from './entities';

// #region STANDARD API ENVELOPES
/**
 * Standard success response envelope
 */
export const SuccessResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.literal(true),
  data: dataSchema,
  timestamp: z.number().int(),
});

/**
 * Standard error response envelope
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  timestamp: z.number().int(),
});

/**
 * Standard paginated response envelope
 */
export const PaginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) => z.object({
  items: z.array(itemSchema),
  pagination: z.record(z.unknown()).optional(),
});
// #endregion

// #region PROJECT SCHEMAS
/**
 * List projects response schema
 * GET /projects
 */
export const ListProjectsRequestSchema = z.object({
  pagination: z.record(z.unknown()).optional(),
});

/**
 * Get project request schema
 * GET /projects/:projectId
 */
export const GetProjectRequestSchema = z.object({
  projectId: ProjectIdSchema,
});

/**
 * Put project request schema
 * PUT /projects/:projectId
 */
export const PutProjectRequestSchema = z.object({
  projectId: ProjectIdSchema,
  payload: ProjectRequestSchema,
});

/**
 * Patch project request schema
 * PUT /projects/:projectId
 */
export const PatchProjectRequestSchema = z.object({
  projectId: ProjectIdSchema,
  payload: ProjectRequestSchema.partial(),
});

/**
 * Delete project request schema
 * DELETE /projects/:projectId
 */
export const DeleteProjectRequestSchema = z.object({
  projectId: ProjectIdSchema,
});

// #endregion

// #region BUILD SCHEMAS
/**
 * List builds response schema
 * GET /projects/:projectId/builds
 */
export const ListBuildsRequestSchema = z.object({
  projectId: ProjectIdSchema,
  stage: z.array(BuildStageSchema).optional(),
  status: z.array(BuildStatusSchema).optional(),
  pagination: z.record(z.unknown()).optional(),
});

/**
 * Get build request schema
 * GET /projects/:projectId/builds/:buildId
 */
export const GetBuildRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
});

/**
 * Put build request schema
 * PUT /projects/:projectId/builds/:buildId
 */
export const PutBuildRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  payload: BuildSchema.omit({ id: true, projectId: true, created: true, updated: true }),
});

/**
 * Patch build request schema
 * PUT /projects/:projectId/builds/:buildId
 */
export const PatchBuildRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  payload: BuildSchema.partial().omit({ id: true, projectId: true, created: true, updated: true }),
});

/**
 * Delete build request schema
 * DELETE /projects/:projectId/builds/:buildId
 */
export const DeleteBuildRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
});

// #endregion

// #region BUILD STEP SCHEMAS
/**
 * List build steps response schema
 * GET /projects/:projectId/builds/:buildId/steps
 */
export const ListBuildStepsRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  pagination: z.record(z.unknown()).optional(),
});

/**
 * Get build step request schema
 * GET /projects/:projectId/builds/:buildId/steps/:stepId
 */
export const GetBuildStepRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
});

/**
 * Put build step request schema
 * PUT /projects/:projectId/builds/:buildId/steps/:stepId
 */
export const PutBuildStepRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
  payload: BuildStepSchema.omit({ id: true, created: true, updated: true }),
});

/**
 * Patch build step request schema
 * PUT /projects/:projectId/builds/:buildId/steps/:stepId
 */
export const PatchBuildStepRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
  payload: BuildStepSchema.partial().omit({ id: true, created: true, updated: true }),
});

/**
 * Delete build step request schema
 * DELETE /projects/:projectId/builds/:buildId/steps/:stepId
 */
export const DeleteBuildStepRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
});

// #endregion


// #region STORED ITEM SCHEMAS
/**
 * Put stored item request schema
 * PUT /projects/:projectId/builds/:buildId/items/:itemId
 */
export const PutStoredItemRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  itemId: StoredItemIdSchema,
  payload: StoredItemRequestSchema,
});

/**
 * Patch stored item request schema
 * PATCH /projects/:projectId/builds/:buildId/items/:itemId
 */
export const PatchStoredItemRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  itemId: z.string().uuid(),
  payload: StoredItemSchemaPartial,
});

/**
 * Delete stored item request schema
 * DELETE /projects/:projectId/builds/:buildId/items/:itemId
 */
export const DeleteStoredItemRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  itemId: z.string().uuid(),
});

/**
 * List stored items request schema
 * GET /projects/:projectId/builds/:buildId/items
 */
export const ListStoredItemsRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  type: z.array(StoredItemTypeSchema).optional(),
  pagination: z.record(z.unknown()).optional(),
});

/**
 * Get stored item request schema
 * GET /projects/:projectId/builds/:buildId/items/:itemId
 */
export const GetStoredItemRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  itemId: z.string().uuid(),
});
// #endregion

// #region EXPORT SCHEMAS
/**
 * Export build results to specified format request schema.
 * GET /projects/:projectId/builds/:buildId/export/:format
 */
export const ExportBuildResultsRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  format: z.enum(['allure-results', 'log', 'markdown']),
});
// #endregion

// #region ATTACHMENT SCHEMAS

export const ListBuildStepAttachmentsRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
  pagination: z.record(z.unknown()).optional(),
});

export const ListBuildAttachmentsRequestSchema = ListBuildStepAttachmentsRequestSchema.omit({ stepId: true });

export const GetBuildStepAttachmentRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
  attachmentId: AttachmentIdSchema,
});

export const GetBuildAttachmentRequestSchema = GetBuildStepAttachmentRequestSchema.omit({ stepId: true });
export const GetProjectAttachmentRequestSchema = GetBuildStepAttachmentRequestSchema.omit({ buildId: true, stepId: true });
export const GetAttachmentRequestSchema = GetBuildStepAttachmentRequestSchema.omit({ buildId: true, stepId: true, projectId: true });

export const PutBuildStepAttachmentRequestSchema = z.object({
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  stepId: BuildStepIdSchema,
  attachmentId: AttachmentIdSchema,
  payload: AttachmentSchema.omit({ id: true, created: true, updated: true }),
});

export const PutBuildAttachmentRequestSchema = PutBuildStepAttachmentRequestSchema.omit({ stepId: true });

// #endregion

// #region TYPESCRIPT TYPES

// Standard envelope types
export type SuccessResponse<T> = z.infer<ReturnType<typeof SuccessResponseSchema<T>>>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<T>>>;

// Project types
export type ListProjectsRequest = z.infer<typeof ListProjectsRequestSchema>;
export type GetProjectRequest = z.infer<typeof GetProjectRequestSchema>;
export type PutProjectRequest = z.infer<typeof PutProjectRequestSchema>;
export type PatchProjectRequest = z.infer<typeof PatchProjectRequestSchema>;
export type DeleteProjectRequest = z.infer<typeof DeleteProjectRequestSchema>;

// Build types
export type ListBuildsRequest = z.infer<typeof ListBuildsRequestSchema>;
export type GetBuildRequest = z.infer<typeof GetBuildRequestSchema>;
export type PutBuildRequest = z.infer<typeof PutBuildRequestSchema>;
export type PatchBuildRequest = z.infer<typeof PatchBuildRequestSchema>;
export type DeleteBuildRequest = z.infer<typeof DeleteBuildRequestSchema>;

// Build step types
export type ListBuildStepsRequest = z.infer<typeof ListBuildStepsRequestSchema>;
export type GetBuildStepRequest = z.infer<typeof GetBuildStepRequestSchema>;
export type PutBuildStepRequest = z.infer<typeof PutBuildStepRequestSchema>;
export type PatchBuildStepRequest = z.infer<typeof PatchBuildStepRequestSchema>;
export type DeleteBuildStepRequest = z.infer<typeof DeleteBuildStepRequestSchema>;

// Stored item types
export type ListStoredItemsRequest = z.infer<typeof ListStoredItemsRequestSchema>;
export type GetStoredItemRequest = z.infer<typeof GetStoredItemRequestSchema>;
export type PutStoredItemRequest = z.infer<typeof PutStoredItemRequestSchema>;
export type PatchStoredItemRequest = z.infer<typeof PatchStoredItemRequestSchema>;
export type DeleteStoredItemRequest = z.infer<typeof DeleteStoredItemRequestSchema>;

// Export types
export type ExportBuildResultsRequest = z.infer<typeof ExportBuildResultsRequestSchema>;

// Attachment types
export type ListBuildStepAttachmentsRequest = z.infer<typeof ListBuildStepAttachmentsRequestSchema>;
export type ListBuildAttachmentsRequest = z.infer<typeof ListBuildAttachmentsRequestSchema>;
export type GetProjectAttachmentRequest = z.infer<typeof GetProjectAttachmentRequestSchema>;
export type GetBuildAttachmentRequest = z.infer<typeof GetBuildAttachmentRequestSchema>;
export type GetAttachmentRequest = z.infer<typeof GetAttachmentRequestSchema>;
export type GetBuildStepAttachmentRequest = z.infer<typeof GetBuildStepAttachmentRequestSchema>;
export type PutBuildStepAttachmentRequest = z.infer<typeof PutBuildStepAttachmentRequestSchema>;
export type PutBuildAttachmentRequest = z.infer<typeof PutBuildAttachmentRequestSchema>;

// #endregion
