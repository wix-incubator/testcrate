import { describe, test, expect, beforeEach } from 'vitest';
import type { StoredAttachment } from '@core/schema';
import { createCompositionRoot } from '@core/memory';

describe('AttachmentController integration', () => {
  let ctx: ReturnType<typeof createCompositionRoot>;

  beforeEach(() => {
    ctx = createCompositionRoot();
    ctx.db.putProject({ id: 'p1', name: 'p1', categories: { revision: 1, data: [] } });
    ctx.db.putBuild({
      id: 'b1',
      projectId: 'p1',
      rootId: 'b1',
      name: 'b1',
      start: Date.now(),
      stage: 'scheduled',
      historyId: 'h'.repeat(32)
    });
    // Create child builds instead of build steps
    ctx.db.putBuild({ id: 's1', projectId: 'p1', parentId: 'b1', rootId: 'b1', name: 's1', start: Date.now(), stage: 'scheduled' });
    ctx.db.putBuild({ id: 's2', projectId: 'p1', parentId: 'b1', rootId: 'b1', name: 's2', start: Date.now(), stage: 'scheduled' });
    ctx.db.putBuild({ id: 's3', projectId: 'p1', parentId: 'b1', rootId: 'b1', name: 's3', start: Date.now(), stage: 'scheduled' });
  });

  test('put and get build-level attachment', async () => {
    const alias: StoredAttachment = {
      id: 'att1',
      projectId: 'p1',
      buildId: 'b1',
      name: 'logo.png',
      type: 'image/png',
      source: 'https://cdn.example.com/logo.png',
    };

    await ctx.attachmentController.putAttachment(alias);

    const got = await ctx.attachmentController.getAttachment({ projectId: 'p1', buildId: 'b1', attachmentId: 'att1' });
    expect(got?.source).toBe('https://cdn.example.com/logo.png');
    expect(got?.buildId).toBe('b1');
  });

  test('put child build attachment', async () => {
    const alias: StoredAttachment = {
      id: 'att2',
      projectId: 'p1',
      buildId: 's1', // Attach to child build instead of using stepId
      name: 'log.txt',
      type: 'text/plain',
      source: 'https://cdn.example.com/log.txt',
    };

    await ctx.attachmentController.putAttachment(alias);

    const got = await ctx.attachmentController.getAttachment({ projectId: 'p1', buildId: 's1', attachmentId: 'att2' });
    expect(got?.buildId).toBe('s1');
    expect(got?.source).toBe('https://cdn.example.com/log.txt');
  });
});


