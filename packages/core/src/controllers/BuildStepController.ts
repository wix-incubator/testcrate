import { BuildNotFoundError, BuildStepNotFoundError } from '@core/errors';
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
  BuildStager,
  WriteBatch
} from '@core/types';

export interface BuildStepControllerConfig {
  readonly buildQuery: BuildQuery;
  readonly buildStagerFactory: (batch: WriteBatch) => BuildStager;
  readonly createWriteBatch: () => WriteBatch;
}

export class BuildStepController {
  constructor(private readonly config: BuildStepControllerConfig) {}

  async listBuildSteps(request: ListBuildStepsRequest): Promise<PaginatedResponse<BuildStep>> {
    const build = await this.#getBuild(request);
    return { items: build.steps ?? [] };
  }

  async getBuildStep(request: GetBuildStepRequest): Promise<BuildStep | null> {
    const build = await this.#getBuild(request);
    return build.steps?.find((step) => step.uuid === request.stepId) ?? null;
  }

  async putBuildStep(request: PutBuildStepRequest): Promise<void> {
    const { build, step } = await this.#getBuildStep(request);
    if (step) {
      Object.assign(step, {
        ...request.payload,
        updated: {
          ts: Date.now(),
          userId: 'system',
        },
      });
    } else {
      build.steps ??= [];
      build.steps.push({
        ...request.payload,
        uuid: request.stepId,
        created: {
          ts: Date.now(),
          userId: 'system',
        },
      });
    }

    await this.#tx((stager) => stager.putBuild(build));
  }

  async patchBuildStep(request: PatchBuildStepRequest): Promise<BuildStep> {
    const { build, step } = await this.#getBuildStep(request);
    if (!step) {
      throw new BuildStepNotFoundError(request.projectId, request.buildId, request.stepId);
    }

    Object.assign(step, {
      ...request.payload,
      updated: {
        ts: Date.now(),
        userId: 'system',
      },
    });

    await this.#tx((stager) => stager.putBuild(build));
    return step;
  }

  async deleteBuildStep(request: DeleteBuildStepRequest): Promise<boolean> {
    const { build, step } = await this.#getBuildStep(request);
    if (!step) {
      return false;
    }

    const index = build.steps!.indexOf(step);
    build.steps!.splice(index, 1);

    await this.#tx((stager) => stager.putBuild(build));
    return true;
  }

  async #tx(fn: (stager: BuildStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const buildStager = this.config.buildStagerFactory(writeBatch);

    await fn(buildStager);
    await writeBatch.commit();
  }

  async #getBuild(request: { projectId: string, buildId: string }) {
    const build = await this.config.buildQuery.getBuild(request);
    if (!build) {
      throw new BuildNotFoundError(request.projectId, request.buildId);
    }

    return build;
  }

  async #getBuildStep(request: { projectId: string, buildId: string, stepId: string }) {
    const build = await this.#getBuild(request);
    const step = build.steps?.find((step) => step.uuid === request.stepId) ?? null;
    return { build, step };
  }
}
