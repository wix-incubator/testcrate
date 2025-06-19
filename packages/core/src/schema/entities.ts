import { z } from 'zod';

import {
  AllureContainerSchema,
  AllureContainerIdSchema,
  AllureHistoryIdSchema,
  type AllureHistoryId,
  AllureResultIdSchema,
  AllureResultSchema,
} from './allure';

// #region ID types
export const ProjectIdSchema = z.string().min(1).max(100).regex(/^[\w.~-]+$/, 'URL-safe alphanumeric string (1..100 chars)');
export const BuildIdSchema = z.string().min(1).max(100).regex(/^[\w.~-]+$/, 'URL-safe alphanumeric string (1..100 chars)');
export const UserIdSchema = z.string().min(1).max(100).regex(/^[\w.~-]+$/, 'URL-safe alphanumeric string (1..100 chars)');

export const AttachmentIdSchema = z.string().min(1).max(100).regex(/^[\w./:~-]+$/, 'URL-safe string (1..100 chars)');
export const StoredItemIdSchema = z.union([AllureContainerIdSchema, AllureResultIdSchema]);
export const StoredItemTypeSchema = z.enum(['allure-container', 'allure-result']);
// #endregion

// #region Audit types
export const AuditInfoSchema = z.object({
  ts: z.number().int().min(0),
  userId: UserIdSchema,
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

export const BuildStatusDetailsSchema = z.object({
  message: z.string().optional(),
  trace: z.string().optional(),
});

// Categories
export const CategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(50_000).optional(),
  messageRegex: z.string().optional(),
  traceRegex: z.string().optional(),
  matchedStatuses: z.array(BuildStatusSchema).optional(),
  flaky: z.boolean().optional(),
});

// Labels
export const LabelSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(1000),
});

// Links
export const LinkSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().min(1).max(1000),
  type: z.string().min(1).max(200),
});

// Parameters
export const ParameterSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(1000),
  mode: z.enum(['hidden', 'masked', 'default']).optional(),
  excluded: z.boolean().optional(),
});

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

// Attachments
export const StoredAttachmentSchema = z.object({
  id: AttachmentIdSchema,
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  name: z.string(),
  type: z.string(),
  source: z.string(),
  size: z.number().int().min(0).optional(),
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

export const AttachmentSchema = StoredAttachmentSchema.omit({ projectId: true, buildId: true });

// Unified storage for all test artifacts
const _StoredAllureContainerSchema = z.object({
  id: AllureContainerIdSchema,
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  type: z.literal('allure-container'),
  data: AllureContainerSchema,
  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

const _StoredAllureResultSchema = z.object({
  id: AllureResultIdSchema,
  projectId: ProjectIdSchema,
  buildId: BuildIdSchema,
  type: z.literal('allure-result'),
  data: AllureResultSchema,
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

// Build entity - unified schema for both root builds and nested builds
const aBuildSchema = () => z.object({
  id: BuildIdSchema,
  projectId: ProjectIdSchema,

  // Hierarchy fields
  parentId: BuildIdSchema.optional(), // null for root builds
  rootId: BuildIdSchema, // always points to the top-level build

  historyId: AllureHistoryIdSchema.optional(),
  name: z.string().min(1).max(300),
  stage: BuildStageSchema,
  status: BuildStatusSchema.optional(),
  statusDetails: BuildStatusDetailsSchema.optional(),

  labels: z.array(LabelSchema).optional(),
  links: z.array(LinkSchema).optional(),
  parameters: z.array(ParameterSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  start: z.number().int().optional(),
  stop: z.number().int().optional(),

  // For API responses - populated in-memory after DB query
  children: z.array(BuildSchema).optional(),

  // References to all test artifacts in this build
  items: z.array(StoredItemIdSchema).optional(),

  created: AuditInfoSchema.optional(),
  updated: AuditInfoSchema.optional(),
});

const aBuildPayloadSchema = () => aBuildSchema().omit({ id: true, projectId: true, children: true, created: true, updated: true }).partial({ rootId: true });
const aBuildPayloadPartialSchema = () => aBuildPayloadSchema().partial();

type BuildPayload = Omit<Build, 'id' | 'projectId' | 'created' | 'updated' | 'rootId' | 'children'> & { rootId?: BuildId };
type BuildPayloadPartial = Partial<BuildPayload>;

export const BuildSchema: z.ZodType<Build> = z.lazy(aBuildSchema);
export const BuildPayloadSchema: z.ZodType<BuildPayload> = z.lazy(aBuildPayloadSchema);
export const BuildPayloadPartialSchema: z.ZodType<BuildPayloadPartial> = z.lazy(aBuildPayloadPartialSchema);

// TypeScript types
export type AuditInfo = z.infer<typeof AuditInfoSchema>;

export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type BuildId = z.infer<typeof BuildIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type BuildStage = z.infer<typeof BuildStageSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;

export type StoredItem = z.infer<typeof StoredItemSchema>;
export type StoredItemType = z.infer<typeof StoredItemTypeSchema>;
export type AttachmentId = z.infer<typeof AttachmentIdSchema>;
export type StoredItemId = z.infer<typeof StoredItemIdSchema>;
export type StoredAttachment = z.infer<typeof StoredAttachmentSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Parameter = z.infer<typeof ParameterSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type BuildStatusDetails = z.infer<typeof BuildStatusDetailsSchema>;

export interface Auditable {
  created?: AuditInfo;
  updated?: AuditInfo;
}

export interface Build extends Auditable {
  id: BuildId;
  projectId: ProjectId;
  parentId?: BuildId;
  rootId: BuildId;
  historyId?: AllureHistoryId;
  name: string;
  stage: BuildStage;
  status?: BuildStatus;
  statusDetails?: BuildStatusDetails;
  labels?: Label[];
  links?: Link[];
  parameters?: Parameter[];
  attachments?: Attachment[];
  start?: number;
  stop?: number;
  children?: Build[];
  items?: StoredItemId[];
}
