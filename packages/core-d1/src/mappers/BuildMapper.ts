import type { Build, BuildStage, BuildStatus } from '@testcrate/core';
import type { D1BuildDTO } from '@core-d1/schema';

export class BuildMapper {
  static fromDTO(dto: D1BuildDTO): Build {
    return {
      id: dto.id,
      projectId: dto.project_id,
      parentId: dto.parent_id || undefined,
      rootId: dto.root_id,
      historyId: dto.history_id || undefined,
      name: dto.name,
      stage: this.mapStageFromDB(dto.stage),
      status: dto.status ? this.mapStatusFromDB(dto.status) : undefined,
      statusDetails: dto.status_message || dto.status_trace ? {
        message: dto.status_message ?? undefined,
        trace: dto.status_trace ?? undefined,
      } : undefined,
      labels: dto.labels ? JSON.parse(dto.labels) : undefined,
      links: dto.links ? JSON.parse(dto.links) : undefined,
      parameters: dto.parameters ? JSON.parse(dto.parameters) : undefined,
      attachments: dto.attachments ? JSON.parse(dto.attachments) : undefined,
      start: dto.start,
      stop: dto.stop || undefined,
      children: undefined, // Will be populated by query layer
      items: undefined, // Will be populated by query layer
      created: {
        ts: dto.created_at,
        userId: dto.created_by,
      },
      updated: dto.updated_at && dto.updated_by ? {
        ts: dto.updated_at,
        userId: dto.updated_by,
      } : undefined,
    };
  }

  static toDTO(build: Build): D1BuildDTO {
    return {
      project_id: build.projectId,
      id: build.id,
      parent_id: build.parentId || null,
      root_id: build.rootId,
      history_id: build.historyId || null,
      name: build.name,
      stage: this.mapStageToDB(build.stage),
      status: build.status == null ? 4 : this.mapStatusToDB(build.status),
      status_message: build.statusDetails?.message ?? null,
      status_trace: build.statusDetails?.trace ?? null,
      labels: build.labels ? JSON.stringify(build.labels) : null,
      links: build.links ? JSON.stringify(build.links) : null,
      parameters: build.parameters ? JSON.stringify(build.parameters) : null,
      attachments: build.attachments ? JSON.stringify(build.attachments) : null,
      start: build.start,
      stop: build.stop || null,
      created_at: build.created?.ts ?? 0,
      created_by: build.created?.userId ?? '',
      updated_at: build.updated?.ts ?? null,
      updated_by: build.updated?.userId ?? null,
    };
  }

  // Helper methods for stage mapping
  private static mapStageFromDB(dbStage: number): BuildStage {
    switch (dbStage) {
      case 0: { return 'scheduled';
      }
      case 1: { return 'running';
      }
      case 2: { return 'finished';
      }
      case 3: { return 'interrupted';
      }
      default: { return 'scheduled';
      }
    }
  }

  private static mapStageToDB(stage: BuildStage): number {
    switch (stage) {
      case 'scheduled': { return 0;
      }
      case 'running': { return 1;
      }
      case 'finished': { return 2;
      }
      case 'interrupted': { return 3;
      }
      default: { return 0;
      }
    }
  }

  // Helper methods for status mapping
  private static mapStatusFromDB(dbStatus: number): BuildStatus {
    switch (dbStatus) {
      case 0: { return 'passed';
      }
      case 1: { return 'failed';
      }
      case 2: { return 'broken';
      }
      case 3: { return 'skipped';
      }
      case 4: { return 'unknown';
      }
      default: { return 'unknown';
      }
    }
  }

  private static mapStatusToDB(status: BuildStatus): number {
    switch (status) {
      case 'passed': { return 0;
      }
      case 'failed': { return 1;
      }
      case 'broken': { return 2;
      }
      case 'skipped': { return 3;
      }
      case 'unknown': { return 4;
      }
      default: { return 4;
      }
    }
  }
};
