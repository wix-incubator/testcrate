import type {
  Build,
  BuildId,
  GetBuildRequest,
  GetProjectRequest,
  GetStoredItemRequest,
  ListBuildsRequest,
  ListProjectsRequest,
  ListStoredItemsRequest,
  PaginatedResponse,
  Project,
  ProjectId,
  StoredItem
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
