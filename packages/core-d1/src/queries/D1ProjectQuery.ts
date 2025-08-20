import type { D1Database } from '@cloudflare/workers-types';
import type { D1ProjectDTO, D1PaginationRequestDTO, D1PaginationResponseDTO } from '@core-d1/schema';
import type { GetProjectRequest, ListProjectsRequest, PaginatedResponse, Project, ProjectQuery } from '@testcrate/core';
import { ProjectMapper } from '@core-d1/mappers';

export interface D1ProjectQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1ProjectQuery implements ProjectQuery {
  constructor(private readonly config: D1ProjectQueryConfig) {}

  async listProjects(request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    // Extract pagination from request
    const pagination = request.pagination as D1PaginationRequestDTO || { page: 1, size: 20 };
    const { page, size } = pagination;

    // Calculate offset
    const offset = (page - 1) * size;

    // Get total count first
    const countStmt = this.config.db.prepare(`SELECT COUNT(*) as total FROM ${this.config.tableName}`);
    const countResult = await countStmt.first<{ total: number }>();
    const items = countResult?.total || 0;

    // Calculate total pages
    const pages = Math.ceil(items / size);

    // Get paginated results
    const stmt = this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      ORDER BY created_ts DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(size, offset).all<D1ProjectDTO>();

    return {
      items: result.results.map(ProjectMapper.fromDTO) || [],
      pagination: { page, size, pages, items } satisfies D1PaginationResponseDTO,
    };
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    const stmt = this.config.db.prepare(`SELECT * FROM ${this.config.tableName} WHERE id = ?`);
    const result = await stmt.bind(request.projectId).first<D1ProjectDTO>();
    return result ? ProjectMapper.fromDTO(result) : null;
  }
}
