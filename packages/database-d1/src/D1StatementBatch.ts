import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

interface WriteBatch {
  commit(): Promise<void>;
}

export interface D1WriteBatchOptions {
  db: D1Database;
}

/**
 * A low-level utility to batch D1PreparedStatements for execution.
 * This is D1-specific and focused on auth operations.
 */
export class D1StatementBatch implements WriteBatch {
  private readonly db: D1Database;
  private statements: D1PreparedStatement[] = [];

  constructor(options: Readonly<D1WriteBatchOptions>) {
    this.db = options.db;
  }

  addStatement(statement: D1PreparedStatement): void {
    this.statements.push(statement);
  }

  addStatements(statements: D1PreparedStatement[]): void {
    this.statements.push(...statements);
  }

  async commit(): Promise<void> {
    const statements = this.statements.splice(0);
    if (statements.length === 0) {
      return;
    }

    await this.db.batch(statements);
  }

  getPendingStatementCount(): number {
    return this.statements.length;
  }

  clear(): void {
    this.statements = [];
  }
}
