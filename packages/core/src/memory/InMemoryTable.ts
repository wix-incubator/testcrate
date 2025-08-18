import type { PaginatedResponse } from '@core/schema';

export class InMemoryTable<T, Id, Key = string> {
  private readonly items = new Map<Key, T>();

  constructor(
    private readonly id2key: (id: Id) => Key,
    private readonly key2id: (key: Key) => Id,
  ) {}

  getItem(id: Id): T | null {
    const key = this.id2key(id);
    return this.items.get(key) || null;
  }

  findItem(filter: (item: T, id: Id) => boolean): T | null {
    for (const [key, item] of this.items.entries()) {
      const id = this.key2id(key);
      if (filter(item, id)) {
        return item;
      }
    }
    return null;
  }

  listItems(filter?: (item: T, id: Id) => boolean): PaginatedResponse<T> {
    const items: T[] = [];
    for (const [key, item] of this.items.entries()) {
      if (filter) {
        const id = this.key2id(key);
        if (filter(item, id)) {
          items.push(item);
        }
      } else {
        items.push(item);
      }
    }
    return { items };
  }

  putItem(id: Id, item: T): void {
    this.items.set(this.id2key(id), item);
  }

  deleteItem(id: Id): void {
    this.items.delete(this.id2key(id));
  }

  deleteItems(filter: (item: T, id: Id) => boolean): void {
    for (const [key, item] of this.items.entries()) {
      const id = this.key2id(key);
      if (filter(item, id)) {
        this.items.delete(key);
      }
    }
  }

  clear(): void {
    this.items.clear();
  }

  count(): number {
    return this.items.size;
  }

  static simple<T, K = string>() {
    const identity = <T>(x: T) => x;
    return new InMemoryTable<T, K, K>(identity, identity);
  }
}
