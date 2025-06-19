import { z } from 'zod';

export const D1MigrationRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
  applied_at: z.number(),
  batch: z.number()
});

export type D1MigrationRecordDTO = z.infer<typeof D1MigrationRecordSchema>;

export const D1PaginationRequestDTOSchema = z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
});

export type D1PaginationRequestDTO = z.infer<typeof D1PaginationRequestDTOSchema>;

export const D1PaginationResponseDTOSchema = z.object({
  page: z.number().min(1),
  size: z.number().min(1).max(100),
  pages: z.number().min(1),
  items: z.number().min(0),
});

export type D1PaginationResponseDTO = z.infer<typeof D1PaginationResponseDTOSchema>;

export const D1PaginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) => z.object({
  items: z.array(itemSchema),
  pagination: D1PaginationResponseDTOSchema,
});

export type D1PaginatedResponse<T> = z.infer<ReturnType<typeof D1PaginatedResponseSchema<T>>>;
