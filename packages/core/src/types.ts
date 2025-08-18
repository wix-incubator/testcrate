import type {
  AttachmentId,
  Build,
  BuildId,
  BuildStep,
  BuildStepId,
  GetBuildRequest,
  GetProjectRequest,
  GetStoredItemRequest,
  ListBuildsRequest,
  ListBuildStepsRequest,
  GetBuildStepRequest,
  ListProjectsRequest,
  ListStoredItemsRequest,
  PaginatedResponse,
  Project,
  ProjectId,
  StoredAttachment,
  StoredItem,
  ListBuildAttachmentsRequest,
  ListBuildStepAttachmentsRequest,
} from '@core/schema';

export interface WriteBatch {
  commit(): Promise<void>;
}

//#region Build Controller dependencies

export interface BuildQuery {
  listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>>;
  getBuild(request: GetBuildRequest): Promise<Build | null>;
}

export interface BuildStager {
  putBuild(build: Build): void;
  deleteBuild(projectId: ProjectId, buildId: BuildId): void;
}

//#endregion

//#region Project Controller dependencies

export interface ProjectQuery {
  getProject(request: GetProjectRequest): Promise<Project | null>;
  listProjects(request: ListProjectsRequest): Promise<PaginatedResponse<Project>>;
}

export interface ProjectStager {
  putProject(project: Project): void;
  deleteProject(id: ProjectId): void;
}

//#endregion

//#region Stored Items Controller dependencies

export interface StoredItemQuery {
  getStoredItem(request: GetStoredItemRequest): Promise<StoredItem | null>;
  listStoredItems(request: ListStoredItemsRequest): Promise<PaginatedResponse<StoredItem>>;
}

export interface StoredItemStager {
  putStoredItem(storedItem: StoredItem): void;
  deleteStoredItem(projectId: ProjectId, buildId: BuildId, storedItemId: string): void;
}

//#endregion

//#region Build Step Controller dependencies

export interface BuildStepQuery {
  listBuildSteps(request: ListBuildStepsRequest): Promise<PaginatedResponse<BuildStep>>;
  getBuildStep(request: GetBuildStepRequest): Promise<BuildStep | null>;
}

export interface BuildStepStager {
  putBuildStep(projectId: ProjectId, buildId: BuildId, step: BuildStep): void;
  deleteBuildStep(projectId: ProjectId, buildId: BuildId, stepId: BuildStepId): void;
}

//#endregion

//#region Attachment Controller dependencies

export interface AttachmentQuery {
  listAttachments(request: ListBuildAttachmentsRequest | ListBuildStepAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>>;
  getAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId, stepId?: BuildStepId): Promise<StoredAttachment | null>;
}

export interface AttachmentStager {
  putAttachment(payload: StoredAttachment): void;
  deleteAttachment(attachmentId: AttachmentId, projectId?: ProjectId, buildId?: BuildId, stepId?: BuildStepId): void;
}

//#endregion
