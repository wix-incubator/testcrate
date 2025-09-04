import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Container, ExecutorInfo, Result } from 'allure-store';

import { TestCrateAllureWriter, type TestCrateAllureWriterConfig } from './TestCrateAllureWriter';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestCrateAllureWriter', () => {
  let config: TestCrateAllureWriterConfig;
  let writer: TestCrateAllureWriter;
  let mockLogError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.testcrate.com',
      projectId: 'test-project',
      buildId: 'test-build',
      historyId: 'test-history',
      rootBuildId: 'root-build',
      parentBuildId: 'parent-build',
    };

    mockLogError = vi.fn();
    config.logError = mockLogError;

    writer = new TestCrateAllureWriter(null, config);

    // Reset fetch mock
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(writer).toBeInstanceOf(TestCrateAllureWriter);
    });
  });

  describe('init', () => {
    it('should complete without errors', async () => {
      await expect(writer.init()).resolves.toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should mark build as passed when no failed tests', async () => {
      await writer.cleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.testcrate.com/api/v1/projects/test-project/builds/test-build',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
          body: expect.stringContaining('"stage":"finished"'),
        })
      );
    });

    it('should mark build as failed when there are failed tests', async () => {
      // Simulate a failed test
      const mockResult: Result = {
        uuid: 'test-uuid',
        historyId: 'failed-test',
        status: 'failed',
      } as Result;

      await writer.writeResult(mockResult);
      await writer.cleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"status":"failed"'),
        })
      );
    });
  });

  describe('writeEnvironmentInfo', () => {
    it('should add environment labels to build payload', async () => {
      const envInfo = {
        NODE_VERSION: '18.0.0',
        OS: 'linux',
      };

      await writer.writeEnvironmentInfo(envInfo);
      await writer.cleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"labels"'),
        })
      );
    });
  });

  describe('writeExecutorInfo', () => {
    it('should add executor information to build payload', async () => {
      const executorInfo: ExecutorInfo = {
        name: 'Test Executor',
        type: 'github-actions',
        buildName: 'Test Build',
        buildUrl: 'https://github.com/test/build',
        reportUrl: 'https://reports.test.com',
      };

      await writer.writeExecutorInfo(executorInfo);
      await writer.cleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"name":"Test Build"'),
        })
      );
    });
  });

  describe('writeContainer', () => {
    it('should write container data to stored items', async () => {
      const container: Container = {
        uuid: 'container-uuid',
        name: 'Test Container',
      } as Container;

      await writer.writeContainer(container);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.testcrate.com/api/v1/projects/test-project/builds/test-build/items/container-uuid',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"type":"allure-container"'),
        })
      );
    });
  });

  describe('writeResult', () => {
    it('should write test result data to stored items', async () => {
      const result: Result = {
        uuid: 'result-uuid',
        historyId: 'test-history-id',
        status: 'passed',
      } as Result;

      await writer.writeResult(result);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.testcrate.com/api/v1/projects/test-project/builds/test-build/items/result-uuid',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"type":"allure-result"'),
        })
      );
    });

    it('should track failed tests', async () => {
      const failedResult: Result = {
        uuid: 'failed-uuid',
        historyId: 'failed-test',
        status: 'failed',
      } as Result;

      await writer.writeResult(failedResult);
      await writer.cleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"status":"failed"'),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should log errors when API requests fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await writer.cleanup();

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('HTTP 500'),
        })
      );
    });
  });

  describe('writeCategories', () => {
    it('should complete without errors', async () => {
      await expect(writer.writeCategories()).resolves.toBeUndefined();
    });
  });
});
