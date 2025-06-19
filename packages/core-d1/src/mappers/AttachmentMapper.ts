import type { StoredAttachment } from '@testcrate/core';
import type { D1AttachmentDTO } from '@core-d1/schema';

export const AttachmentMapper = {
  toDTO(model: StoredAttachment): D1AttachmentDTO {
    return {
      id: model.id,
      project_id: model.projectId,
      build_id: model.buildId,
      name: model.name,
      type: model.type,
      source: model.source,
      size: model.size ?? null,
      created_at: model.created!.ts,
      created_by: model.created!.userId,
      updated_at: model.updated?.ts ?? null,
      updated_by: model.updated?.userId ?? null,
    };
  },

  toModel(dto: D1AttachmentDTO): StoredAttachment {
    const model: StoredAttachment = {
      id: dto.id,
      projectId: dto.project_id,
      buildId: dto.build_id,
      name: dto.name,
      type: dto.type,
      source: dto.source,
      size: dto.size ?? undefined,
      created: {
        ts: dto.created_at,
        userId: dto.created_by,
      },
    };

    if (dto.updated_at && dto.updated_by) {
      model.updated = {
        ts: dto.updated_at,
        userId: dto.updated_by,
      };
    }

    return model;
  },
};
