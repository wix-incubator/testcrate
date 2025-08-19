import { describe, test, expect, beforeEach } from 'vitest';
import type { BuildController, BuildStepController, ProjectController } from '@core/controllers';
import { BuildStepNotFoundError } from '@core/errors';
import type {
  PutBuildStepRequest,
  GetBuildStepRequest,
  PatchBuildStepRequest,
  DeleteBuildStepRequest,
} from '@core/schema';
import { createCompositionRoot } from '@core/memory';

describe('BuildStepController integration', () => {
  let buildController: BuildController;
  let buildStepController: BuildStepController;
  let projectController: ProjectController;

  beforeEach(() => {
    const ctx = createCompositionRoot();
    buildController = ctx.buildController;
    buildStepController = ctx.buildStepController;
    projectController = ctx.projectController;
  });

  async function seedBuild(projectId = 'p1', buildId = 'b1') {
    await projectController.putProject({ projectId, payload: { name: 'Project ' + projectId } });
    await buildController.putBuild({
      projectId,
      buildId,
      payload: {
        historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Build ' + buildId,
        stage: 'scheduled',
        start: 0
      },
    });

    return { projectId, buildId } as const;
  }

  test('listBuildSteps returns empty when none', async () => {
    const s = await seedBuild();
    const steps = await buildStepController.listBuildSteps({
      projectId: s.projectId,
      buildId: s.buildId
    });
    expect(steps.items).toEqual([]);
  });

  test('putBuildStep creates and updates a step', async () => {
    const s = await seedBuild();
    const putReq: PutBuildStepRequest = {
      projectId: s.projectId,
      buildId: s.buildId,
      stepId: '00000000-0000-0000-0000-000000000001',
      payload: {
        historyId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'step 1',
        stage: 'scheduled',
        start: Date.now(),
      },
    };

    await buildStepController.putBuildStep(putReq);
    const got = await buildStepController.getBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId: putReq.stepId } satisfies GetBuildStepRequest);
    expect(got?.name).toBe('step 1');
    expect(got?.created?.userId).toBe('system');

    await buildStepController.putBuildStep({ ...putReq, payload: { ...putReq.payload, name: 'step 1 updated' } });
    const got2 = await buildStepController.getBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId: putReq.stepId });
    expect(got2?.name).toBe('step 1 updated');
    expect(got2?.updated?.userId).toBe('system');
  });

  test('patchBuildStep updates existing fields', async () => {
    const s = await seedBuild();
    const stepId = '00000000-0000-0000-0000-000000000002';
    await buildStepController.putBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId, payload: { historyId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: 'x', stage: 'scheduled', start: Date.now() } });
    const patched = await buildStepController.patchBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId, payload: { name: 'y' } } satisfies PatchBuildStepRequest);
    expect(patched.name).toBe('y');
  });

  test('patchBuildStep throws for missing step', async () => {
    const s = await seedBuild();
    await expect(buildStepController.patchBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId: 'missing', payload: { name: 'nope' } })).rejects.toBeInstanceOf(BuildStepNotFoundError);
  });

  test('deleteBuildStep removes step and is idempotent', async () => {
    const s = await seedBuild();
    const stepId = '00000000-0000-0000-0000-000000000003';
    await buildStepController.putBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId, payload: { historyId: 'cccccccccccccccccccccccccccccccc', name: 'z', stage: 'scheduled', start: Date.now() } });

    const deleted = await buildStepController.deleteBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId } satisfies DeleteBuildStepRequest);
    expect(deleted).toBe(true);
    const deletedAgain = await buildStepController.deleteBuildStep({ projectId: s.projectId, buildId: s.buildId, stepId } satisfies DeleteBuildStepRequest);
    expect(deletedAgain).toBe(false);
  });
});

