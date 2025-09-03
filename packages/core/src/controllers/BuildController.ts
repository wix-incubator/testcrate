import { BuildNotFoundError } from '@core/errors';
import type {
  Build,
  ListBuildsRequest,
  PaginatedResponse,
  GetBuildRequest,
  DeleteBuildRequest,
  PatchBuildRequest,
  PutBuildRequest,
} from '@core/schema';
import type {
  BuildQuery,
  BuildStager,
  ProjectQuery,
  TimeService,
  UserService,
  WriteBatch
} from '@core/types';
import { createAuditInfo } from '@core/utils';

export interface BuildControllerConfig {
  readonly buildQuery: BuildQuery;
  readonly projectQuery: ProjectQuery;
  readonly buildStagerFactory: (batch: WriteBatch) => BuildStager;
  readonly createWriteBatch: () => WriteBatch;
  readonly userService: UserService;
  readonly timeService: TimeService;
}

export class BuildController implements BuildQuery {
  constructor(private readonly config: BuildControllerConfig) {}

  async listBuilds(request: ListBuildsRequest): Promise<PaginatedResponse<Build>> {
    return await this.config.buildQuery.listBuilds(request);
  }

  async getBuild(request: GetBuildRequest): Promise<Build> {
    const build = await this.config.buildQuery.getBuild(request);
    if (!build) {
      throw new BuildNotFoundError(request.projectId, request.buildId);
    }

    return build;
  }

  async getBuildWithChildren(request: GetBuildRequest): Promise<Build> {
    const build = await this.config.buildQuery.getBuildWithChildren(request);
    if (!build) {
      throw new BuildNotFoundError(request.projectId, request.buildId);
    }

    return build;
  }

  async putBuild(request: PutBuildRequest): Promise<Build> {
    const build: Build = {
      ...request.payload,
      id: request.buildId,
      projectId: request.projectId,
      rootId: request.payload.rootId ?? request.payload.parentId ?? request.buildId,
      created: createAuditInfo(this.config.timeService, this.config.userService),
    };

    await this.#tx((stager) => stager.putBuild(build));

    return build;
  }

  async patchBuild(request: PatchBuildRequest): Promise<Build> {
    const existing = await this.config.buildQuery.getBuild(request);
    if (!existing) {
      throw new BuildNotFoundError(request.projectId, request.buildId);
    }

    // TODO: implement more complex patch logic
    const updatedBuild: Build = {
      ...existing,
      ...request.payload,
      updated: createAuditInfo(this.config.timeService, this.config.userService),
    };

    await this.#tx((stager) => stager.putBuild(updatedBuild));

    return updatedBuild;
  }

  async deleteBuild(request: DeleteBuildRequest): Promise<boolean> {
    const existing = await this.config.buildQuery.getBuild(request);
    if (existing) {
      await this.#tx((stager) => stager.deleteBuild(request.projectId, request.buildId));
      return true;
    }

    return false;
  }

  async #tx(fn: (stager: BuildStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const buildStager = this.config.buildStagerFactory(writeBatch);

    await fn(buildStager);
    await writeBatch.commit();
  }
}
