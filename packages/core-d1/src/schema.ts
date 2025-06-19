import { z } from 'zod';

// #region PROJECT SCHEMAS
export const D1ProjectDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categories_data: z.string(), // JSON string
  categories_revision: z.number(),
  created_at: z.number(),
  created_by: z.string(),
  updated_at: z.number().nullable(),
  updated_by: z.string().nullable(),
});

export type D1ProjectDTO = z.infer<typeof D1ProjectDTOSchema>;

// #endregion

// #region BUILD SCHEMAS
export const D1BuildDTOSchema = z.object({
  project_id: z.string(),
  id: z.string(),
  parent_id: z.string().nullable(),
  root_id: z.string(),
  history_id: z.string().nullable(),
  name: z.string(),
  stage: z.number().min(0).max(3),
  // stage: z.enum(['scheduled', 'running', 'finished', 'interrupted']),
  status: z.number().min(0).max(4),
  // status: z.enum(['passed', 'failed', 'broken', 'skipped', 'unknown']).nullable(),
  status_message: z.string().nullable(),
  status_trace: z.string().nullable(),
  labels: z.string().nullable(), // JSON string
  links: z.string().nullable(), // JSON string
  parameters: z.string().nullable(), // JSON string
  attachments: z.string().nullable(), // JSON string
  start: z.number().nullable(),
  stop: z.number().nullable(),
  created_at: z.number(),
  created_by: z.string(),
  updated_at: z.number().nullable(),
  updated_by: z.string().nullable(),
});

export type D1BuildDTO = z.infer<typeof D1BuildDTOSchema>;

// #endregion

// #region STORED ITEM SCHEMAS
export const D1StoredItemDTOSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  build_id: z.string(),
  type: z.enum(['allure-container', 'allure-result']),
  data: z.string(), // Serialized JSON
  created_at: z.number(),
  created_by: z.string(),
  updated_at: z.number().nullable(),
  updated_by: z.string().nullable(),
});

export type D1StoredItemDTO = z.infer<typeof D1StoredItemDTOSchema>;
// #endregion

// #region ATTACHMENT SCHEMAS
export const D1AttachmentDTOSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  build_id: z.string(),
  name: z.string(),
  type: z.string(),
  source: z.string(),
  size: z.number().nullable(),
  created_at: z.number(),
  created_by: z.string(),
  updated_at: z.number().nullable(),
  updated_by: z.string().nullable(),
});

export type D1AttachmentDTO = z.infer<typeof D1AttachmentDTOSchema>;
// #endregion
