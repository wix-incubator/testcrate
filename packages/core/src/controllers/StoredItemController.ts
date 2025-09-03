import { StoredItemNotFoundError, StoredItemTypeMismatchError } from '@core/errors';
import type {
  StoredItem,
  GetStoredItemRequest,
  PutStoredItemRequest,
  PatchStoredItemRequest,
  DeleteStoredItemRequest,
  ListStoredItemsRequest,
  PaginatedResponse,
} from '@core/schema';
import type { StoredItemQuery, StoredItemStager, WriteBatch, UserService, TimeService } from '@core/types';
import { createAuditInfo } from '@core/utils';

export interface StoredItemControllerConfig {
  readonly createWriteBatch: () => WriteBatch;
  readonly storedItemQuery: StoredItemQuery;
  readonly storedItemStagerFactory: (batch: WriteBatch) => StoredItemStager;
  readonly userService: UserService;
  readonly timeService: TimeService;
}

export class StoredItemController implements StoredItemQuery {
  constructor(private readonly config: StoredItemControllerConfig) {}

  async listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>> {
    return await this.config.storedItemQuery.listStoredItems(request);
  }

  async getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null> {
    const item = await this.config.storedItemQuery.getStoredItem(request);
    if (!item) {
      throw new StoredItemNotFoundError(request.projectId, request.buildId, request.itemId);
    }

    return item;
  }

  async putStoredItem(request: PutStoredItemRequest): Promise<void> {
    const storedItem: StoredItem = {
      ...(request.payload as StoredItem),
      id: request.itemId,
      projectId: request.projectId,
      buildId: request.buildId,
      created: createAuditInfo(this.config.timeService, this.config.userService),
    };

    await this.#tx((storedItemStager) => storedItemStager.putStoredItem(storedItem));
  }

  async patchStoredItem(request: PatchStoredItemRequest): Promise<StoredItem> {
    const storedItem = await this.config.storedItemQuery.getStoredItem(request);
    if (!storedItem) {
      throw new StoredItemNotFoundError(request.projectId, request.buildId, request.itemId);
    }
    if (storedItem.type !== request.payload.type) {
      throw new StoredItemTypeMismatchError(
        request.projectId,
        request.buildId,
        request.itemId,
        storedItem.type,
        request.payload.type,
      );
    }

    const updated = {
      ...storedItem,
      ...request.payload,
      updated: createAuditInfo(this.config.timeService, this.config.userService),
    } as StoredItem;
    await this.#tx((stager) => stager.putStoredItem(updated));
    return updated;
  }

  async deleteStoredItem(request: DeleteStoredItemRequest): Promise<boolean> {
    const existing = await this.config.storedItemQuery.getStoredItem(request);

    if (existing) {
      await this.#tx((storedItemStager) => {
        storedItemStager.deleteStoredItem(request.projectId, request.buildId, request.itemId);
      });
      return true;
    }

    return false;
  }

  async #tx(fn: (storedItemStager: StoredItemStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const storedItemStager = this.config.storedItemStagerFactory(writeBatch);

    await fn(storedItemStager);
    await writeBatch.commit();
  }
}
