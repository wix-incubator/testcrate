import { describe, test, expect, beforeEach } from 'vitest';
import type { BuildController, ProjectController } from '@core/controllers';
import { BuildNotFoundError } from '@core/errors';
import type {
  GetBuildRequest,
  PatchBuildRequest,
  DeleteBuildRequest,
  ListBuildsRequest,
  BuildStage,
} from '@core/schema';
import { createCompositionRoot } from '@core/memory';

describe('BuildController integration', () => {
  let controller: BuildController;
  let projectController: ProjectController;

  beforeEach(async () => {
    const ctx = createCompositionRoot();
    controller = ctx.buildController;
    projectController = ctx.projectController;

    await projectController.putProject({ projectId: 'p1', payload: { name: 'Project 1' } });
  });

  test('putBuild creates or replaces a build', async () => {
    const created = await controller.putBuild({ projectId: 'p1', buildId: 'b1', payload: { historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', rootId: 'b1', stage: 'scheduled', name: 'Build 1', start: Date.now() } });
    expect(created.id).toBe('b1');
    expect(created.projectId).toBe('p1');

    const got = await controller.getBuild({ projectId: 'p1', buildId: 'b1' } satisfies GetBuildRequest);
    expect(got?.id).toBe('b1');
  });

  test('patchBuild updates existing build', async () => {
    await controller.putBuild({
      projectId: 'p1',
      buildId: 'b2',
      payload: {
        historyId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        rootId: 'b2',
        stage: 'scheduled',
        name: 'Build b2',
        start: Date.now(),
      }
    });

    const updated = await controller.patchBuild({ projectId: 'p1', buildId: 'b2', payload: { stage: 'finished' } } satisfies PatchBuildRequest);
    expect(updated.stage).toBe('finished');
    const got = await controller.getBuild({ projectId: 'p1', buildId: 'b2' });
    expect(got?.stage).toBe('finished');
  });

  test('patchBuild throws when not found', async () => {
    await expect(controller.patchBuild({ projectId: 'p1', buildId: 'missing', payload: { stage: 'finished' } })).rejects.toBeInstanceOf(BuildNotFoundError);
  });

  test('deleteBuild returns true when present, false otherwise', async () => {
    await controller.putBuild({ projectId: 'p1', buildId: 'b3', payload: { name: 'Build 3', start: Date.now(), historyId: 'cccccccccccccccccccccccccccccccc', rootId: 'b3', stage: 'scheduled' as BuildStage } });
    const deleted = await controller.deleteBuild({ projectId: 'p1', buildId: 'b3' } satisfies DeleteBuildRequest);
    expect(deleted).toBe(true);
    const deletedAgain = await controller.deleteBuild({ projectId: 'p1', buildId: 'b3' } satisfies DeleteBuildRequest);
    expect(deletedAgain).toBe(false);
  });

  test('listBuilds returns items and respects filters', async () => {
    await projectController.putProject({ projectId: 'pA', payload: { name: 'Project A' } });
    await projectController.putProject({ projectId: 'pB', payload: { name: 'Project B' } });
    await controller.putBuild({ projectId: 'pA', buildId: '1', payload: { name: 'Build 1', start: Date.now(), historyId: '11111111111111111111111111111111', rootId: '1', stage: 'scheduled' as BuildStage } });
    await controller.putBuild({ projectId: 'pA', buildId: '2', payload: { name: 'Build 2', start: Date.now(), historyId: '22222222222222222222222222222222', rootId: '2', stage: 'finished' as BuildStage } });
    await controller.putBuild({ projectId: 'pB', buildId: '3', payload: { name: 'Build 3', start: Date.now(), historyId: '33333333333333333333333333333333', rootId: '3', stage: 'scheduled' as BuildStage } });

    const all = await controller.listBuilds({} as ListBuildsRequest);
    expect(all.items.length).toBe(3);

    const onlyPA = await controller.listBuilds({ projectId: 'pA' });
    expect(onlyPA.items.map(b => b.id).sort()).toEqual(['1', '2']);

    const onlyFinished = await controller.listBuilds({ status: undefined, stage: ['finished'] } as ListBuildsRequest);
    expect(onlyFinished.items.map(b => b.id)).toEqual(['2']);
  });
});

