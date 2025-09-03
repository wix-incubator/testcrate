import type { D1Database } from '@cloudflare/workers-types';
import type { Build, BuildId, BuildStager, ProjectId } from '@testcrate/core';
import type { D1StatementBatch } from '@testcrate/database-d1';
import { BUILDS_TABLE_NAME } from '@core-d1/consts';
import { BuildMapper } from '@core-d1/mappers';

export interface D1BuildStagerConfig {
  db: D1Database;
  batch: D1StatementBatch;
}

export class D1BuildStager implements BuildStager {
  constructor(private readonly config: D1BuildStagerConfig) {}

  putBuild(payload: Build): void {
    const dto = BuildMapper.toDTO(payload);
    const stmt = this.config.db
      .prepare(
        `INSERT INTO ${BUILDS_TABLE_NAME} (project_id, id, parent_id, root_id, history_id, name, stage, status, status_message, status_trace, labels, links, parameters, attachments, start, stop, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id) DO UPDATE SET
           parent_id = excluded.parent_id,
           root_id = excluded.root_id,
           history_id = excluded.history_id,
           name = excluded.name,
           stage = excluded.stage,
           status = excluded.status,
           status_message = excluded.status_message,
           status_trace = excluded.status_trace,
           labels = excluded.labels,
           links = excluded.links,
           parameters = excluded.parameters,
           attachments = excluded.attachments,
           start = excluded.start,
           stop = excluded.stop,
           updated_at = COALESCE(excluded.updated_at, excluded.created_at),
           updated_by = COALESCE(excluded.updated_by, excluded.created_by);`,
      )
      .bind(
        dto.project_id,
        dto.id,
        dto.parent_id,
        dto.root_id,
        dto.history_id,
        dto.name,
        dto.stage,
        dto.status,
        dto.status_message,
        dto.status_trace,
        dto.labels,
        dto.links,
        dto.parameters,
        dto.attachments,
        dto.start,
        dto.stop,
        dto.created_at,
        dto.created_by,
        dto.updated_at,
        dto.updated_by,
      );

    this.config.batch.addStatement(stmt);
  }

  deleteBuild(projectId: ProjectId, buildId: BuildId): void {
    const stmt = this.config.db.prepare(`DELETE FROM ${BUILDS_TABLE_NAME} WHERE project_id = ? AND id = ?`).bind(projectId, buildId);
    this.config.batch.addStatement(stmt);
  }
}
