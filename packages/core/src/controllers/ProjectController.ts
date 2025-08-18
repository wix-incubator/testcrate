import { ProjectNotFoundError } from '@core/errors';
import type {
  Project,
  GetProjectRequest,
  PutProjectRequest,
  PatchProjectRequest,
  DeleteProjectRequest,
  ListProjectsRequest,
  PaginatedResponse
} from '@core/schema';
import type {
  ProjectQuery,
  ProjectStager,
  WriteBatch
} from '@core/types';

export interface ProjectControllerConfig {
  readonly createWriteBatch: () => WriteBatch;
  readonly projectQuery: ProjectQuery;
  readonly projectStagerFactory: (batch: WriteBatch) => ProjectStager;
}

export class ProjectController implements ProjectQuery {
  constructor(private readonly config: ProjectControllerConfig) {}

  async listProjects(request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    return this.config.projectQuery.listProjects(request);
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    const project = await this.config.projectQuery.getProject(request);
    if (!project) {
      throw new ProjectNotFoundError(request.id);
    }

    return project;
  }

  async putProject(request: PutProjectRequest): Promise<void> {
    await this.#tx((stager) => stager.putProject({
      id: request.id,
      name: request.payload.name,
      description: request.payload.description,
      categories: {
        revision: 1,
        data: request.payload.categories || []
      },
    }));
  }

  async patchProject(request: PatchProjectRequest): Promise<Project> {
    const project = await this.config.projectQuery.getProject(request);
    if (!project) {
      throw new ProjectNotFoundError(request.id);
    }

    const updatedProject: Project = {
      ...project,
      name: request.payload.name ?? project.name,
      description: request.payload.description ?? project.description,
      categories: {
        revision: project.categories.revision + 1,
        data: request.payload.categories ?? project.categories.data,
      },
    };

    await this.#tx((stager) => stager.putProject(updatedProject));
    return updatedProject;
  }

  async deleteProject(request: DeleteProjectRequest): Promise<boolean> {
    const project = await this.config.projectQuery.getProject(request);
    const deleted = !!project;
    if (deleted) {
      await this.#tx((stager) => stager.deleteProject(request.id));
    }

    return deleted;
  }

  async #tx(fn: (stager: ProjectStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const projectStager = this.config.projectStagerFactory(writeBatch);

    await fn(projectStager);
    await writeBatch.commit();
  }
}
