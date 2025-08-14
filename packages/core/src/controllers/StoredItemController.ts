import { BuildNotFoundError, StoredItemNotFoundError, StoredItemTypeMismatchError } from '@core/errors';
import type { StoredItem, GetStoredItemRequest, PutStoredItemRequest, PatchStoredItemRequest, DeleteStoredItemRequest, ListStoredItemsRequest, PaginatedResponse, GetBuildRequest } from '@core/schema';
import type { StoredItemQuery, StoredItemStager, WriteBatch, BuildQuery, BuildStager } from '@core/types';

export interface StoredItemControllerConfig {
  readonly createWriteBatch: () => WriteBatch;
  readonly storedItemQuery: StoredItemQuery;
  readonly storedItemStagerFactory: (batch: WriteBatch) => StoredItemStager;
  readonly buildQuery: BuildQuery;
  readonly buildStagerFactory: (batch: WriteBatch) => BuildStager;
}

export class StoredItemController implements StoredItemQuery {
  constructor(private readonly config: StoredItemControllerConfig) {}

  async listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>> {
    return this.config.storedItemQuery.listStoredItems(request);
  }

  async getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null> {
    return this.config.storedItemQuery.getStoredItem(request);
  }

  async putStoredItem(request: PutStoredItemRequest): Promise<void> {
    const storedItem: StoredItem = {
      ...request.payload,
      id: request.itemId,
      buildId: request.buildId,
    } as StoredItem;

    const build = await this.#getBuild({ projectId: request.projectId, buildId: request.buildId });
    const itemIds = new Set(build.itemIds ?? []);
    itemIds.add(request.itemId);

    await this.#tx((storedItemStager, buildStager) => {
      storedItemStager.putStoredItem(storedItem);
      buildStager.putBuild({ ...build, itemIds: [...itemIds] });
    });
  }

  async patchStoredItem(request: PatchStoredItemRequest): Promise<StoredItem> {
    const storedItem = await this.config.storedItemQuery.getStoredItem(request);
    if (!storedItem) {
      throw new StoredItemNotFoundError(request.projectId, request.buildId, request.itemId);
    }
    if (storedItem.type !== request.payload.type) {
      throw new StoredItemTypeMismatchError(request.projectId, request.buildId, request.itemId, storedItem.type, request.payload.type);
    }

    const updated = { ...storedItem, ...request.payload } as StoredItem;
    await this.#tx((stager) => stager.putStoredItem(updated));
    return updated;
  }

  async deleteStoredItem(request: DeleteStoredItemRequest): Promise<boolean> {
    const existing = await this.config.storedItemQuery.getStoredItem(request);

    if (existing) {
      const build = await this.#getBuild({ projectId: request.projectId, buildId: request.buildId });
      const itemIds = new Set(build.itemIds ?? []);
      itemIds.delete(request.itemId);

      await this.#tx((storedItemStager, buildStager) => {
        storedItemStager.deleteStoredItem(request.projectId, request.buildId, request.itemId);
        buildStager.putBuild({ ...build, itemIds: [...itemIds] });
      });
      return true;
    }

    return false;
  }

  async #tx(fn: (storedItemStager: StoredItemStager, buildStager: BuildStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const storedItemStager = this.config.storedItemStagerFactory(writeBatch);
    const buildStager = this.config.buildStagerFactory(writeBatch);

    await fn(storedItemStager, buildStager);
    await writeBatch.commit();
  }

  async #getBuild(request: GetBuildRequest) {
    const build = await this.config.buildQuery.getBuild(request);
    if (!build) {
      throw new BuildNotFoundError(request.projectId, request.buildId);
    }
    return build;
  }
}
