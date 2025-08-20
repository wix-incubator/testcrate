import { z } from 'zod';

// #region Basic Allure enums
export const AllureContainerIdSchema = z.string().uuid();
export const AllureResultIdSchema = z.string().uuid();
export const AllureHistoryIdSchema = z.string().regex(/^[\dA-Fa-f]{32,128}$/, '32-128 hex characters');
export const AllureParameterModeSchema = z.enum(['hidden', 'masked', 'default']);
export const AllureStageSchema = z.enum(['scheduled', 'running', 'finished', 'pending', 'interrupted']);
export const AllureStatusSchema = z.enum(['failed', 'broken', 'passed', 'skipped', 'unknown']);
// #endregion

// #region Basic Allure components
export const AllureAttachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  source: z.string(),
  size: z.number().int().min(0).optional(),
});

export const AllureParameterSchema = z.object({
  name: z.string(),
  value: z.string(),
  excluded: z.boolean().optional(),
  mode: AllureParameterModeSchema.optional(),
});

export const AllureStatusDetailsSchema = z.object({
  message: z.string().optional(),
  trace: z.string().optional(),
});

export const AllureLabelSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const AllureLinkSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  url: z.string(),
});
// #endregion

// #region Main Allure types
// Recursive Step schema (defined separately due to recursion)
export const AllureStepSchema: z.ZodType<AllureStep> = z.lazy(() => z.object({
  name: z.string(),
  start: z.number(),
  stop: z.number(),
  stage: AllureStageSchema,
  status: AllureStatusSchema,
  statusDetails: AllureStatusDetailsSchema.optional(),
  steps: z.array(AllureStepSchema).optional(),
  attachments: z.array(AllureAttachmentSchema).optional(),
  parameters: z.array(AllureParameterSchema).optional(),
}));

export const AllureResultSchema = z.object({
  uuid: AllureResultIdSchema,
  historyId: AllureHistoryIdSchema,
  name: z.string(),
  fullName: z.string(),
  start: z.number(),
  stop: z.number(),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  stage: AllureStageSchema,
  status: AllureStatusSchema,
  statusDetails: AllureStatusDetailsSchema.optional(),
  steps: z.array(AllureStepSchema).optional(),
  labels: z.array(AllureLabelSchema).optional(),
  links: z.array(AllureLinkSchema).optional(),
  attachments: z.array(AllureAttachmentSchema).optional(),
  parameters: z.array(AllureParameterSchema).optional(),
});
// #endregion

// #region Secondary Allure types
export const AllureContainerSchema = z.object({
  uuid: AllureContainerIdSchema,
  name: z.string().optional(),
  children: z.array(z.string()),
  befores: z.array(AllureStepSchema).optional(),
  afters: z.array(AllureStepSchema).optional(),
});

export const AllureCategorySchema = z.object({
  name: z.string().optional(),
  messageRegex: z.string().optional(),
  traceRegex: z.string().optional(),
  matchedStatuses: z.array(AllureStatusSchema).optional(),
  flaky: z.boolean().optional(),
});

export const AllureExecutorInfoSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  buildOrder: z.number().optional(),
  buildName: z.string().optional(),
  buildUrl: z.string().optional(),
  reportUrl: z.string().optional(),
  reportName: z.string().optional(),
});

export const AllureTestHistoryEntryStatisticSchema = z.record(AllureStatusSchema, z.number().int().min(0));

export const AllureTestHistoryEntryItemSchema = z.object({
  uid: z.string(),
  status: AllureStatusSchema,
  time: z.object({
    start: z.number().int(),
    stop: z.number().int(),
    duration: z.number().int(),
  }),
});

export const AllureTestHistoryEntrySchema = z.object({
  historyId: AllureHistoryIdSchema,
  statistic: AllureTestHistoryEntryStatisticSchema,
  items: z.array(AllureTestHistoryEntryItemSchema),
  updatedAt: z.number().int(),
});
// #endregion

// #region TypeScript types derived from schemas
export type AllureHistoryId = z.infer<typeof AllureHistoryIdSchema>;
export type AllureStage = z.infer<typeof AllureStageSchema>;
export type AllureStatus = z.infer<typeof AllureStatusSchema>;
export type AllureParameter = z.infer<typeof AllureParameterSchema>;
export type AllureAttachment = z.infer<typeof AllureAttachmentSchema>;
export type AllureStatusDetails = z.infer<typeof AllureStatusDetailsSchema>;
export type AllureLabel = z.infer<typeof AllureLabelSchema>;
export type AllureLink = z.infer<typeof AllureLinkSchema>;

// Step cannot be inferred from the schema because it's recursive
export interface AllureStep {
  name: string;
  start: number;
  stop: number;
  stage: AllureStage;
  status: AllureStatus;
  statusDetails?: AllureStatusDetails;
  steps?: AllureStep[];
  attachments?: AllureAttachment[];
  parameters?: AllureParameter[];
}

export type AllureContainer = z.infer<typeof AllureContainerSchema>;
export type AllureResult = z.infer<typeof AllureResultSchema>;
export type AllureCategory = z.infer<typeof AllureCategorySchema>;
export type AllureExecutorInfo = z.infer<typeof AllureExecutorInfoSchema>;

export type AllureTestHistoryEntryStatistic = z.infer<typeof AllureTestHistoryEntryStatisticSchema>;
export type AllureTestHistoryEntryItem = z.infer<typeof AllureTestHistoryEntryItemSchema>;
export type AllureTestHistoryEntry = z.infer<typeof AllureTestHistoryEntrySchema>;
// #endregion
