import type { BuildQuery, ProjectQuery, StoredItemQuery, AttachmentQuery } from '@core/types';

export interface ExportControllerConfig {
  readonly buildQuery: BuildQuery;
  readonly projectQuery: ProjectQuery;
  readonly storedItemQuery: StoredItemQuery;
  readonly storedAttachmentQuery: AttachmentQuery;
}
