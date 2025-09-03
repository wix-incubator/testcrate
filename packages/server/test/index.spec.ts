// test/index.spec.ts
import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('TestCrate server', () => {
    it('responds with Hello World! (integration style)', async () => {
        const response = await SELF.fetch('https://example.com/api/private/migrations/status');
        expect(await response.json()).toEqual({
            success: true,
            data: {
              applied: 1,
              appliedMigrations: expect.arrayContaining([{
                applied_at: expect.any(Number),
                batch: 1,
                id: 1,
                name: '001_create_core_tables',
              }]),
              pending: 0,
              pendingMigrations: [],
              total: 1,
            },
            timestamp: expect.any(Number),
        });
    });

    type Step = { method: string; path: string; payload: any };

    // Ordered steps so that stateful operations have their prerequisites
    const steps: Step[] = [
        { method: 'PUT', path: '/api/v1/projects/test-project', payload: { name: 'Silly Project', description: '🤪' } },
        { method: 'PATCH', path: '/api/v1/projects/test-project', payload: { name: 'Updated Silly Project' } },
        { method: 'GET', path: '/api/v1/projects', payload: null },

        { method: 'PUT', path: '/api/v1/projects/test-project/builds/123', payload: { name: 'Silly Build', stage: 'running', historyId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' } },
        { method: 'PATCH', path: '/api/v1/projects/test-project/builds/123', payload: { status: 'passed', historyId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' } },
        { method: 'GET', path: '/api/v1/projects/test-project/builds', payload: null },

        { method: 'PUT', path: '/api/v1/projects/test-project/builds/123/items/789e0123-e89b-12d3-a456-426614174002', payload: { type: 'allure-container', data: { name: 'Silly Container', uuid: '123e4567-e89b-12d3-a456-426614174000', children: [] } } },
        { method: 'PATCH', path: '/api/v1/projects/test-project/builds/123/items/789e0123-e89b-12d3-a456-426614174002', payload: { type: 'allure-container', data: { name: 'Updated Silly Container', uuid: '123e4567-e89b-12d3-a456-426614174000', children: [] } } },
        { method: 'GET', path: '/api/v1/projects/test-project/builds/123/items/789e0123-e89b-12d3-a456-426614174002', payload: null },

        // Destructive operations at the end
        { method: 'DELETE', path: '/api/v1/projects/test-project/builds/123/items/789e0123-e89b-12d3-a456-426614174002', payload: null },
        { method: 'DELETE', path: '/api/v1/projects/test-project/builds/123', payload: null },
        { method: 'DELETE', path: '/api/v1/projects/test-project', payload: null },
    ];

    async function makeRequest(step: Step) {
        const url = `https://example.com${step.path}`;
        const options: RequestInit = { method: step.method };
        if (step.payload) {
            options.body = JSON.stringify(step.payload);
            options.headers = { 'Content-Type': 'application/json' };
        }
        const response = await SELF.fetch(url, options);
        return response.json() as Promise<{ success: boolean, error?: any, timestamp: number }>;
    }

    steps.forEach((currentStep, index) => {
        describe(`${currentStep.method} ${currentStep.path}`, () => {
            it('echoes back the request', async () => {
                // Run all previous steps first, suppressing any failures
                for (let i = 0; i < index; i++) {
                    try {
                        await makeRequest(steps[i]);
                    } catch (e) {
                        // Swallow errors from setup steps
                        // so we can focus on the current step
                    }
                }

                const data = await makeRequest(currentStep);
                expect(data).toMatchObject({
                    success: true,
                    timestamp: expect.any(Number),
                });
            });
        });
    });
});
