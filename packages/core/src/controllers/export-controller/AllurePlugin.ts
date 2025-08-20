import type { AllureCategory, AllureExecutorInfo, Project, Build, Label, Link, StoredItem } from '@core/schema';

import type { ExportControllerConfig } from './ExportControllerConfig';

export interface AllureExportFileEntry {
  path: string;
  content: string;
}

export class AllurePlugin {
  constructor(private readonly config: ExportControllerConfig) {}

  async *exportBuildResults(projectId: string, buildId: string): AsyncIterable<AllureExportFileEntry> {
    for await (const item of this.queryStoredItems(projectId, buildId)) {
      yield this.#file(`${item.type.replace('allure', item.data.uuid)}.json`, item.data);
    }

    const project = await this.config.projectQuery.getProject({ projectId });
    const build = await this.config.buildQuery.getBuild({ projectId, buildId });
    yield this.#file('categories.json', getReportCategories(project!));
    yield this.#file('executor.json', getReportExecutor(build!));
    yield this.#file('environment.properties', getReportEnvironment(build!));

  }

  #file(path: string, content: unknown): AllureExportFileEntry {
    return { path, content: typeof content === 'string' ? content : JSON.stringify(content, null, 2) };
  }

  private async *queryStoredItems(
    projectId: string,
    buildId: string,
  ): AsyncIterable<StoredItem> {
    const { items } = await this.config.storedItemQuery.listStoredItems({
      projectId,
      buildId,
      type: ['allure-result', 'allure-container'],
    });
    for (const item of items) {
      yield item;
    }
  }
}

function getReportCategories(project: Project): AllureCategory[] {
  return (
    project.categories.data.map((category) => ({
      name: category.name,
      messageRegex: category.messageRegex,
      traceRegex: category.traceRegex,
      matchedStatuses: category.matchedStatuses,
      flaky: category.flaky,
    })) || []
  );
}

function getReportExecutor(build: Build): AllureExecutorInfo {
  return {
    ...findLabels(build.labels || [], {
      'executor.name': 'name',
      'executor.type': 'type',
      'executor.buildOrder': 'buildOrder',
      'executor.reportName': 'reportName',
    }),
    ...findLinks(build.links || [], {
      'executor.url': 'url',
      'executor.buildUrl': 'buildUrl',
      'executor.reportUrl': 'reportUrl',
    }),
    buildName: build.name,
  };
}

function findLabels(labels: Label[], map: Record<string, keyof AllureExecutorInfo>): AllureExecutorInfo {
  const result: AllureExecutorInfo = {};
  for (const label of labels) {
    const key = map[label.name];
    if (key) {
      result[key] = label.value as any;
    }
  }
  return result;
}

function findLinks(links: Link[], map: Record<string, keyof AllureExecutorInfo>): AllureExecutorInfo {
  const result: AllureExecutorInfo = {};
  for (const link of links) {
    const key = map[link.type];
    if (key) {
      result[key] = link.url as any;
    }
  }
  return result;
}

function getReportEnvironment(build: Build): string {
  const entries: [string, string][] = [];
  for (const label of build.labels || []) {
    if (label.name.startsWith('env.')) {
      entries.push([label.name.slice(4), String(label.value)]);
    }
  }

  return entries.map(([name, value]) => `${name} = ${value}`).join('\n');
}
