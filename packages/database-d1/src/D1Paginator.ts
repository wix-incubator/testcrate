import type { D1Database, D1Result } from '@cloudflare/workers-types';

import type { D1PaginatedResponse, D1PaginationRequestDTO, D1PaginationResponseDTO } from './schema';
import { D1PaginationRequestDTOSchema } from './schema';

export interface D1PaginatorConfig<T, TDTO> {
  db: D1Database;
  tableName: string;
  mapper: (dto: TDTO) => T;
  defaults?: D1PaginationRequestDTO;
  orderBy?: string;
}

export class D1Paginator<T, TDTO> {
  private readonly config: Required<D1PaginatorConfig<T, TDTO>>;

  constructor(config: D1PaginatorConfig<T, TDTO>) {
    this.config = {
      defaults: {
        page: 1,
        size: 20,
      },
      orderBy: 'created_at DESC',
      ...config,
    };
  }

  async paginate(
    request: { pagination?: unknown },
    options: { where?: string; bindParams?: any[] } = {},
  ): Promise<D1PaginatedResponse<T>> {
    const { page, size } = {
      ...this.config.defaults,
      ...D1PaginationRequestDTOSchema.parse(request.pagination ?? {}),
    };
    const offset = (page - 1) * size;
    const { where, bindParams = [] } = options;

    const countStmt = this._prepareCountStatement(where);
    const itemsStmt = this._prepareSelectStatement(where);

    const results = await this.config.db.batch([
      countStmt.bind(...bindParams),
      itemsStmt.bind(...bindParams, size, offset),
    ]);

    const countResult = results[0].results[0] as { total: number };
    const itemsResult = results[1] as D1Result<TDTO>;
    const items = countResult?.total || 0;
    const pages = Math.ceil(items / size);

    return {
      items: itemsResult.results.map(this.config.mapper),
      pagination: { page, size, pages, items } satisfies D1PaginationResponseDTO,
    };
  }

  async count(options: { where?: string; bindParams?: any[] } = {}): Promise<number> {
    const { where, bindParams = [] } = options;
    const countStmt = this._prepareCountStatement(where);
    const countResult = await countStmt.bind(...bindParams).first<{ total: number }>();

    return countResult?.total || 0;
  }

  private _prepareCountStatement(whereClause?: string) {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    return this.config.db.prepare(`SELECT COUNT(*) as total FROM ${this.config.tableName} ${where}`);
  }

  private _prepareSelectStatement(whereClause?: string) {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    return this.config.db.prepare(`
      SELECT * FROM ${this.config.tableName}
      ${where}
      ORDER BY ${this.config.orderBy}
      LIMIT ? OFFSET ?
    `);
  }
}
