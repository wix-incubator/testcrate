import type { TimeService, UserService } from '@core/types';
import { AuditError } from '@core/errors';
import type { AuditInfo } from '@core/schema';

export function createAuditInfo(timeService: TimeService, userService: UserService): AuditInfo {
  const userId = userService.getUserId();
  if (!userId) {
    throw new AuditError();
  }
  return {
    ts: timeService.now(),
    userId,
  };
}

/**
 * Finds all descendants of a given item in a flat collection using parent-child relationships.
 *
 * @param rootItem - The item to find descendants for
 * @param collection - The flat collection to search in
 * @param getId - Function to extract the ID from an item
 * @param getParentId - Function to extract the parent ID from an item (nullable)
 * @returns Array of all descendant items (does not include the root item itself)
 *
 * @example
 * ```ts
 * const builds = [
 *   { id: 'b1', parentId: null, name: 'Root Build' },
 *   { id: 'b2', parentId: 'b1', name: 'Child 1' },
 *   { id: 'b3', parentId: 'b1', name: 'Child 2' },
 *   { id: 'b4', parentId: 'b2', name: 'Grandchild' },
 * ];
 *
 * const descendants = findDescendantsFlat(
 *   builds[0], // b1
 *   builds,
 *   (b) => b.id,
 *   (b) => b.parentId
 * );
 * // Returns: [b2, b3, b4]
 * ```
 */
export function findDescendantsFlat<T, Id>(
  rootItem: T,
  collection: T[],
  getId: (item: T) => Id,
  getParentId: (item: T) => Id | null | undefined
): T[] {
  const rootId = getId(rootItem);
  const descendants: T[] = [];
  const toProcess: Id[] = [rootId];

  while (toProcess.length > 0) {
    const currentId = toProcess.shift()!;

    // Find all direct children of the current item
    const children = collection.filter(item => {
      const parentId = getParentId(item);
      return parentId !== null && parentId !== undefined && parentId === currentId;
    });

    // Add children to results and queue them for processing
    for (const child of children) {
      descendants.push(child);
      toProcess.push(getId(child));
    }
  }

  return descendants;
}
