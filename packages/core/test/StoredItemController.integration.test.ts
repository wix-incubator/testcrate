import { describe, test, expect, beforeEach } from 'vitest';
import type { BuildController, ProjectController, StoredItemController } from '@core/controllers';
import { StoredItemNotFoundError, StoredItemTypeMismatchError } from '@core/errors';
import type {
  PutStoredItemRequest,
  PatchStoredItemRequest,
  DeleteStoredItemRequest,
  ListStoredItemsRequest,
} from '@core/schema';
import { createCompositionRoot } from '@core/memory';

describe('StoredItemController integration', () => {
  let controller: StoredItemController;
  let projectController: ProjectController;
  let buildController: BuildController;

  beforeEach(() => {
    const ctx = createCompositionRoot();
    controller = ctx.storedItemController;
    buildController = ctx.buildController;
    projectController = ctx.projectController;
  });

  async function seedBuild(projectId = 'p1', buildId = 'b1') {
    await projectController.putProject({ projectId, payload: { name: 'Project ' + projectId } });
    await buildController.putBuild({ projectId, buildId, payload: { historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: 'Build ' + buildId, start: Date.now(), stage: 'scheduled' } });
    return { projectId, buildId } as const;
  }

  test('putStoredItem creates item and updates build.items', async () => {
    const s = await seedBuild();
    const req: PutStoredItemRequest = {
      projectId: s.projectId,
      buildId: s.buildId,
      itemId: '00000000-0000-0000-0000-000000000010',
      payload: {
        type: 'allure-container',
        data: { uuid: '00000000-0000-0000-0000-000000000010', children: [] },
      },
    };
    await controller.putStoredItem(req);
    const fetched = await controller.getStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId: req.itemId });
    expect(fetched?.id).toBe(req.itemId);
    expect(fetched?.type).toBe('allure-container');

    // build references updated
    const build = await buildController.getBuild({ projectId: s.projectId, buildId: s.buildId });
    expect(build?.items).toEqual([req.itemId]);
  });

  test('patchStoredItem updates in-place and preserves type', async () => {
    const s = await seedBuild();
    const itemId = '00000000-0000-0000-0000-000000000011';
    await controller.putStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId, payload: { type: 'allure-result', data: { uuid: itemId, historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: 'n', fullName: 'f', start: 1, stop: 2, stage: 'finished', status: 'passed' } } });

    const patched = await controller.patchStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId, payload: { type: 'allure-result', data: { uuid: itemId, historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: 'n2', fullName: 'f2', start: 1, stop: 2, stage: 'finished', status: 'passed' } } } satisfies PatchStoredItemRequest);
    expect(patched.type).toBe('allure-result');
    expect(patched.data).toMatchObject({ name: 'n2', fullName: 'f2' });
  });

  test('patchStoredItem throws when missing or type mismatched', async () => {
    const s = await seedBuild();
    await expect(controller.patchStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId: 'missing', payload: { type: 'allure-container', data: { uuid: '00000000-0000-0000-0000-000000000099', children: [] } } })).rejects.toBeInstanceOf(StoredItemNotFoundError);

    const itemId = '00000000-0000-0000-0000-000000000012';
    await controller.putStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId, payload: { type: 'allure-container', data: { uuid: itemId, children: [] } } });
    await expect(controller.patchStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId, payload: { type: 'allure-result', data: { uuid: itemId, historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: 'n', fullName: 'f', start: 1, stop: 2, stage: 'finished', status: 'passed' } } })).rejects.toBeInstanceOf(StoredItemTypeMismatchError);
  });

  test('deleteStoredItem removes item and updates build.items; returns true/false', async () => {
    const s = await seedBuild();
    const itemId = '00000000-0000-0000-0000-000000000013';
    await controller.putStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId, payload: { type: 'allure-container', data: { uuid: itemId, children: [] } } });

    const deleted = await controller.deleteStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId } satisfies DeleteStoredItemRequest);
    expect(deleted).toBe(true);
    const build = await buildController.getBuild({ projectId: s.projectId, buildId: s.buildId });
    expect(build?.items ?? []).toEqual([]);
    const deletedAgain = await controller.deleteStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId } satisfies DeleteStoredItemRequest);
    expect(deletedAgain).toBe(false);
  });

  test('listStoredItems filters by project/build', async () => {
    const s = await seedBuild('pA', 'bA');
    const s2 = await seedBuild('pA', 'bB');
    const s3 = await seedBuild('pB', 'bC');
    await controller.putStoredItem({ projectId: s.projectId, buildId: s.buildId, itemId: '00000000-0000-0000-0000-000000000021', payload: { type: 'allure-container', data: { uuid: '00000000-0000-0000-0000-000000000021', children: [] } } });
    await controller.putStoredItem({ projectId: s2.projectId, buildId: s2.buildId, itemId: '00000000-0000-0000-0000-000000000022', payload: { type: 'allure-container', data: { uuid: '00000000-0000-0000-0000-000000000022', children: [] } } });
    await controller.putStoredItem({ projectId: s3.projectId, buildId: s3.buildId, itemId: '00000000-0000-0000-0000-000000000023', payload: { type: 'allure-container', data: { uuid: '00000000-0000-0000-0000-000000000023', children: [] } } });

    const listA = await controller.listStoredItems({ projectId: 'pA', buildId: 'bA' } satisfies ListStoredItemsRequest);
    expect(listA.items.map(i => i.id)).toEqual(['00000000-0000-0000-0000-000000000021']);
  });
});

