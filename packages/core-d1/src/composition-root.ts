import type { D1Database } from '@cloudflare/workers-types';
import { ProjectController } from '@testcrate/core';
import type { ProjectControllerConfig, ProjectStager } from '@testcrate/core';
import { D1StatementBatch } from '@testcrate/database-d1';
import { PROJECTS_TABLE_NAME } from '@core-d1/consts';
import { D1ProjectQuery } from '@core-d1/queries';
// import { D1ProjectStager } from '@core-d1/stagers';

export function createD1ProjectController(db: D1Database) {
  const projectQuery = new D1ProjectQuery({ db, tableName: PROJECTS_TABLE_NAME });
  const createWriteBatch = () => new D1StatementBatch({ db });

  const config: ProjectControllerConfig = {
    projectQuery,
    // TODO: Implement D1ProjectStager
    projectStagerFactory: () => ({} as unknown as ProjectStager),
    createWriteBatch,
  };

  return new ProjectController(config);
}
