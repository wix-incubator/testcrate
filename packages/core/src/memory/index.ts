import type { ProjectControllerConfig , BuildControllerConfig , BuildStepControllerConfig , StoredItemControllerConfig } from '@core/controllers';
import { ProjectController, BuildController, BuildStepController, StoredItemController } from '@core/controllers';
import type { WriteBatch } from '@core/types';

import { InMemoryDatabase } from './InMemoryDatabase';
import { InMemoryStager } from './InMemoryStager';
import { InMemoryWriteBatch } from './InMemoryWriteBatch';

export function createCompositionRoot() {
  const db = new InMemoryDatabase();
  const { controller: projectController } = makeProjectController(db);
  const { controller: buildController } = makeBuildController(db);
  const { controller: buildStepController } = makeBuildStepController(db);
  const { controller: storedItemController } = makeStoredItemController(db);

  return {
    db,
    buildController,
    buildStepController,
    projectController,
    storedItemController,
  };
}

function makeInMemoryConfig(db: InMemoryDatabase): ProjectControllerConfig {
  return {
    projectQuery: db,
    createWriteBatch: () => new InMemoryWriteBatch(),
    projectStagerFactory: (batch) => new InMemoryStager(db, batch as InMemoryWriteBatch),
  };
}

function makeProjectController(db?: InMemoryDatabase): { db: InMemoryDatabase; controller: ProjectController } {
  const database = db ?? new InMemoryDatabase();
  const controller = new ProjectController(makeInMemoryConfig(database));
  return { db: database, controller };
}

function makeBuildController(db?: InMemoryDatabase): { db: InMemoryDatabase; controller: BuildController } {
  const database = db ?? new InMemoryDatabase();
  const config: BuildControllerConfig = {
    buildQuery: database,
    createWriteBatch: () => new InMemoryWriteBatch(),
    buildStagerFactory: (batch: WriteBatch) => new InMemoryStager(database, batch as unknown as InMemoryWriteBatch),
  };
  const controller = new BuildController(config);
  return { db: database, controller };
}

function makeBuildStepController(db?: InMemoryDatabase): { db: InMemoryDatabase; controller: BuildStepController } {
  const database = db ?? new InMemoryDatabase();
  const config: BuildStepControllerConfig = {
    buildQuery: database,
    createWriteBatch: () => new InMemoryWriteBatch(),
    buildStagerFactory: (batch: WriteBatch) => new InMemoryStager(database, batch as unknown as InMemoryWriteBatch),
  };
  const controller = new BuildStepController(config);
  return { db: database, controller };
}

function makeStoredItemController(db?: InMemoryDatabase): { db: InMemoryDatabase; controller: StoredItemController } {
  const database = db ?? new InMemoryDatabase();
  const config: StoredItemControllerConfig = {
    storedItemQuery: database,
    createWriteBatch: () => new InMemoryWriteBatch(),
    storedItemStagerFactory: (batch: WriteBatch) => new InMemoryStager(database, batch as unknown as InMemoryWriteBatch),
    buildQuery: database,
    buildStagerFactory: (batch: WriteBatch) => new InMemoryStager(database, batch as unknown as InMemoryWriteBatch),
  };
  const controller = new StoredItemController(config);
  return { db: database, controller };
}

export {InMemoryDatabase} from './InMemoryDatabase';
export {InMemoryStager} from './InMemoryStager';
export {InMemoryWriteBatch} from './InMemoryWriteBatch';
