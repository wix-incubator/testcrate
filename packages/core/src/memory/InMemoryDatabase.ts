import type { Project, ListProjectsRequest, PaginatedResponse, Build, BuildStatus, StoredItem, GetBuildRequest, ListBuildsRequest, GetProjectRequest, ListStoredItemsRequest, GetStoredItemRequest, AuditInfo, Auditable, ProjectId, BuildId, AttachmentId, StoredAttachment, ListBuildAttachmentsRequest } from '@core/schema';
import type { BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager, AttachmentQuery, AttachmentStager } from '@core/types';
import { BuildNotFoundError, ProjectNotFoundError } from '@core/errors';
import { findDescendantsFlat } from '@core/utils';

import { InMemoryTable } from './InMemoryTable';

export class InMemoryDatabase implements BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager, AttachmentQuery, AttachmentStager {
  public readonly attachments = InMemoryTable.simple<StoredAttachment>();
  public readonly builds = InMemoryTable.simple<Build>();
  public readonly items = InMemoryTable.simple<StoredItem>();
  public readonly projects = InMemoryTable.simple<Project>();

  clear(): void {
    this.attachments.clear();
    this.items.clear();
    this.builds.clear();
    this.projects.clear();
  }

  dump() {
    return {
      attachments: this.attachments.listItems().items,
      builds: this.builds.listItems().items,
      items: this.items.listItems().items,
      projects: this.projects.listItems().items,
    };
  }

  async getBuild(request: GetBuildRequest): Promise<Build | null> {
    const build = this.builds.getItem(request.buildId);
    if (!build) {
      this.#assertChainExists(request.projectId);
      return null;
    }

    const items = this.#itemIdsForBuild(build.projectId, build.id);
    const children = this.#childrenForBuild(build.projectId, build.id);
    return { ...build, items, children };
  }

  async listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>> {
    const page = this.builds.listItems((build) => {
      if (request.projectId && build.projectId !== request.projectId) {
        return false;
      }

      if (request.stage && !request.stage.includes(build.stage)) {
        return false;
      }

      if (request.status && !request.status.includes(build.status as BuildStatus)) {
        return false;
      }

      return true;
    });

    if (page.items.length === 0) {
      this.#assertChainExists(request.projectId);
      return page;
    }

    page.items = page.items
      .map((b) => ({ ...b, items: this.#itemIdsForBuild(b.projectId, b.id), children: this.#childrenForBuild(b.projectId, b.id) }))
      .sort((a, b) => (b.created?.ts ?? 0) - (a.created?.ts ?? 0));

    return page;
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    return this.projects.getItem(request.projectId);
  }

  async listProjects(_request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    return this.projects.listItems();
  }

  async getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null> {
    return this.items.getItem(request.itemId);
  }

  async listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>> {
    const page = this.items.listItems((item) => {
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

    if (page.items.length === 0) {
      this.#assertChainExists(request.projectId, request.buildId);
    }

    return page;
  }

  async putProject(project: Project): Promise<void> {
    const existing = this.projects.getItem(project.id);
    this.#audit(project, existing);
    this.projects.putItem(project.id, project);
  }

  async putBuild(build: Build): Promise<void> {
    const existing = this.builds.getItem(build.id);
    if (!existing) {
      this.#assertChainExists(build.projectId);
    }

    this.#audit(build, existing);
    this.builds.putItem(build.id, build);
  }

  async putStoredItem(item: StoredItem): Promise<void> {
    const existing = this.items.getItem(item.id);
    if (!existing) {
      this.#assertChainExists(item.projectId, item.buildId);
    }

    this.#audit(item, existing);
    this.items.putItem(item.id, item);
  }

  async deleteProject(id: ProjectId): Promise<void> {
    this.attachments.deleteItems(({ projectId }) => projectId === id);
    this.items.deleteItems((item) => item.projectId === id);
    this.builds.deleteItems((build) => build.projectId === id);
    this.projects.deleteItem(id);
  }

  async deleteBuild(projectId: ProjectId, buildId: BuildId): Promise<void> {
    this.#assertChainExists(projectId);
    
    const buildToDelete = this.builds.getItem(buildId);
    if (!buildToDelete || buildToDelete.projectId !== projectId) {
      return; // Build doesn't exist, nothing to delete
    }
    
    // Find all descendant builds using the utility function
    const allBuilds = this.builds.listItems().items.filter(b => b.projectId === projectId);
    const descendants = findDescendantsFlat(
      buildToDelete,
      allBuilds,
      (build) => build.id,
      (build) => build.parentId
    );
    
    // Get all build IDs to delete (root + descendants)
    const buildsToDelete = [buildToDelete, ...descendants];
    const buildIdsToDelete = buildsToDelete.map(b => b.id);
    
    // Delete attachments for all builds being deleted
    this.attachments.deleteItems(({ projectId: pid, buildId: bid }) => 
      pid === projectId && buildIdsToDelete.includes(bid)
    );
    
    // Delete stored items for all builds being deleted  
    this.items.deleteItems((item) => 
      item.projectId === projectId && buildIdsToDelete.includes(item.buildId)
    );
    
    // Delete all the builds (root + descendants)
    for (const buildIdToDelete of buildIdsToDelete) {
      this.builds.deleteItem(buildIdToDelete);
    }
  }

  async deleteStoredItem(projectId: ProjectId, buildId: BuildId, itemId: string): Promise<void> {
    this.#assertChainExists(projectId, buildId);
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



  // AttachmentQuery
  async listAttachments(request: ListBuildAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    const { projectId, buildId } = request;
    const page = this.attachments.listItems(({ projectId: pid, buildId: bid }) => {
      return pid === projectId && bid === buildId;
    });

    if (page.items.length === 0) {
      this.#assertChainExists(projectId, buildId);
    }

    return page;
  }
  async getAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId): Promise<StoredAttachment | null> {
    this.#assertChainExists(projectId, buildId);
    return this.attachments.findItem(({ id, projectId: pid, buildId: bid }) => {
      return (projectId == null || pid === projectId) &&
        (buildId == null || bid === buildId) &&
        id === attachmentId;
    });
  }

  // AttachmentStager
  async putAttachment(payload: StoredAttachment) {
    const existing = this.attachments.getItem(payload.id);
    if (!existing) {
      this.#assertChainExists(payload.projectId, payload.buildId);
    }

    const stamped: StoredAttachment = { ...payload };
    this.#audit(stamped, existing);
    this.attachments.putItem(payload.id, stamped);
  }

  async deleteAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId): Promise<void> {
    this.#assertChainExists(projectId, buildId);
    this.attachments.deleteItems(({ id, projectId: pid, buildId: bid }) => {
      return (pid == null || pid === projectId) &&
        (bid == null || bid === buildId) &&
        id === attachmentId;
    });
  }

  #itemIdsForBuild(projectId: ProjectId, buildId: BuildId): string[] {
    const page = this.items.listItems((i) => i.projectId === projectId && i.buildId === buildId);
    return page.items.map((i) => i.id);
  }

  #childrenForBuild(projectId: ProjectId, buildId: BuildId): Build[] {
    return this.builds.listItems((build) => build.projectId === projectId && build.parentId === buildId)
      .items
      .sort((a, b) => a.start - b.start);
  }

  #assertChainExists(projectId?: ProjectId | null, buildId?: BuildId | null): void {
    if (projectId) {
      this.#assertProjectExists(projectId);
    } else {
      return;
    }

    if (buildId) {
      this.#assertBuildExists(projectId, buildId);
    }
  }

  #assertProjectExists(projectId: ProjectId): void {
    const project = this.projects.getItem(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
  }

  #assertBuildExists(projectId: ProjectId, buildId: BuildId): void {
    const build = this.builds.getItem(buildId);
    if (!build || build.projectId !== projectId) {
      throw new BuildNotFoundError(projectId, buildId);
    }
  }

}
