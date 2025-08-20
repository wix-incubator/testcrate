import {
  AttachmentController,
  ProjectController,
  BuildController,
  ExportController,
  StoredItemController,
} from '@core/controllers';
import type { WriteBatch } from '@core/types';

import { InMemoryDatabase } from './InMemoryDatabase';
import { InMemoryStager } from './InMemoryStager';
import { InMemoryWriteBatch } from './InMemoryWriteBatch';

export function createCompositionRoot() {
  const db = new InMemoryDatabase();

  return {
    db,
    attachmentController: makeAttachmentController(db),
    buildController: makeBuildController(db),
    exportController: makeExportController(db),
    projectController: makeProjectController(db),
    storedItemController: makeStoredItemController(db),
  };
}

function makeExportController(db: InMemoryDatabase): ExportController {
  return new ExportController({
    projectQuery: db,
    buildQuery: db,
    storedItemQuery: db,
    storedAttachmentQuery: db,
  });
}

function makeAttachmentController(db: InMemoryDatabase): AttachmentController {
  return new AttachmentController({
    attachmentQuery: db,
    attachmentStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
    createWriteBatch: () => new InMemoryWriteBatch(),
  });
}

function makeProjectController(db: InMemoryDatabase): ProjectController {
  return new ProjectController({
    projectQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    projectStagerFactory: (batch: WriteBatch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
  });
}

function makeBuildController(db: InMemoryDatabase): BuildController {
  return new BuildController({
    buildQuery: db,
    projectQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    buildStagerFactory: (batch: WriteBatch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
  });
}



function makeStoredItemController(db: InMemoryDatabase): StoredItemController {
  return new StoredItemController({
    storedItemQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    storedItemStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
  });
}

export {InMemoryDatabase} from './InMemoryDatabase';
export {InMemoryStager} from './InMemoryStager';
export {InMemoryWriteBatch} from './InMemoryWriteBatch';
