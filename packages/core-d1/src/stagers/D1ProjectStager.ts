import type { D1Database } from '@cloudflare/workers-types';
import type { Project, ProjectId, ProjectStager } from '@testcrate/core';
import type { D1StatementBatch } from '@testcrate/database-d1';
import { PROJECTS_TABLE_NAME } from '@core-d1/consts';
import { ProjectMapper } from '@core-d1/mappers';

export interface D1ProjectStagerConfig {
  db: D1Database;
  batch: D1StatementBatch;
}

export class D1ProjectStager implements ProjectStager {
  constructor(private readonly config: D1ProjectStagerConfig) {}

  putProject(payload: Project): void {
    const dto = ProjectMapper.toDTO(payload);
    const stmt = this.config.db
      .prepare(
        `INSERT INTO ${PROJECTS_TABLE_NAME} (id, name, description, categories_data, categories_revision, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           categories_data = excluded.categories_data,
           categories_revision = excluded.categories_revision,
           updated_at = COALESCE(excluded.updated_at, excluded.created_at),
           updated_by = COALESCE(excluded.updated_by, excluded.created_by);`,
      )
      .bind(
        dto.id,
        dto.name,
        dto.description,
        dto.categories_data,
        dto.categories_revision,
        dto.created_at,
        dto.created_by,
        dto.updated_at,
        dto.updated_by,
      );

    this.config.batch.addStatement(stmt);
  }

  deleteProject(projectId: ProjectId): void {
    const stmt = this.config.db.prepare(`DELETE FROM ${PROJECTS_TABLE_NAME} WHERE id = ?`).bind(projectId);
    this.config.batch.addStatement(stmt);
  }
}
