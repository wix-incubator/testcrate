import type { D1Database } from '@cloudflare/workers-types';
import type { AttachmentId, AttachmentStager, BuildId, ProjectId, StoredAttachment } from '@testcrate/core';
import type { D1StatementBatch } from '@testcrate/database-d1';
import { ATTACHMENTS_TABLE_NAME } from '@core-d1/consts';
import { AttachmentMapper } from '@core-d1/mappers';

export interface D1AttachmentStagerConfig {
  db: D1Database;
  batch: D1StatementBatch;
}

export class D1AttachmentStager implements AttachmentStager {
  constructor(private readonly config: D1AttachmentStagerConfig) {}

  putAttachment(payload: StoredAttachment): void {
    const dto = AttachmentMapper.toDTO(payload);
    const stmt = this.config.db
      .prepare(
        `INSERT INTO ${ATTACHMENTS_TABLE_NAME} (id, project_id, build_id, name, type, source, size, created_at, created_by, updated_at, updated_by) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
         ON CONFLICT(id) DO UPDATE SET \
           name = excluded.name, \
           type = excluded.type,
           source = excluded.source, \
           size = excluded.size, \
           updated_at = COALESCE(excluded.updated_at, excluded.created_at), \
           updated_by = COALESCE(excluded.updated_by, excluded.created_by);`,
      )
      .bind(
        dto.id,
        dto.project_id,
        dto.build_id,
        dto.name,
        dto.type,
        dto.source,
        dto.size,
        dto.created_at,
        dto.created_by,
        dto.updated_at,
        dto.updated_by,
      );

    this.config.batch.addStatement(stmt);
  }

  deleteAttachment(projectId: ProjectId, buildId: BuildId, attachmentId: AttachmentId): void {
    const stmt = this.config.db.prepare(`DELETE FROM ${ATTACHMENTS_TABLE_NAME} WHERE id = ? AND project_id = ? AND build_id = ?`).bind(attachmentId, projectId, buildId);
    this.config.batch.addStatement(stmt);
  }
}
