import type { Project, ListProjectsRequest, PaginatedResponse, Build, StoredItem, GetBuildRequest, ListBuildsRequest, GetProjectRequest, ListStoredItemsRequest, GetStoredItemRequest, AuditInfo, Auditable, ProjectId, BuildId } from '@core/schema';
import type { BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager } from '@core/types';

import { InMemoryTable } from './InMemoryTable';

export class InMemoryDatabase implements BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager {
  public readonly builds = new InMemoryTable<Build>();
  public readonly items = new InMemoryTable<StoredItem>();
  public readonly projects = new InMemoryTable<Project>();

  clear(): void {
    this.items.clear();
    this.builds.clear();
    this.projects.clear();
  }

  async getBuild(request: GetBuildRequest): Promise<Build | null> {
    const build = this.builds.getItem(request.buildId);
    if (!build) return null;
    const itemIds = this.#itemIdsForBuild(build.projectId, build.id);
    return { ...build, itemIds };
  }

  async listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>> {
    const page = this.builds.listItems((build) => {
      if (request.projectId && build.projectId !== request.projectId) {
        return false;
      }

      if (request.buildId && build.id !== request.buildId) {
        return false;
      }

      if (request.stage && build.stage !== request.stage) {
        return false;
      }

      if (request.status && build.status !== request.status) {
        return false;
      }

      return true;
    });

    page.items = page.items
      .map((b) => ({ ...b, itemIds: this.#itemIdsForBuild(b.projectId, b.id) }))
      .sort((a, b) => (b.created?.ts ?? 0) - (a.created?.ts ?? 0));

    return page;
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    return this.projects.getItem(request.id);
  }

  async listProjects(_request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    return this.projects.listItems();
  }

  async getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null> {
    return this.items.getItem(request.itemId);
  }

  async listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>> {
    return this.items.listItems((item) => {
      if (request.projectId && item.projectId !== request.projectId) {
        return false;
      }

      if (request.buildId && item.buildId !== request.buildId) {
        return false;
      }

      if (request.type && !request.type.includes(item.type)) {
        return false;
      }

      return true;
    });
  }

  putProject(project: Project): void {
    const existing = this.projects.getItem(project.id);
    this.#audit(project, existing);
    this.projects.putItem(project.id, project);
  }

  putBuild(build: Build): void {
    const existing = this.builds.getItem(build.id);
    this.#audit(build, existing);
    this.builds.putItem(build.id, build);
  }

  putStoredItem(item: StoredItem): void {
    const existing = this.items.getItem(item.id);
    this.#audit(item, existing);
    this.items.putItem(item.id, item);
  }

  deleteProject(id: ProjectId): void {
    this.items.deleteItems((item) => item.projectId === id);
    this.builds.deleteItems((build) => build.projectId === id);
    this.projects.deleteItem(id);
  }

  deleteBuild(projectId: ProjectId, buildId: BuildId): void {
    this.items.deleteItems((item) => item.projectId === projectId && item.buildId === buildId);
    this.builds.deleteItem(buildId);
  }

  deleteStoredItem(projectId: ProjectId, buildId: BuildId, itemId: string): void {
    this.items.deleteItems((item) => item.projectId === projectId && item.buildId === buildId && item.id === itemId);
  }

  #audit(item: Auditable, existing: Auditable | null) {
    const audit: AuditInfo = {
      ts: Date.now(),
      userId: 'system',
    };

    if (existing) {
      item.updated = audit;
    } else {
      item.created = audit;
    }
  }

  #itemIdsForBuild(projectId: ProjectId, buildId: BuildId): string[] {
    const page = this.items.listItems((i) => i.projectId === projectId && i.buildId === buildId);
    return page.items.map((i) => i.id);
  }
}

