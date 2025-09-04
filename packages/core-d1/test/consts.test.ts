import { describe, it, expect } from 'vitest';

import {
  ATTACHMENTS_TABLE_NAME,
  BUILDS_TABLE_NAME,
  PROJECTS_TABLE_NAME,
  STORED_ITEMS_TABLE_NAME,
} from '../src/consts';

describe('Constants', () => {
  it('should export correct table names', () => {
    expect(ATTACHMENTS_TABLE_NAME).toBe('Attachments');
    expect(BUILDS_TABLE_NAME).toBe('Builds');
    expect(PROJECTS_TABLE_NAME).toBe('Projects');
    expect(STORED_ITEMS_TABLE_NAME).toBe('StoredItems');
  });

  it('should have non-empty table names', () => {
    expect(ATTACHMENTS_TABLE_NAME).toBeTruthy();
    expect(BUILDS_TABLE_NAME).toBeTruthy();
    expect(PROJECTS_TABLE_NAME).toBeTruthy();
    expect(STORED_ITEMS_TABLE_NAME).toBeTruthy();
  });
});
