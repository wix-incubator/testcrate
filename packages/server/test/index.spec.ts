// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('TestCrate server', () => {
    it('responds with Hello World! (integration style)', async () => {
        const response = await SELF.fetch('https://example.com/api/v1/status');
        expect(await response.json()).toEqual({
            status: 'ok',
            migrations: {
                total: 1,
                applied: 1,
                pending: 0,
                upToDate: true,
            },
            timestamp: expect.any(String),
        });
    });

    type Step = { method: string; path: string; payload: any };

    // Ordered steps so that stateful operations have their prerequisites
    const steps: Step[] = [
        { method: 'PUT', path: '/api/v1/projects/test-project', payload: { name: 'Silly Project', description: '🤪' } },
        { method: 'PATCH', path: '/api/v1/projects/test-project', payload: { name: 'Updated Silly Project' } },
        { method: 'GET', path: '/api/v1/projects', payload: null },

        { method: 'PUT', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000', payload: { name: 'Silly Build', stage: 'running', historyId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' } },
        { method: 'PATCH', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000', payload: { status: 'passed', historyId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' } },
        { method: 'GET', path: '/api/v1/projects/test-project/builds', payload: null },

        { method: 'GET', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/steps', payload: null },
        { method: 'PUT', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/steps/456e7890-e89b-12d3-a456-426614174001', payload: { name: 'Silly Step', stage: 'running', historyId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', start: Date.now() } },
        { method: 'PATCH', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/steps/456e7890-e89b-12d3-a456-426614174001', payload: { status: 'passed' } },
        { method: 'GET', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/steps', payload: null },

        { method: 'PUT', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/items/789e0123-e89b-12d3-a456-426614174002', payload: { type: 'allure-container', data: { name: 'Silly Container', uuid: '123e4567-e89b-12d3-a456-426614174000', children: [] } } },
        { method: 'PATCH', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/items/789e0123-e89b-12d3-a456-426614174002', payload: { type: 'allure-container', data: { name: 'Updated Silly Container', uuid: '123e4567-e89b-12d3-a456-426614174000', children: [] } } },
        { method: 'GET', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/items/789e0123-e89b-12d3-a456-426614174002', payload: null },
        { method: 'GET', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/export/allure-results', payload: null },

        // Destructive operations at the end
        { method: 'DELETE', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/items/789e0123-e89b-12d3-a456-426614174002', payload: null },
        { method: 'DELETE', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000/steps/456e7890-e89b-12d3-a456-426614174001', payload: null },
        { method: 'DELETE', path: '/api/v1/projects/test-project/builds/123e4567-e89b-12d3-a456-426614174000', payload: null },
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
        return response.json();
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

                const data: unknown = await makeRequest(currentStep);
                expect(data).toMatchObject({
                    success: true,
                    timestamp: expect.any(Number),
                });
            });
        });
    });
});
