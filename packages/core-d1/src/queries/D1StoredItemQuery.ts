import type { D1Database } from '@cloudflare/workers-types';
import type {
  GetStoredItemRequest,
  ListStoredItemsRequest,
  PaginatedResponse,
  StoredItem,
  StoredItemQuery,
} from '@testcrate/core';
import type { D1StoredItemDTO } from '@core-d1/schema';
import { StoredItemMapper } from '@core-d1/mappers';
import { D1Paginator } from '@testcrate/database-d1';

export interface D1StoredItemQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1StoredItemQuery implements StoredItemQuery {
  private readonly paginator: D1Paginator<StoredItem, D1StoredItemDTO>;

  constructor(private readonly config: D1StoredItemQueryConfig) {
    this.paginator = new D1Paginator<StoredItem, D1StoredItemDTO>({
      ...config,
      mapper: StoredItemMapper.fromDTO,
    });
  }

  async listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>> {
    const { projectId, buildId, type } = request;

    // Build WHERE clause dynamically
    const whereConditions: string[] = ['project_id = ?', 'build_id = ?'];
    const bindParams: any[] = [projectId, buildId];

    // Add type filter
    if (type && type.length > 0) {
      const typePlaceholders = type.map(() => '?').join(',');
      whereConditions.push(`type IN (${typePlaceholders})`);
      bindParams.push(...type);
    }

    return this.paginator.paginate(request, {
      where: whereConditions.join(' AND '),
      bindParams,
    });
  }

  async getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null> {
    const { projectId, buildId, itemId } = request;
    const stmt = this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      WHERE project_id = ? AND build_id = ? AND id = ?
    `);

    const result = await stmt.bind(projectId, buildId, itemId).first<D1StoredItemDTO>();
    return result ? StoredItemMapper.fromDTO(result) : null;
  }
}
