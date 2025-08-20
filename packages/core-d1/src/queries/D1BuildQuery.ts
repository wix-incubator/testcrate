import type { D1Database } from '@cloudflare/workers-types';
import type { D1BuildDTO, D1PaginationRequestDTO } from '@core-d1/schema';
import type {
  GetBuildRequest,
  ListBuildsRequest,
  PaginatedResponse,
  Build,
  BuildQuery,
} from '@testcrate/core';
import { BuildMapper } from '@core-d1/mappers';

export interface D1BuildQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1BuildQuery implements BuildQuery {
  constructor(private readonly config: D1BuildQueryConfig) {}

  async getBuild(request: GetBuildRequest): Promise<Build | null> {
    const stmt = this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      WHERE project_id = ? AND id = ?
    `);

    const result = await stmt.bind(request.projectId, request.buildId).first<D1BuildDTO>();
    return result ? BuildMapper.fromDTO(result) : null;
  }

  async listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>> {
    const { projectId, ancestorId, stage, status, pagination } = request;

    // Extract pagination
    const paginationData = pagination as D1PaginationRequestDTO || { page: 1, size: 20 };
    const { page, size } = paginationData;
    const offset = (page - 1) * size;

    // Build WHERE clause dynamically
    const whereConditions: string[] = ['project_id = ?'];
    const bindParams: any[] = [projectId];

    // Add ancestor filter
    if (ancestorId) {
      whereConditions.push('root_id = ?');
      bindParams.push(ancestorId);
    } else {
      // Root builds only (parent_id IS NULL)
      whereConditions.push('parent_id IS NULL');
    }

    // Add stage filter
    if (stage && stage.length > 0) {
      const stagePlaceholders = stage.map(() => '?').join(',');
      whereConditions.push(`stage IN (${stagePlaceholders})`);
      bindParams.push(...stage);
    }

    // Add status filter
    if (status && status.length > 0) {
      const statusPlaceholders = status.map(() => '?').join(',');
      whereConditions.push(`status IN (${statusPlaceholders})`);
      bindParams.push(...status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countStmt = this.config.db.prepare(`
      SELECT COUNT(*) as total FROM ${this.config.tableName}
      WHERE ${whereClause}
    `);

    const countResult = await countStmt.bind(...bindParams).first<{ total: number }>();
    const items = countResult?.total || 0;
    const pages = Math.ceil(items / size);

    // Get paginated results
    const stmt = this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      WHERE ${whereClause}
      ORDER BY start DESC, created_ts DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(...bindParams, size, offset).all<D1BuildDTO>();

    return {
      items: result.results.map(BuildMapper.fromDTO) || [],
      pagination: { page, size, pages, items },
    };
  }

  async getBuildWithChildren(projectId: string, buildId: string): Promise<Build | null> {
    // Get the root build first
    const rootBuild = await this.getBuild({ projectId, buildId });
    if (!rootBuild) return null;

    // Get all builds in the same tree (same root_id)
    const stmt = this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      WHERE project_id = ? AND root_id = ?
      ORDER BY start ASC, created_ts ASC
    `);

    const result = await stmt.bind(projectId, buildId).all<D1BuildDTO>();
    const allBuilds = result.results.map(BuildMapper.fromDTO);

    // Build the tree structure
    const buildMap = new Map<string, Build>();
    const rootBuilds: Build[] = [];

    // First pass: create map of all builds
    for (const build of allBuilds) {
      buildMap.set(build.id, { ...build, children: [] });
    }

    // Second pass: build parent-child relationships
    for (const build of allBuilds) {
      if (build.parentId) {
        const parent = buildMap.get(build.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(buildMap.get(build.id)!);
        }
      } else {
        // Root build
        rootBuilds.push(buildMap.get(build.id)!);
      }
    }

    // Return the requested build with populated children
    return buildMap.get(buildId) || null;
  }
}
