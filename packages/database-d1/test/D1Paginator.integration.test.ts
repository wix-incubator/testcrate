import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

import { D1Paginator } from '../src';

interface TestDTO {
  id: number;
  name: string;
  created_at: number;
}

const mapDto = (dto: TestDTO) => ({
  id: dto.id,
  name: dto.name,
  createdAt: new Date(dto.created_at),
});

type TestModel = ReturnType<typeof mapDto>;

describe('D1Paginator Integration Test', () => {
  let db: D1Database;
  const tableName = 'paginator_test';
  let paginator: D1Paginator<TestModel, TestDTO>;

  beforeAll(async () => {
    db = globalThis.__MINIFLARE_DB__;
  });

  beforeEach(async () => {
    await db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    await db.exec(`
      CREATE TABLE ${tableName} ( \
        id INTEGER PRIMARY KEY, \
        name TEXT NOT NULL, \
        created_at INTEGER NOT NULL \
      ); \
    `);

    // Seed data
    const stmt = db.prepare(`INSERT INTO ${tableName} (id, name, created_at) VALUES (?, ?, ?)`);
    const inserts = [];
    for (let i = 1; i <= 50; i++) {
      inserts.push(stmt.bind(i, `Item ${i}`, Date.now() + i * 1000));
    }
    await db.batch(inserts);

    paginator = new D1Paginator<TestModel, TestDTO>({
      db,
      tableName,
      mapper: mapDto,
      orderBy: 'id ASC',
    });
  });

  it('should return the first page with correct items and pagination details', async () => {
    const result = await paginator.paginate({ pagination: { page: 1, size: 10 } });

    expect(result.items).toHaveLength(10);
    expect(result.items[0].name).toBe('Item 1');
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.size).toBe(10);
    expect(result.pagination.pages).toBe(5);
    expect(result.pagination.items).toBe(50);
  });

  it('should return the second page with correct items', async () => {
    const result = await paginator.paginate({ pagination: { page: 2, size: 10 } });

    expect(result.items).toHaveLength(10);
    expect(result.items[0].name).toBe('Item 11');
  });

  it('should return the last page with the remaining items', async () => {
    const result = await paginator.paginate({ pagination: { page: 3, size: 20 } });

    expect(result.items).toHaveLength(10);
    expect(result.items[0].name).toBe('Item 41');
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.pages).toBe(3);
  });

  it('should handle where clauses and bind parameters', async () => {
    const result = await paginator.paginate(
      {},
      { where: 'id > ?', bindParams: [45] },
    );

    expect(result.items).toHaveLength(5);
    expect(result.items[0].name).toBe('Item 46');
    expect(result.pagination.items).toBe(5);
  });

  it('should return correct total count', async () => {
    const count = await paginator.count();
    expect(count).toBe(50);
  });

  it('should return correct count with a where clause', async () => {
    const count = await paginator.count({ where: 'id > ?', bindParams: [30] });
    expect(count).toBe(20);
  });
});
