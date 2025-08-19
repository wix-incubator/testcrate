import type { BuildQuery, BuildStepQuery, ProjectQuery, StoredItemQuery, AttachmentQuery } from '@core/types';

export interface ExportControllerConfig {
  readonly projectQuery: ProjectQuery;
  readonly buildQuery: BuildQuery;
  readonly buildStepQuery: BuildStepQuery;
  readonly storedItemQuery: StoredItemQuery;
  readonly storedAttachmentQuery: AttachmentQuery;
}
