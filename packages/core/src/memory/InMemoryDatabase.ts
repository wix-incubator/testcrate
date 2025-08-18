import type { Project, ListProjectsRequest, PaginatedResponse, Build, BuildStatus, ListBuildStepsRequest, GetBuildStepRequest, StoredItem, GetBuildRequest, ListBuildsRequest, GetProjectRequest, ListStoredItemsRequest, GetStoredItemRequest, AuditInfo, Auditable, ProjectId, BuildId, BuildStep, BuildStepId, AttachmentId, StoredAttachment, ListBuildStepAttachmentsRequest, ListBuildAttachmentsRequest } from '@core/schema';
import type { BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager, BuildStepQuery, BuildStepStager, AttachmentQuery, AttachmentStager } from '@core/types';
import { BuildNotFoundError, BuildStepNotFoundError, ProjectNotFoundError } from '@core/errors';

import { InMemoryTable } from './InMemoryTable';

type BuildStepTriple = [ProjectId, BuildId, BuildStepId];

export class InMemoryDatabase implements BuildQuery, BuildStager, ProjectQuery, ProjectStager, StoredItemQuery, StoredItemStager, BuildStepQuery, BuildStepStager, AttachmentQuery, AttachmentStager {
  public readonly attachments = InMemoryTable.simple<StoredAttachment>();
  public readonly builds = InMemoryTable.simple<Build>();
  public readonly items = InMemoryTable.simple<StoredItem>();
  public readonly projects = InMemoryTable.simple<Project>();
  public readonly buildSteps = new InMemoryTable<BuildStep, BuildStepTriple, string>(
    ([projectId, buildId, stepId]) => `${projectId}:${buildId}:${stepId}`,
    (key) => key.split(':') as BuildStepTriple,
  );

  clear(): void {
    this.attachments.clear();
    this.items.clear();
    this.buildSteps.clear();
    this.builds.clear();
    this.projects.clear();
  }

  dump() {
    return {
      attachments: this.attachments.listItems().items,
      builds: this.builds.listItems().items,
      items: this.items.listItems().items,
      projects: this.projects.listItems().items,
      steps: this.buildSteps.listItems().items,
    };
  }

  async getBuild(request: GetBuildRequest): Promise<Build | null> {
    const build = this.builds.getItem(request.buildId);
    if (!build) {
      this.#assertChainExists(request.projectId);
      return null;
    }

    const items = this.#itemIdsForBuild(build.projectId, build.id);
    const steps = this.#stepsForBuild(build.projectId, build.id);
    return { ...build, items, steps };
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
      .map((b) => ({ ...b, items: this.#itemIdsForBuild(b.projectId, b.id), steps: this.#stepsForBuild(b.projectId, b.id) }))
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
    this.buildSteps.deleteItems(stepsBelongingTo(id));
    this.builds.deleteItems((build) => build.projectId === id);
    this.projects.deleteItem(id);
  }

  async deleteBuild(projectId: ProjectId, buildId: BuildId): Promise<void> {
    this.#assertChainExists(projectId);
    this.attachments.deleteItems(({ projectId: pid, buildId: bid }) => pid === projectId && bid === buildId);
    this.items.deleteItems((item) => item.projectId === projectId && item.buildId === buildId);
    this.buildSteps.deleteItems(stepsBelongingTo(projectId, buildId));
    this.builds.deleteItem(buildId);
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

  // BuildStepQuery
  async listBuildSteps(request: ListBuildStepsRequest): Promise<PaginatedResponse<BuildStep>> {
    this.#assertChainExists(request.projectId, request.buildId);
    return { items: this.#stepsForBuild(request.projectId, request.buildId) };
  }

  async getBuildStep(request: GetBuildStepRequest): Promise<BuildStep | null> {
    this.#assertChainExists(request.projectId, request.buildId);
    return this.buildSteps.getItem([request.projectId, request.buildId, request.stepId]);
  }

  // BuildStepStager
  async putBuildStep(projectId: ProjectId, buildId: BuildId, step: BuildStep): Promise<void> {
    this.#assertBuildExists(projectId, buildId);

    const key: BuildStepTriple = [projectId, buildId, step.id];
    const existing = this.buildSteps.getItem(key);
    const stamped: BuildStep = { ...step };
    this.#audit(stamped, existing);
    this.buildSteps.putItem(key, stamped);
  }

  async deleteBuildStep(projectId: ProjectId, buildId: BuildId, stepId: BuildStepId): Promise<void> {
    this.#assertChainExists(projectId, buildId);
    this.attachments.deleteItems(({ projectId: pid, buildId: bid, stepId: sid }) => pid === projectId && bid === buildId && sid === stepId);
    this.buildSteps.deleteItem([projectId, buildId, stepId]);
  }

  // AttachmentQuery
  async listAttachments(request: ListBuildAttachmentsRequest | ListBuildStepAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    const { projectId, buildId, stepId } = request as ListBuildStepAttachmentsRequest;
    const page = this.attachments.listItems(({ projectId: pid, buildId: bid, stepId: sid }) => {
      return pid === projectId && bid === buildId && (stepId == null || sid === stepId);
    });

    if (page.items.length === 0) {
      this.#assertChainExists(projectId, buildId, stepId);
    }

    return page;
  }
  async getAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId, stepId?: BuildStepId): Promise<StoredAttachment | null> {
    this.#assertChainExists(projectId, buildId, stepId);
    return this.attachments.findItem(({ id, projectId: pid, buildId: bid, stepId: sid }) => {
      return (projectId == null || pid === projectId) &&
        (buildId == null || bid === buildId) &&
        (stepId == null || sid === stepId) &&
        id === attachmentId;
    });
  }

  // AttachmentStager
  async putAttachment(payload: StoredAttachment) {
    const existing = this.attachments.getItem(payload.id);
    if (!existing) {
      this.#assertChainExists(payload.projectId, payload.buildId, payload.stepId);
    }

    const stamped: StoredAttachment = { ...payload };
    this.#audit(stamped, existing);
    this.attachments.putItem(payload.id, stamped);
  }

  async deleteAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId, stepId?: BuildStepId): Promise<void> {
    this.#assertChainExists(projectId, buildId, stepId);
    this.attachments.deleteItems(({ id, projectId: pid, buildId: bid, stepId: sid }) => {
      return (pid == null || pid === projectId) &&
        (bid == null || bid === buildId) &&
        (sid == null || sid === stepId) &&
        id === attachmentId;
    });
  }

  #itemIdsForBuild(projectId: ProjectId, buildId: BuildId): string[] {
    const page = this.items.listItems((i) => i.projectId === projectId && i.buildId === buildId);
    return page.items.map((i) => i.id);
  }

  #stepsForBuild(projectId: ProjectId, buildId: BuildId): BuildStep[] {
    return this.buildSteps.listItems(stepsBelongingTo(projectId, buildId))
      .items
      .sort((a, b) => a.start - b.start);
  }

  #assertChainExists(projectId?: ProjectId | null, buildId?: BuildId | null, stepId?: BuildStepId | null): void {
    if (projectId) {
      this.#assertProjectExists(projectId);
    } else {
      return;
    }

    if (buildId) {
      this.#assertBuildExists(projectId, buildId);
    } else {
      return;
    }

    if (stepId) {
      this.#assertBuildStepExists(projectId, buildId, stepId);
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

  #assertBuildStepExists(projectId: ProjectId, buildId: BuildId, stepId: BuildStepId): void {
    const step = this.buildSteps.getItem([projectId, buildId, stepId]);
    if (!step) {
      throw new BuildStepNotFoundError(projectId, buildId, stepId);
    }
  }
}

function stepsBelongingTo(projectId: ProjectId, buildId?: BuildId): (item: BuildStep, key: BuildStepTriple) => boolean {
  return (_item: BuildStep, [stepProjectId, stepBuildId]: BuildStepTriple) => projectId === stepProjectId && (buildId == null || stepBuildId === buildId);
}
