import type { PaginatedResponse } from '@core/schema';

export class InMemoryTable<T> {
  private items = new Map<string, T>();

  getItem(id: string): T | null {
    return this.items.get(id) || null;
  }

  listItems(filter?: (item: T) => boolean): PaginatedResponse<T> {
    let items = [...this.items.values()];
    if (filter) {
      items = items.filter(filter);
    }
    return { items };
  }

  putItem(id: string, item: T): void {
    this.items.set(id, item);
  }

  deleteItem(id: string): void {
    this.items.delete(id);
  }

  deleteItems(filter: (item: T) => boolean): void {
    for (const [id, item] of this.items.entries()) {
      if (filter(item)) {
        this.items.delete(id);
      }
    }
  }

  clear(): void {
    this.items.clear();
  }

  count(): number {
    return this.items.size;
  }
}
