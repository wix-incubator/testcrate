import type { D1Database } from '@cloudflare/workers-types';
import {
  AttachmentController,
  BuildController,
  ExportController,
  ProjectController,
  StoredItemController,
  DefaultTimeService,
  StubUserService,
} from '@testcrate/core';
import type {
  AttachmentControllerConfig,
  BuildControllerConfig,
  ExportControllerConfig,
  ProjectControllerConfig,
  StoredItemControllerConfig,
  WriteBatch,
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

const userService = StubUserService;
const timeService = DefaultTimeService;

interface CompositionRootConfig {
  db: D1Database;
}

export function createD1CompositionRoot(config: CompositionRootConfig) {
  return {
    db: config.db,
    migrations: makeMigrations(config),
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

function makeAttachmentController({ db }: CompositionRootConfig): AttachmentController {
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

function makeBuildController({ db }: CompositionRootConfig): BuildController {
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

function makeProjectController({ db }: CompositionRootConfig): ProjectController {
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

function makeStoredItemController({ db }: CompositionRootConfig): StoredItemController {
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
