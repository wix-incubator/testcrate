import type { D1Database } from '@cloudflare/workers-types';
import type { D1ProjectDTO } from '@core-d1/schema';
import type { GetProjectRequest, ListProjectsRequest, PaginatedResponse, Project, ProjectQuery } from '@testcrate/core';
import { ProjectMapper } from '@core-d1/mappers';
import { D1Paginator } from '@testcrate/database-d1';

export interface D1ProjectQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1ProjectQuery implements ProjectQuery {
  private readonly paginator: D1Paginator<Project, D1ProjectDTO>;

  constructor(private readonly config: D1ProjectQueryConfig) {
    this.paginator = new D1Paginator<Project, D1ProjectDTO>({
      ...config,
      mapper: ProjectMapper.fromDTO,
      orderBy: 'created_at DESC',
    });
  }

  async listProjects(request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    return this.paginator.paginate(request);
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    const stmt = this.config.db.prepare(`SELECT * FROM ${this.config.tableName} WHERE id = ?`);
    const result = await stmt.bind(request.projectId).first<D1ProjectDTO>();
    return result ? ProjectMapper.fromDTO(result) : null;
  }
}
