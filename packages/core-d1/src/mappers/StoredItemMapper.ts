import type { StoredItem } from '@testcrate/core';
import type { D1StoredItemDTO } from '@core-d1/schema';

export const StoredItemMapper = {
  toDTO(model: StoredItem): D1StoredItemDTO {
    return {
      id: model.id,
      project_id: model.projectId,
      build_id: model.buildId,
      type: model.type,
      data: JSON.stringify(model.data),
      created_at: model.created!.ts,
      created_by: model.created!.userId,
      updated_at: model.updated?.ts ?? null,
      updated_by: model.updated?.userId ?? null,
    };
  },

  fromDTO(dto: D1StoredItemDTO): StoredItem {
    const model: StoredItem = {
      id: dto.id,
      projectId: dto.project_id,
      buildId: dto.build_id,
      type: dto.type,
      data: JSON.parse(dto.data),
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
