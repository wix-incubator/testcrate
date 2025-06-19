import { describe, test, expect, beforeEach } from 'vitest';
import type { ProjectController } from '@core/controllers';
import { ProjectNotFoundError } from '@core/errors';
import type {
  GetProjectRequest,
  PutProjectRequest,
  PatchProjectRequest,
  DeleteProjectRequest,
  ListProjectsRequest,
  Project
} from '@core/schema';
import type { InMemoryDatabase} from '@core/memory';
import { createCompositionRoot } from '@core/memory';

describe('ProjectController integration', () => {
  let db: InMemoryDatabase;
  let controller: ProjectController;

  beforeEach(() => {
    const ctx = createCompositionRoot();
    db = ctx.db;
    controller = ctx.projectController;
  });

  test('putProject creates a new project', async () => {
    const request: PutProjectRequest = {
      projectId: 'p1',
      payload: {
        name: 'Project 1',
        description: 'desc',
        categories: [],
      },
    };

    await controller.putProject(request);

    const getReq: GetProjectRequest = { projectId: 'p1' };
    const stored = await controller.getProject(getReq);
    expect(stored?.id).toBe('p1');
    expect(stored?.name).toBe('Project 1');
    expect(stored?.description).toBe('desc');
    expect(stored?.categories.revision).toBe(1);
    expect(stored?.categories.data).toEqual([]);
    expect(stored?.created?.ts).toBeGreaterThan(0);
    expect(stored?.created?.userId).toBe('system');
    expect(stored?.updated).toBeUndefined();
  });

  test('putProject upserts when id already exists', async () => {
    db.putProject({
      id: 'p1',
      name: 'existing',
      description: 'd',
      categories: { revision: 1, data: [] },
    });

    const request: PutProjectRequest = {
      projectId: 'p1',
      payload: {
        name: 'duplicate',
        description: 'd',
        categories: [],
      },
    };

    await controller.putProject(request);
    const got = await controller.getProject({ projectId: 'p1' });
    expect(got?.name).toBe('duplicate');
    expect(got?.description).toBe('d');
    expect(got?.categories.revision).toBe(1);
    expect(got?.updated?.ts ?? 0).toBeGreaterThan(0);
  });

  test('patchProject updates existing and bumps categories revision', async () => {
    // seed
    await controller.putProject({ projectId: 'p2', payload: {
      name: 'P2',
      description: 'd',
      categories: [],
    } });
    const before = await controller.getProject({ projectId: 'p2' });

    const patchReq: PatchProjectRequest = {
      projectId: 'p2',
      payload: { name: 'P2x', description: 'dx', categories: [] },
    };
    const updated = await controller.patchProject(patchReq);

    expect(updated.id).toBe('p2');
    expect(updated.name).toBe('P2x');
    expect(updated.description).toBe('dx');
    expect(updated.categories.revision).toBe((before as Project).categories.revision + 1);

    const stored = await controller.getProject({ projectId: 'p2' });
    expect(stored?.updated?.ts).toBeGreaterThan(0);
    expect(stored?.created?.ts).toBeGreaterThan(0);
  });

  test('patchProject throws when not found', async () => {
    const patchReq: PatchProjectRequest = { projectId: 'missing', payload: { name: 'x' } };
    await expect(controller.patchProject(patchReq)).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  test('deleteProject returns true and removes project', async () => {
    await controller.putProject({ projectId: 'p3', payload: {
      name: 'P3',
      description: 'd',
      categories: [],
    } });

    const deleted = await controller.deleteProject({ projectId: 'p3' } satisfies DeleteProjectRequest);
    expect(deleted).toBe(true);
    await expect(controller.getProject({ projectId: 'p3' })).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  test('deleteProject returns false for missing project', async () => {
    const deleted = await controller.deleteProject({ projectId: 'nope' } satisfies DeleteProjectRequest);
    expect(deleted).toBe(false);
  });

  test('getProject throws when missing', async () => {
    await expect(controller.getProject({ projectId: 'none' })).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  test('listProjects returns paginated items', async () => {
    await controller.putProject({ projectId: 'a', payload: {
      name: 'A',
      description: 'd',
      categories: [],
    } });
    await controller.putProject({ projectId: 'b', payload: {
      name: 'B',
      description: 'd',
      categories: [],
    } });
    await controller.putProject({ projectId: 'c', payload: {
      name: 'C',
      description: 'd',
      categories: [],
    } });

    const req: ListProjectsRequest = {};
    const page = await controller.listProjects(req);
    expect(page.items.map(p => p.id).sort()).toEqual(['a', 'b', 'c']);
  });
});
