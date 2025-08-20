import type { D1Database } from '@cloudflare/workers-types';
import type { D1MigrationDefinition } from '@testcrate/database-d1';

import { PROJECTS_TABLE_NAME, BUILDS_TABLE_NAME, STORED_ITEMS_TABLE_NAME, ATTACHMENTS_TABLE_NAME } from '../consts';

export const CreateCoreTables: D1MigrationDefinition = {
  name: '001_create_core_tables',
  async up(db: D1Database): Promise<void> {
    // Create projects table \
    await db.exec(`CREATE TABLE IF NOT EXISTS ${PROJECTS_TABLE_NAME} (\
      id TEXT PRIMARY KEY,\
      name TEXT NOT NULL,\
      description TEXT,\
      categories_data TEXT,\
      categories_revision INTEGER,\
      created_ts INTEGER,\
      created_userId TEXT,\
      updated_ts INTEGER,\
      updated_userId TEXT\
    );`);

    // Create builds table with composite primary key (project_id, id) \
    await db.exec(`CREATE TABLE IF NOT EXISTS ${BUILDS_TABLE_NAME} (\
      project_id TEXT NOT NULL,\
      id TEXT NOT NULL,\
      parent_id TEXT,\
      root_id TEXT NOT NULL,\
      history_id TEXT,\
      name TEXT NOT NULL,\
      stage INTEGER NOT NULL CHECK (stage IN (0, 1, 2, 3)),\
      status INTEGER CHECK (status IN (0, 1, 2, 3, 4)),\
      status_message TEXT,\
      status_trace TEXT,\
      labels TEXT,\
      links TEXT,\
      parameters TEXT,\
      attachments TEXT,\
      start INTEGER NOT NULL,\
      stop INTEGER,\
      created_ts INTEGER,\
      created_userId TEXT,\
      updated_ts INTEGER,\
      updated_userId TEXT,\
      PRIMARY KEY (project_id, id),\
      FOREIGN KEY (project_id) REFERENCES ${PROJECTS_TABLE_NAME}(id) ON DELETE CASCADE,\
      FOREIGN KEY (project_id, parent_id) REFERENCES ${BUILDS_TABLE_NAME}(project_id, id) ON DELETE CASCADE,\
      FOREIGN KEY (project_id, root_id) REFERENCES ${BUILDS_TABLE_NAME}(project_id, id) ON DELETE CASCADE\
    );`);

    // Create stored_items table \
    await db.exec(`CREATE TABLE IF NOT EXISTS ${STORED_ITEMS_TABLE_NAME} (\
      id TEXT PRIMARY KEY,\
      project_id TEXT NOT NULL,\
      build_id TEXT NOT NULL,\
      type TEXT NOT NULL,\
      data TEXT NOT NULL,\
      created_ts INTEGER,\
      created_userId TEXT,\
      updated_ts INTEGER,\
      updated_userId TEXT,\
      FOREIGN KEY (project_id, build_id) REFERENCES ${BUILDS_TABLE_NAME}(project_id, id) ON DELETE CASCADE\
    );`);

    // Create attachments table \
    await db.exec(`CREATE TABLE IF NOT EXISTS ${ATTACHMENTS_TABLE_NAME} (\
      id TEXT PRIMARY KEY,\
      project_id TEXT NOT NULL,\
      build_id TEXT NOT NULL,\
      name TEXT NOT NULL,\
      type TEXT NOT NULL,\
      source TEXT NOT NULL,\
      size INTEGER,\
      created_ts INTEGER,\
      created_userId TEXT,\
      updated_ts INTEGER,\
      updated_userId TEXT,\
      FOREIGN KEY (project_id, build_id) REFERENCES ${BUILDS_TABLE_NAME}(project_id, id) ON DELETE CASCADE\
    );`);

    // Create basic indexes for now (indices discussion can wait) \
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_created_ts ON ${PROJECTS_TABLE_NAME}(created_ts DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_updated_ts ON ${PROJECTS_TABLE_NAME}(updated_ts DESC);`);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_query ON ${BUILDS_TABLE_NAME}(project_id, stage, status);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_history ON ${BUILDS_TABLE_NAME}(project_id, history_id);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_created_ts ON ${BUILDS_TABLE_NAME}(created_ts DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_start ON ${BUILDS_TABLE_NAME}(start DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_hierarchy_root ON ${BUILDS_TABLE_NAME}(project_id, root_id);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_builds_hierarchy_parent ON ${BUILDS_TABLE_NAME}(project_id, parent_id);`);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_stored_items_query ON ${STORED_ITEMS_TABLE_NAME}(project_id, build_id, type);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_attachments_query ON ${ATTACHMENTS_TABLE_NAME}(project_id, build_id);`);
  },

  async down(db: D1Database): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints \
    await db.exec(`DROP TABLE IF EXISTS ${ATTACHMENTS_TABLE_NAME};`);
    await db.exec(`DROP TABLE IF EXISTS ${STORED_ITEMS_TABLE_NAME};`);
    await db.exec(`DROP TABLE IF EXISTS ${BUILDS_TABLE_NAME};`);
    await db.exec(`DROP TABLE IF EXISTS ${PROJECTS_TABLE_NAME};`);
  },
};
