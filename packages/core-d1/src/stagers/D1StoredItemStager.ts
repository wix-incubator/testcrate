import type { D1Database } from '@cloudflare/workers-types';
import type { StoredItem, StoredItemId, StoredItemStager, ProjectId, BuildId } from '@testcrate/core';
import type { D1StatementBatch } from '@testcrate/database-d1';
import { STORED_ITEMS_TABLE_NAME } from '@core-d1/consts';
import { StoredItemMapper } from '@core-d1/mappers';

export interface D1StoredItemStagerConfig {
  db: D1Database;
  batch: D1StatementBatch;
}

export class D1StoredItemStager implements StoredItemStager {
  constructor(private readonly config: D1StoredItemStagerConfig) {}

  putStoredItem(payload: StoredItem): void {
    const dto = StoredItemMapper.toDTO(payload);
    const stmt = this.config.db
      .prepare(
        `INSERT INTO ${STORED_ITEMS_TABLE_NAME} (id, project_id, build_id, type, data, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           type = excluded.type,
           data = excluded.data,
           updated_at = COALESCE(excluded.updated_at, excluded.created_at),
           updated_by = COALESCE(excluded.updated_by, excluded.created_by);`,
      )
      .bind(
        dto.id,
        dto.project_id,
        dto.build_id,
        dto.type,
        dto.data,
        dto.created_at,
        dto.created_by,
        dto.updated_at,
        dto.updated_by,
      );

    this.config.batch.addStatement(stmt);
  }

  deleteStoredItem(projectId: ProjectId, buildId: BuildId, storedItemId: StoredItemId): void {
    const stmt = this.config.db.prepare(`DELETE FROM ${STORED_ITEMS_TABLE_NAME} WHERE id = ? AND project_id = ? AND build_id = ?`).bind(storedItemId, projectId, buildId);
    this.config.batch.addStatement(stmt);
  }
}
