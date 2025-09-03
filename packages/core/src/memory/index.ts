import {
  AttachmentController,
  ProjectController,
  BuildController,
  ExportController,
  StoredItemController,
} from '@core/controllers';
import { DefaultTimeService, StubUserService} from '@core/services';
import type { TimeService, UserService, WriteBatch } from '@core/types';

import { InMemoryDatabase } from './InMemoryDatabase';
import { InMemoryStager } from './InMemoryStager';
import { InMemoryWriteBatch } from './InMemoryWriteBatch';

interface CompositionRootConfig {
  db: InMemoryDatabase;
  timeService: TimeService;
  userService: UserService;
}

export function createCompositionRoot(userConfig?: Partial<CompositionRootConfig>) {
  const config = {
    db: new InMemoryDatabase(),
    timeService: DefaultTimeService,
    userService: StubUserService,
    ...userConfig,
  };

  return {
    db: config.db,
    attachmentController: makeAttachmentController(config),
    buildController: makeBuildController(config),
    exportController: makeExportController(config),
    projectController: makeProjectController(config),
    storedItemController: makeStoredItemController(config),
  };
}

function makeExportController({ db }: CompositionRootConfig): ExportController {
  return new ExportController({
    projectQuery: db,
    buildQuery: db,
    storedItemQuery: db,
    storedAttachmentQuery: db,
  });
}

function makeAttachmentController({ db, timeService, userService }: CompositionRootConfig): AttachmentController {
  return new AttachmentController({
    attachmentQuery: db,
    attachmentStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
    createWriteBatch: () => new InMemoryWriteBatch(),
    userService,
    timeService,
  });
}

function makeProjectController({ db, timeService, userService }: CompositionRootConfig): ProjectController {
  return new ProjectController({
    projectQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    projectStagerFactory: (batch: WriteBatch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
    userService,
    timeService,
  });
}

function makeBuildController({ db, timeService, userService }: CompositionRootConfig): BuildController {
  return new BuildController({
    buildQuery: db,
    projectQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    buildStagerFactory: (batch: WriteBatch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
    userService,
    timeService,
  });
}

function makeStoredItemController({ db, timeService, userService }: CompositionRootConfig): StoredItemController {
  return new StoredItemController({
    storedItemQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    storedItemStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
    userService,
    timeService,
  });
}

export {InMemoryDatabase} from './InMemoryDatabase';
export {InMemoryStager} from './InMemoryStager';
export {InMemoryWriteBatch} from './InMemoryWriteBatch';
