import { AttachmentNotFoundError } from '@core/errors';
import type { GetBuildAttachmentRequest, GetProjectAttachmentRequest, ListBuildAttachmentsRequest, PaginatedResponse, StoredAttachment } from '@core/schema';
import type { AttachmentQuery, AttachmentStager, WriteBatch, TimeService, UserService } from '@core/types';
import { createAuditInfo } from '@core/utils';

export interface AttachmentControllerConfig {
  readonly attachmentQuery: AttachmentQuery;
  readonly attachmentStagerFactory: (batch: WriteBatch) => AttachmentStager;
  readonly createWriteBatch: () => WriteBatch;
  readonly userService: UserService;
  readonly timeService: TimeService;
}

export class AttachmentController {
  constructor(private readonly config: AttachmentControllerConfig) {}

  async listAttachments(request: ListBuildAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    return this.config.attachmentQuery.listAttachments(request);
  }

  async getAttachment(request: GetProjectAttachmentRequest | GetBuildAttachmentRequest): Promise<StoredAttachment> {
    const attachment = await this.config.attachmentQuery.getAttachment(request);
    if (!attachment) {
      const { attachmentId, projectId } = request;
      const buildId = 'buildId' in request ? request.buildId : undefined;
      throw new AttachmentNotFoundError(attachmentId, projectId, buildId);
    }

    return attachment;
  }

  async putAttachment(payload: StoredAttachment): Promise<void> {
    const created = createAuditInfo(this.config.timeService, this.config.userService);
    await this.#tx((stager) => stager.putAttachment({ ...payload, created }));
  }

  async #tx(fn: (stager: AttachmentStager) => unknown) {
    const writeBatch = this.config.createWriteBatch();
    const attachmentStager = this.config.attachmentStagerFactory(writeBatch);

    await fn(attachmentStager);
    await writeBatch.commit();
  }
}


