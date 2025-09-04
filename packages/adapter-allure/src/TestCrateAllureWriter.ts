import type { PatchBuildRequest, PutBuildRequest, PutStoredItemRequest } from '@testcrate/core';
import type { AllureWriter, Container, ExecutorInfo, Label, Link, Result} from 'allure-store';

export interface TestCrateAllureWriterConfig {
  apiKey: string;
  baseUrl: string;
  projectId: string;
  buildId: string;
  historyId: string;
  rootBuildId?: string;
  parentBuildId?: string;
  logError?: (error: unknown) => void;
}

export class TestCrateAllureWriter implements AllureWriter {
  private _failedTests = new Set<string>();
  private _putBuildRequest?: PutBuildRequest;
  private _patchBuildRequest?: PatchBuildRequest;

  constructor(
    _1: unknown,
    private readonly _config: TestCrateAllureWriterConfig
  ) {
    this._putBuildRequest = {
      projectId: this._config.projectId,
      buildId: this._config.buildId,
      payload: {
        rootId: this._config.rootBuildId,
        parentId: this._config.parentBuildId,
        name: this._config.buildId,
        historyId: this._config.historyId,
        stage: 'running',
      },
    };
  }

  async init(): Promise<void> {}

  async cleanup(): Promise<void> {
    const passed = this._failedTests.size === 0;
    this._addPayload({
      stage: 'finished',
      status: passed ? 'passed' : 'failed',
    });
    await this._flushNetworkRequests();

    this._putBuildRequest = undefined;
    this._patchBuildRequest = undefined;
  }

  async writeCategories(): Promise<void> {}

  async writeEnvironmentInfo(info: Record<string, string>): Promise<void> {
    this._addPayload({
      labels: Object.entries(info).map(([key, value]) => ({ name: `env.${key}`, value })),
    });
  }

  async writeExecutorInfo(info: ExecutorInfo): Promise<void> {
    const links: Required<Link>[] = [];
    if (info.buildUrl)
      links.push({ name: 'build', url: info.buildUrl, type: 'link' });

    if (info.reportUrl)
      links.push({ name: 'report', url: info.reportUrl, type: 'link' });

    const labels: Label[] = [];
    if (info.name) labels.push({ name: 'executor.name', value: info.name });
    if (info.type) labels.push({ name: 'executor.type', value: info.type });

    this._addPayload({
      name: info.buildName,
      links: links.length > 0 ? links : undefined,
      labels: labels.length > 0 ? labels : undefined,
    });
  }

  async writeContainer(result: Container): Promise<void> {
    if (this._putBuildRequest) {
      await this._flushNetworkRequests();
      this._putBuildRequest = undefined;
    }

    const { projectId, buildId, itemId, payload }: PutStoredItemRequest = {
      projectId: this._config.projectId,
      buildId: this._config.buildId,
      itemId: result.uuid,
      payload: {
        type: 'allure-container',
        data: result,
      }
    };

    await this._makeRequest('PUT', `/api/v1/projects/${projectId}/builds/${buildId}/items/${itemId}`, payload);
  }

  async writeResult(result: Result): Promise<void> {
    if (this._putBuildRequest) {
      await this._flushNetworkRequests();
      this._putBuildRequest = undefined;
    }

    const { projectId, buildId, itemId, payload }: PutStoredItemRequest = {
      projectId: this._config.projectId,
      buildId: this._config.buildId,
      itemId: result.uuid,
      payload: {
        type: 'allure-result',
        data: result,
      }
    };

    if (result.status === 'failed' || result.status === 'broken') {
      this._failedTests.add(result.historyId);
    } else {
      this._failedTests.delete(result.historyId);
    }

    await this._makeRequest('PUT', `/api/v1/projects/${projectId}/builds/${buildId}/items/${itemId}`, payload);
  }

  private async _makeRequest(method: string, path: string, body?: any): Promise<Response> {
    const { baseUrl, apiKey } = this._config;
    const baseUrlTrimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${baseUrlTrimmed}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      this._config.logError?.(new Error(`HTTP ${response.status}: ${errorText}`));
    }

    return response;
  }

  private _addPayload(payload: PatchBuildRequest['payload']): PutBuildRequest | PatchBuildRequest {
    let request = this._putBuildRequest ?? this._patchBuildRequest;
    if (!request) {
      request = (this._patchBuildRequest = {
        projectId: this._config.projectId,
        buildId: this._config.buildId,
        payload: {},
      });
    }

    Object.assign(request.payload, payload);
    return request;
  }

  private async _flushNetworkRequests(): Promise<void> {
    if (this._putBuildRequest) {
      const { projectId, buildId, payload } = this._putBuildRequest;
      await this._makeRequest('PUT', `/api/v1/projects/${projectId}/builds/${buildId}`, payload);
    } else if (this._patchBuildRequest) {
      const { projectId, buildId, payload } = this._patchBuildRequest;
      await this._makeRequest('PATCH', `/api/v1/projects/${projectId}/builds/${buildId}`, payload);
    }
  }
}
