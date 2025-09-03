import type { D1Database } from '@cloudflare/workers-types';
import {
  AttachmentController,
  BuildController,
  DefaultTimeService,
  ExportController,
  ProjectController,
  StoredItemController,
  StubUserService
} from '@testcrate/core';
import type {
  AttachmentControllerConfig,
  BuildControllerConfig,
  ExportControllerConfig,
  ProjectControllerConfig,
  StoredItemControllerConfig,
  WriteBatch,
  TimeService,
  UserService,
} from '@testcrate/core';
import { D1Migrations, D1StatementBatch } from '@testcrate/database-d1';

import {
  ATTACHMENTS_TABLE_NAME,
  BUILDS_TABLE_NAME,
  PROJECTS_TABLE_NAME,
  STORED_ITEMS_TABLE_NAME,
} from './consts';
import { CreateCoreTables } from './migrations';
import { D1AttachmentQuery, D1BuildQuery, D1ProjectQuery, D1StoredItemQuery } from './queries';
import { D1AttachmentStager, D1BuildStager, D1ProjectStager, D1StoredItemStager } from './stagers';

interface CompositionRootConfig {
  db: D1Database;
  userService: UserService;
  timeService: TimeService;
}

export function createD1CompositionRoot(userConfig: Partial<CompositionRootConfig>) {
  const config = {
    db: userConfig.db!,
    userService: userConfig.userService || StubUserService,
    timeService: userConfig.timeService || DefaultTimeService,
  };

  return {
    db: config.db,
    userService: config.userService,
    timeService: config.timeService,
    migrations: makeMigrations(config),
    // Controllers
    attachmentController: makeAttachmentController(config),
    buildController: makeBuildController(config),
    exportController: makeExportController(config),
    projectController: makeProjectController(config),
    storedItemController: makeStoredItemController(config),
  };
}

function makeMigrations(config: CompositionRootConfig) {
  return new D1Migrations({
    db: config.db,
    migrations: [CreateCoreTables],
  });
}

function makeAttachmentController({ db, userService, timeService }: CompositionRootConfig): AttachmentController {
  const attachmentQuery = new D1AttachmentQuery({ db, tableName: ATTACHMENTS_TABLE_NAME });
  const createWriteBatch = () => new D1StatementBatch({ db });

  const config: AttachmentControllerConfig = {
    attachmentQuery,
    attachmentStagerFactory: (batch) => new D1AttachmentStager({ db, batch: batch as D1StatementBatch }),
    createWriteBatch,
    userService,
    timeService,
  };

  return new AttachmentController(config);
}

function makeBuildController({ db, userService, timeService }: CompositionRootConfig): BuildController {
  const buildQuery = new D1BuildQuery({ db, tableName: BUILDS_TABLE_NAME });
  const projectQuery = new D1ProjectQuery({ db, tableName: PROJECTS_TABLE_NAME });
  const createWriteBatch = () => new D1StatementBatch({ db });

  const config: BuildControllerConfig = {
    buildQuery,
    projectQuery,
    buildStagerFactory: (batch: WriteBatch) => new D1BuildStager({ db, batch: batch as D1StatementBatch }),
    createWriteBatch,
    userService,
    timeService,
  };

  return new BuildController(config);
}

function makeExportController({ db }: CompositionRootConfig): ExportController {
  const config: ExportControllerConfig = {
    projectQuery: new D1ProjectQuery({ db, tableName: PROJECTS_TABLE_NAME }),
    buildQuery: new D1BuildQuery({ db, tableName: BUILDS_TABLE_NAME }),
    storedItemQuery: new D1StoredItemQuery({ db, tableName: STORED_ITEMS_TABLE_NAME }),
    storedAttachmentQuery: new D1AttachmentQuery({ db, tableName: ATTACHMENTS_TABLE_NAME }),
  };
  return new ExportController(config);
}

function makeProjectController({ db, userService, timeService }: CompositionRootConfig): ProjectController {
  const projectQuery = new D1ProjectQuery({ db, tableName: PROJECTS_TABLE_NAME });
  const createWriteBatch = () => new D1StatementBatch({ db });

  const config: ProjectControllerConfig = {
    projectQuery,
    projectStagerFactory: (batch: WriteBatch) => new D1ProjectStager({ db, batch: batch as D1StatementBatch }),
    createWriteBatch,
    userService,
    timeService,
  };

  return new ProjectController(config);
}

function makeStoredItemController({ db, userService, timeService }: CompositionRootConfig): StoredItemController {
  const storedItemQuery = new D1StoredItemQuery({ db, tableName: STORED_ITEMS_TABLE_NAME });
  const createWriteBatch = () => new D1StatementBatch({ db });

  const config: StoredItemControllerConfig = {
    storedItemQuery,
    storedItemStagerFactory: (batch) => new D1StoredItemStager({ db, batch: batch as D1StatementBatch }),
    createWriteBatch,
    userService,
    timeService,
  };

  return new StoredItemController(config);
}
