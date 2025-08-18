import { BuildStepNotFoundError } from '@core/errors';
import type {
  BuildStep,
  DeleteBuildStepRequest,
  GetBuildStepRequest,
  ListBuildStepsRequest,
  PaginatedResponse,
  PatchBuildStepRequest,
  PutBuildStepRequest,
} from '@core/schema';
import type {
  BuildQuery,
  BuildStepQuery,
  BuildStepStager,
  WriteBatch
} from '@core/types';

export interface BuildStepControllerConfig {
  readonly buildQuery: BuildQuery;
  readonly buildStepQuery: BuildStepQuery;
  readonly buildStepStagerFactory: (batch: WriteBatch) => BuildStepStager;
  readonly createWriteBatch: () => WriteBatch;
}

export class BuildStepController {
  constructor(private readonly config: BuildStepControllerConfig) {}

  async listBuildSteps(request: ListBuildStepsRequest): Promise<PaginatedResponse<BuildStep>> {
    return await this.config.buildStepQuery.listBuildSteps(request);
  }

  async getBuildStep(request: GetBuildStepRequest): Promise<BuildStep> {
    const step = await this.config.buildStepQuery.getBuildStep(request);
    if (!step) {
      throw new BuildStepNotFoundError(request.projectId, request.buildId, request.stepId);
    }

    return step;
  }

  async putBuildStep({ projectId, buildId, stepId: id, payload }: PutBuildStepRequest): Promise<void> {
    await this.#tx((stager) => stager.putBuildStep(projectId, buildId, { ...payload, id }));
  }

  async patchBuildStep(request: PatchBuildStepRequest): Promise<BuildStep> {
    const existing = await this.config.buildStepQuery.getBuildStep(request);
    if (!existing) {
      throw new BuildStepNotFoundError(request.projectId, request.buildId, request.stepId);
    }

    // TODO: implement more complex patch logic
    const updated: BuildStep = {
      ...existing,
      ...request.payload,
    };

    await this.#tx((stager) => stager.putBuildStep(request.projectId, request.buildId, updated));
    return updated;
  }

  async deleteBuildStep(request: DeleteBuildStepRequest): Promise<boolean> {
    const existing = await this.config.buildStepQuery.getBuildStep(request);
    if (!existing) {
      return false;
    }

    await this.#tx((stager) => stager.deleteBuildStep(request.projectId, request.buildId, request.stepId));
    return true;
  }

  async #tx(fn: (stager: BuildStepStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const buildStepStager = this.config.buildStepStagerFactory(writeBatch);

    await fn(buildStepStager);
    await writeBatch.commit();
  }
}
