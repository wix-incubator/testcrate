// InMemoryProjectStager.ts
import type { Build, BuildId, Project, ProjectId, StoredItem, BuildStep, AttachmentId, BuildStepId, StoredAttachment } from '@core/schema';
import type { BuildStager, ProjectStager, StoredItemStager, BuildStepStager, AttachmentStager } from '@core/types';

import type { InMemoryDatabase } from './InMemoryDatabase';
import type { InMemoryWriteBatch } from './InMemoryWriteBatch';

export class InMemoryStager implements AttachmentStager, BuildStager, BuildStepStager, ProjectStager, StoredItemStager {
  constructor(
    private readonly db: InMemoryDatabase,
    private readonly writeBatch: InMemoryWriteBatch
  ) {}

  putProject(project: Project): void {
    this.writeBatch.stageOperation(() => this.db.putProject(project));
  }

  putBuild(build: Build): void {
    this.writeBatch.stageOperation(() => this.db.putBuild(build));
  }

  putStoredItem(item: StoredItem): void {
    this.writeBatch.stageOperation(() => this.db.putStoredItem(item));
  }

  deleteProject(id: ProjectId): void {
    this.writeBatch.stageOperation(() => this.db.deleteProject(id));
  }

  deleteBuild(projectId: ProjectId, buildId: BuildId): void {
    this.writeBatch.stageOperation(() => this.db.deleteBuild(projectId, buildId));
  }

  deleteStoredItem(projectId: ProjectId, buildId: BuildId, itemId: string): void {
    this.writeBatch.stageOperation(() => this.db.deleteStoredItem(projectId, buildId, itemId));
  }

  // Build steps
  putBuildStep(projectId: ProjectId, buildId: BuildId, step: BuildStep): void {
    this.writeBatch.stageOperation(() => this.db.putBuildStep(projectId, buildId, step));
  }

  deleteBuildStep(projectId: ProjectId, buildId: BuildId, stepId: BuildStepId): void {
    this.writeBatch.stageOperation(() => this.db.deleteBuildStep(projectId, buildId, stepId));
  }

  // Attachments
  putAttachment(payload: StoredAttachment): void {
    this.writeBatch.stageOperation(() => this.db.putAttachment(payload));
  }

  deleteAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId, stepId?: BuildStepId): void {
    this.writeBatch.stageOperation(() => this.db.deleteAttachment(attachmentId, projectId, buildId, stepId));
  }
}
