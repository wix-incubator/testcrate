import { z } from 'zod';

import { AttachmentSchema, CategorySchema, ContainerIdSchema, ContainerSchema, HistoryIdSchema, LabelSchema, LinkSchema, ParameterSchema, ResultIdSchema, ResultSchema, TestHistoryEntryItemSchema } from './allure';

// #region ID types
export const ProjectIdSchema = z.string().min(1).max(100).regex(/^[\w.~-]+$/, 'URL-safe alphanumeric string (1..100 chars)');
export const BuildIdSchema = z.string().min(1).max(100).regex(/^[\w.~-]+$/, 'URL-safe alphanumeric string (1..100 chars)');
export const BuildStepIdSchema = z.string().uuid();
export const StoredItemIdSchema = z.union([ContainerIdSchema, ResultIdSchema]);
export const StoredItemTypeSchema = z.enum(['allure-container', 'allure-result']);
// #endregion

// #region Audit types
export const AuditInfoSchema = z.object({
  ts: z.number().int(),
  userId: z.string().min(1).max(100),
});

export const VersionedSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  revision: z.number().int().min(1),
  data: dataSchema,
});
// #endregion


// Build lifecycle - following Allure's stage/status pattern
export const BuildStageSchema = z.enum([
  'scheduled',   // Build created, waiting to start
  'running',     // Actively executing
  'finished',    // Execution completed (check status for outcome)
  'interrupted', // Cancelled/killed
]);

export const BuildStatusSchema = z.enum([
  'passed',   // All tests passed
  'failed',   // Some tests failed
  'broken',   // Build infrastructure issues
  'skipped',  // Build was skipped
  'unknown',  // Status not yet determined
]);

// Project entity (versioned - for storage)
export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categories: VersionedSchema(z.array(CategorySchema)),
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

// Project request schema (for API requests)
export const ProjectRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categories: z.array(CategorySchema).optional(),
});

// Build step (for executors/agents)
export const BuildStepSchema = z.object({
  uuid: BuildStepIdSchema,
  historyId: HistoryIdSchema,
  name: z.string().min(1).max(200),
  stage: BuildStageSchema,
  status: BuildStatusSchema.optional(),
  // Parameter-label alignment - same as test labels
  labels: z.array(LabelSchema).optional(),
  links: z.array(LinkSchema).optional(),
  parameters: z.array(ParameterSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  start: z.number().int(),
  stop: z.number().int().optional(),
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

// Unified storage for all test artifacts
const _StoredAllureContainerSchema = z.object({
  id: ContainerIdSchema,
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  type: z.literal('allure-container'),
  data: ContainerSchema,
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

const _StoredAllureResultSchema = z.object({
  id: ResultIdSchema,
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  type: z.literal('allure-result'),
  data: ResultSchema,
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

export const StoredItemSchema = z.discriminatedUnion('type', [
  _StoredAllureContainerSchema,
  _StoredAllureResultSchema,
]);

const _StoredAllureResultRequestSchema = _StoredAllureResultSchema.omit({ created: true, updated: true, id: true, projectId: true, buildId: true });
const _StoredAllureContainerRequestSchema = _StoredAllureContainerSchema.omit({ created: true, updated: true, id: true, projectId: true, buildId: true });

export const StoredItemRequestSchema = z.discriminatedUnion('type', [
  _StoredAllureContainerRequestSchema,
  _StoredAllureResultRequestSchema,
]);

export const StoredItemSchemaPartial = z.discriminatedUnion('type', [
  _StoredAllureContainerSchema.pick({ type: true }).merge(_StoredAllureContainerRequestSchema.omit({ type: true }).partial()),
  _StoredAllureResultSchema.pick({ type: true }).merge(_StoredAllureResultRequestSchema.omit({ type: true }).partial()),
]);

// Build entity
export const BuildSchema = z.object({
  id: BuildIdSchema,
  historyId: HistoryIdSchema,
  projectId: ProjectIdSchema,
  name: z.string().max(300).optional(),
  url: z.string().url().optional(),
  stage: BuildStageSchema,
  status: BuildStatusSchema.optional(),

  // Build-level attachments (CI logs, reports, etc.)
  attachments: z.array(AttachmentSchema).optional(),

  // Steps = executors/agents participating in this build
  steps: z.array(BuildStepSchema).optional(),

  // References to all test artifacts in this build
  itemIds: z.array(StoredItemIdSchema).optional(),

  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

// Test history summary (per historyId) - just store items, calculate stats on-demand
export const TestHistorySchema = z.object({
  historyId: HistoryIdSchema,
  items: z.array(TestHistoryEntryItemSchema).max(20), // Keep last 20 executions for v1
  updated: AuditInfoSchema,
});

// TypeScript types
export type AuditInfo = z.infer<typeof AuditInfoSchema>;

export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type BuildId = z.infer<typeof BuildIdSchema>;
export type BuildStepId = z.infer<typeof BuildStepIdSchema>;
export type BuildStage = z.infer<typeof BuildStageSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type BuildStep = z.infer<typeof BuildStepSchema>;
export type StoredItem = z.infer<typeof StoredItemSchema>;
export type StoredItemType = z.infer<typeof StoredItemTypeSchema>;
export type TestHistory = z.infer<typeof TestHistorySchema>;

export interface Auditable {
  created?: AuditInfo;
  updated?: AuditInfo;
}
