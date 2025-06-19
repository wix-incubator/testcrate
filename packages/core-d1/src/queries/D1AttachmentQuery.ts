import type { D1Database } from '@cloudflare/workers-types';
import type { ListBuildAttachmentsRequest, PaginatedResponse, StoredAttachment, AttachmentQuery, GetBuildAttachmentRequest } from '@testcrate/core';
import type { D1AttachmentDTO } from '@core-d1/schema';
import { AttachmentMapper } from '@core-d1/mappers';
import { D1Paginator } from '@testcrate/database-d1';

export interface D1AttachmentQueryConfig {
  db: D1Database;
  tableName: string;
}

export class D1AttachmentQuery implements AttachmentQuery {
  private readonly paginator: D1Paginator<StoredAttachment, D1AttachmentDTO>;

  constructor(private readonly config: D1AttachmentQueryConfig) {
    this.paginator = new D1Paginator<StoredAttachment, D1AttachmentDTO>({
      ...config,
      mapper: AttachmentMapper.toModel,
    });
  }

  async listAttachments(request: ListBuildAttachmentsRequest): Promise<PaginatedResponse<StoredAttachment>> {
    const { projectId, buildId } = request;

    return this.paginator.paginate(request, {
      where: 'project_id = ? AND build_id = ?',
      bindParams: [projectId, buildId],
    });
  }

  async getAttachment(request: GetBuildAttachmentRequest): Promise<StoredAttachment | null> {
    const { projectId, buildId, attachmentId } = request;
    const stmt = this.config.db.prepare(`SELECT * FROM ${this.config.tableName} WHERE project_id = ? AND build_id = ? AND id = ?`);
    const result = await stmt.bind(projectId, buildId, attachmentId).first<D1AttachmentDTO>();
    return result ? AttachmentMapper.toModel(result) : null;
  }
}
