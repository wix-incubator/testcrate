import { AttachmentNotFoundError } from '@core/errors';
import type { GetBuildAttachmentRequest, GetBuildStepAttachmentRequest, GetProjectAttachmentRequest, ListBuildAttachmentsRequest, ListBuildStepAttachmentsRequest, PaginatedResponse, StoredAttachment } from '@core/schema';
import type { AttachmentQuery, AttachmentStager, WriteBatch } from '@core/types';

export interface AttachmentControllerConfig {
  readonly attachmentQuery: AttachmentQuery;
  readonly attachmentStagerFactory: (batch: WriteBatch) => AttachmentStager;
  readonly createWriteBatch: () => WriteBatch;
}

export class AttachmentController {
  constructor(private readonly config: AttachmentControllerConfig) {}

  async listAttachments(request: ListBuildAttachmentsRequest | ListBuildStepAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    return this.config.attachmentQuery.listAttachments(request as ListBuildStepAttachmentsRequest);
  }

  async getAttachment(request: GetProjectAttachmentRequest | GetBuildAttachmentRequest | GetBuildStepAttachmentRequest): Promise<StoredAttachment> {
    const { attachmentId, projectId, buildId, stepId } = request as GetBuildStepAttachmentRequest;
    const attachment = await this.config.attachmentQuery.getAttachment(attachmentId, projectId, buildId, stepId);
    if (!attachment) {
      throw new AttachmentNotFoundError(attachmentId, projectId, buildId, stepId);
    }

    return attachment;
  }

  async putAttachment(payload: StoredAttachment): Promise<void> {
    await this.#tx((stager) => stager.putAttachment(payload));
  }

  async #tx(fn: (stager: AttachmentStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const attachmentStager = this.config.attachmentStagerFactory(writeBatch);

    await fn(attachmentStager);
    await writeBatch.commit();
  }
}


