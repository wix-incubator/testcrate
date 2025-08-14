import { z } from 'zod';

// #region Basic Allure enums
export const ContainerIdSchema = z.string().uuid();
export const ResultIdSchema = z.string().uuid();
export const HistoryIdSchema = z.string().regex(/^[\dA-Fa-f]{32,128}$/, '32-128 hex characters');
export const ParameterModeSchema = z.enum(['hidden', 'masked', 'default']);
export const StageSchema = z.enum(['scheduled', 'running', 'finished', 'pending', 'interrupted']);
export const StatusSchema = z.enum(['failed', 'broken', 'passed', 'skipped', 'unknown']);
// #endregion

// #region Basic Allure components
export const AttachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  source: z.string(),
  size: z.number().int().min(0).optional(),
});

export const ParameterSchema = z.object({
  name: z.string(),
  value: z.string(),
  excluded: z.boolean().optional(),
  mode: ParameterModeSchema.optional(),
});

export const StatusDetailsSchema = z.object({
  message: z.string().optional(),
  trace: z.string().optional(),
});

export const LabelSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const LinkSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  url: z.string(),
});
// #endregion

// #region Main Allure types
// Recursive Step schema (defined separately due to recursion)
export const StepSchema: z.ZodType<Step> = z.lazy(() => z.object({
  name: z.string(),
  start: z.number(),
  stop: z.number(),
  stage: StageSchema,
  status: StatusSchema,
  statusDetails: StatusDetailsSchema.optional(),
  steps: z.array(StepSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  parameters: z.array(ParameterSchema).optional(),
}));

export const ResultSchema = z.object({
  uuid: ResultIdSchema,
  historyId: HistoryIdSchema,
  name: z.string(),
  fullName: z.string(),
  start: z.number(),
  stop: z.number(),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  stage: StageSchema,
  status: StatusSchema,
  statusDetails: StatusDetailsSchema.optional(),
  steps: z.array(StepSchema).optional(),
  labels: z.array(LabelSchema).optional(),
  links: z.array(LinkSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  parameters: z.array(ParameterSchema).optional(),
});
// #endregion

// #region Secondary Allure types
export const ContainerSchema = z.object({
  uuid: ContainerIdSchema,
  name: z.string().optional(),
  children: z.array(z.string()),
  befores: z.array(StepSchema).optional(),
  afters: z.array(StepSchema).optional(),
});

export const CategorySchema = z.object({
  name: z.string().optional(),
  messageRegex: z.string().optional(),
  traceRegex: z.string().optional(),
  matchedStatuses: z.array(StatusSchema).optional(),
  flaky: z.boolean().optional(),
});

export const ExecutorInfoSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  buildOrder: z.number().optional(),
  buildName: z.string().optional(),
  buildUrl: z.string().optional(),
  reportUrl: z.string().optional(),
  reportName: z.string().optional(),
});

export const TestHistoryEntryStatisticSchema = z.record(StatusSchema, z.number().int().min(0));

export const TestHistoryEntryItemSchema = z.object({
  uid: z.string(),
  status: StatusSchema,
  time: z.object({
    start: z.number().int(),
    stop: z.number().int(),
    duration: z.number().int(),
  }),
});

export const TestHistoryEntrySchema = z.object({
  historyId: HistoryIdSchema,
  statistic: TestHistoryEntryStatisticSchema,
  items: z.array(TestHistoryEntryItemSchema),
  updatedAt: z.number().int(),
});
// #endregion

// #region TypeScript types derived from schemas
export type Stage = z.infer<typeof StageSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Parameter = z.infer<typeof ParameterSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type StatusDetails = z.infer<typeof StatusDetailsSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type Link = z.infer<typeof LinkSchema>;

// Step cannot be inferred from the schema because it's recursive
export interface Step {
  name: string;
  start: number;
  stop: number;
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  steps?: Step[];
  attachments?: Attachment[];
  parameters?: Parameter[];
}

export type Container = z.infer<typeof ContainerSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type ExecutorInfo = z.infer<typeof ExecutorInfoSchema>;

export type TestHistoryEntryStatistic = z.infer<typeof TestHistoryEntryStatisticSchema>;
export type TestHistoryEntryItem = z.infer<typeof TestHistoryEntryItemSchema>;
export type TestHistoryEntry = z.infer<typeof TestHistoryEntrySchema>;
// #endregion
