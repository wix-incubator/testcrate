import { AttachmentNotFoundError } from '@core/errors';
import type { GetBuildAttachmentRequest, GetProjectAttachmentRequest, ListBuildAttachmentsRequest, PaginatedResponse, StoredAttachment } from '@core/schema';
import type { AttachmentQuery, AttachmentStager, WriteBatch } from '@core/types';

export interface AttachmentControllerConfig {
  readonly attachmentQuery: AttachmentQuery;
  readonly attachmentStagerFactory: (batch: WriteBatch) => AttachmentStager;
  readonly createWriteBatch: () => WriteBatch;
}

export class AttachmentController {
  constructor(private readonly config: AttachmentControllerConfig) {}

  async listAttachments(request: ListBuildAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    return this.config.attachmentQuery.listAttachments(request);
  }

  async getAttachment(request: GetProjectAttachmentRequest | GetBuildAttachmentRequest): Promise<StoredAttachment> {
    const { attachmentId, projectId, buildId } = request as GetBuildAttachmentRequest;
    const attachment = await this.config.attachmentQuery.getAttachment(attachmentId, projectId, buildId);
    if (!attachment) {
      throw new AttachmentNotFoundError(attachmentId, projectId, buildId);
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


