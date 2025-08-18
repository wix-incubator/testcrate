import { AttachmentController, ProjectController, BuildController, BuildStepController, StoredItemController } from '@core/controllers';
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
    buildStepController: makeBuildStepController(db),
    projectController: makeProjectController(db),
    storedItemController: makeStoredItemController(db),
  };
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

function makeBuildStepController(db: InMemoryDatabase): BuildStepController {
  return new BuildStepController({
    buildQuery: db,
    buildStepQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    buildStepStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
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
