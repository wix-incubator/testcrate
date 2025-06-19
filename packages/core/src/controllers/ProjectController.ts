import { ProjectNotFoundError } from '@core/errors';
import type {
  Project,
  GetProjectRequest,
  PutProjectRequest,
  PatchProjectRequest,
  DeleteProjectRequest,
  ListProjectsRequest,
  PaginatedResponse,
} from '@core/schema';
import type { ProjectQuery, ProjectStager, TimeService, UserService, WriteBatch } from '@core/types';
import { createAuditInfo } from '@core/utils';

export interface ProjectControllerConfig {
  readonly createWriteBatch: () => WriteBatch;
  readonly projectQuery: ProjectQuery;
  readonly projectStagerFactory: (batch: WriteBatch) => ProjectStager;
  readonly userService: UserService;
  readonly timeService: TimeService;
}

export class ProjectController implements ProjectQuery {
  constructor(private readonly config: ProjectControllerConfig) {}

  async listProjects(request: ListProjectsRequest): Promise<PaginatedResponse<Project>> {
    return this.config.projectQuery.listProjects(request);
  }

  async getProject(request: GetProjectRequest): Promise<Project | null> {
    const project = await this.config.projectQuery.getProject(request);
    if (!project) {
      throw new ProjectNotFoundError(request.projectId);
    }

    return project;
  }

  async putProject(request: PutProjectRequest): Promise<void> {
    await this.#tx((stager) =>
      stager.putProject({
        id: request.projectId,
        name: request.payload.name,
        description: request.payload.description,
        categories: {
          revision: 1,
          data: request.payload.categories || [],
        },
        created: createAuditInfo(this.config.timeService, this.config.userService),
      }),
    );
  }

  async patchProject(request: PatchProjectRequest): Promise<Project> {
    const project = await this.config.projectQuery.getProject(request);
    if (!project) {
      throw new ProjectNotFoundError(request.projectId);
    }

    const updatedProject: Project = {
      ...project,
      name: request.payload.name ?? project.name,
      description: request.payload.description ?? project.description,
      categories: {
        revision: project.categories.revision + 1,
        data: request.payload.categories ?? project.categories.data,
      },
      updated: createAuditInfo(this.config.timeService, this.config.userService),
    };

    await this.#tx((stager) => stager.putProject(updatedProject));
    return updatedProject;
  }

  async deleteProject(request: DeleteProjectRequest): Promise<boolean> {
    const project = await this.config.projectQuery.getProject(request);
    const deleted = !!project;
    if (deleted) {
      await this.#tx((stager) => stager.deleteProject(request.projectId));
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
