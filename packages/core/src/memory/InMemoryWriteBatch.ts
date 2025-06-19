import type { WriteBatch } from '@core/types';

export class InMemoryWriteBatch implements WriteBatch {
  private stagedOperations: Array<() => void> = [];

  stageOperation(operation: () => void): void {
    this.stagedOperations.push(operation);
  }

  async commit(): Promise<void> {
    // Execute all staged operations
    for (const operation of this.stagedOperations) {
      operation();
    }
    this.stagedOperations = [];
  }

  get hasChanges(): boolean {
    return this.stagedOperations.length > 0;
  }

  clear(): void {
    this.stagedOperations = [];
  }
}
