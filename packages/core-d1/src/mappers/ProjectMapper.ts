import type { Project } from '@testcrate/core';
import type { D1ProjectDTO } from '@core-d1/schema';

export const ProjectMapper = {
  fromDTO(dto: D1ProjectDTO): Project {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? undefined,
      categories: {
        revision: dto.categories_revision,
        data: JSON.parse(dto.categories_data),
      },
      created: {
        ts: dto.created_at,
        userId: dto.created_by,
      },
      updated: dto.updated_at && dto.updated_by ? {
        ts: dto.updated_at,
        userId: dto.updated_by,
      } : undefined,
    };
  },

  toDTO(project: Project): D1ProjectDTO {
    return {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      categories_revision: project.categories.revision,
      categories_data: JSON.stringify(project.categories.data),
      created_at: project.created?.ts ?? 0,
      created_by: project.created?.userId ?? '',
      updated_at: project.updated?.ts ?? null,
      updated_by: project.updated?.userId ?? null,
    };
  },
};
