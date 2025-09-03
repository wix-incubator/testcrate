import type { D1Database } from '@cloudflare/workers-types';
import type { D1BuildDTO } from '@core-d1/schema';
import type { GetBuildRequest, ListBuildsRequest, PaginatedResponse, Build, BuildQuery } from '@testcrate/core';
import { BuildMapper } from '@core-d1/mappers';
import { D1Paginator } from '@testcrate/database-d1';

export interface D1BuildQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1BuildQuery implements BuildQuery {
  private readonly paginator: D1Paginator<Build, D1BuildDTO>;

  constructor(private readonly config: D1BuildQueryConfig) {
    this.paginator = new D1Paginator<Build, D1BuildDTO>({
      ...config,
      mapper: BuildMapper.fromDTO,
      orderBy: 'created_at DESC',
    });
  }

  async listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>> {
    const { projectId, ancestorId, stage, status } = request;

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

    return this.paginator.paginate(request, {
      where: whereConditions.join(' AND '),
      bindParams,
    });
  }

  async getBuild({ projectId, buildId }: GetBuildRequest): Promise<Build | null> {
    const stmt = this.config.db.prepare(`SELECT * FROM ${this.config.tableName} WHERE project_id = ? AND id = ?`);
    const result = await stmt.bind(projectId, buildId).first<D1BuildDTO>();
    return result ? BuildMapper.fromDTO(result) : null;
  }

  async getBuildWithChildren({ projectId, buildId }: GetBuildRequest): Promise<Build | null> {
    // Get the root build first
    const rootBuild = await this.getBuild({ projectId, buildId });
    if (!rootBuild) return null;

    // Get all builds in the same tree (same root_id)
    const stmt = this.config.db.prepare(`SELECT * FROM ${this.config.tableName} WHERE project_id = ? AND root_id = ?`);

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
