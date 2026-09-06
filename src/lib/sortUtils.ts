import { Interaction } from '../types';

/**
 * Sorts entries within a single group (either all starred or all unstarred).
 * Prioritizes explicit `sortOrder` (0, 1, 2, ...).
 * If items don't have sortOrder, falls back to most recent creation date first.
 */
export function sortEntryGroup(group: Interaction[]): Interaction[] {
  return [...group].sort((a, b) => {
    const hasOrderA = typeof a.sortOrder === 'number';
    const hasOrderB = typeof b.sortOrder === 'number';

    // If both have explicit numeric sortOrder
    if (hasOrderA && hasOrderB) {
      if (a.sortOrder !== b.sortOrder) {
        return (a.sortOrder as number) - (b.sortOrder as number);
      }
    }

    // If one has sortOrder and the other is a newer entry without sortOrder yet
    if (hasOrderA && !hasOrderB) {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeB >= timeA) return 1; // b is newer, so b appears above
      return (a.sortOrder as number) + 1;
    }
    if (!hasOrderA && hasOrderB) {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeA >= timeB) return -1; // a is newer, so a appears above
      return -((b.sortOrder as number) + 1);
    }

    // Default fallback: most recent first (by createdAt desc)
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Groups and sorts the entire vault:
 * Starred entries ALWAYS float to the top as a distinct block,
 * followed by all unstarred entries.
 */
export function sortVaultInteractions(items: Interaction[]): Interaction[] {
  const starred = sortEntryGroup(items.filter((item) => Boolean(item.starred)));
  const unstarred = sortEntryGroup(items.filter((item) => !item.starred));
  return [...starred, ...unstarred];
}

/**
 * Calculates a new entry order after a drag-and-drop operation.
 * Enforces the strict rule:
 * - Starred items can only be reordered among other starred items.
 * - Unstarred items can only be reordered among other unstarred items.
 * - If dragged across the boundary, it snaps to the edge of its own group.
 */
export function calculateReorderedVault(
  allEntries: Interaction[],
  draggedId: string,
  targetId: string
): { updatedEntries: Interaction[]; affectedUpdates: { id: string; sortOrder: number }[] } {
  const dragged = allEntries.find((e) => e.id === draggedId);
  const target = allEntries.find((e) => e.id === targetId);

  if (!dragged || !target || dragged.id === target.id) {
    return { updatedEntries: allEntries, affectedUpdates: [] };
  }

  const isDraggedStarred = Boolean(dragged.starred);
  const isTargetStarred = Boolean(target.starred);

  // Group current sorted entries
  let starredGroup = sortEntryGroup(allEntries.filter((e) => Boolean(e.starred)));
  let unstarredGroup = sortEntryGroup(allEntries.filter((e) => !e.starred));

  if (isDraggedStarred) {
    const currentIdx = starredGroup.findIndex((e) => e.id === draggedId);
    if (currentIdx === -1) return { updatedEntries: allEntries, affectedUpdates: [] };

    // Remove from current position in starred group
    starredGroup.splice(currentIdx, 1);

    if (isTargetStarred) {
      // Valid target within the same starred group
      const targetIdx = starredGroup.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) {
        starredGroup.push(dragged);
      } else {
        starredGroup.splice(targetIdx, 0, dragged);
      }
    } else {
      // User dragged across boundary onto an unstarred entry!
      // Snap it back to the edge of its own group closest to unstarred (the bottom)
      starredGroup.push(dragged);
    }

    // Re-index sortOrder for all items in the starred group
    starredGroup = starredGroup.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
  } else {
    // Dragged item is unstarred
    const currentIdx = unstarredGroup.findIndex((e) => e.id === draggedId);
    if (currentIdx === -1) return { updatedEntries: allEntries, affectedUpdates: [] };

    // Remove from current position in unstarred group
    unstarredGroup.splice(currentIdx, 1);

    if (!isTargetStarred) {
      // Valid target within the same unstarred group
      const targetIdx = unstarredGroup.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) {
        unstarredGroup.push(dragged);
      } else {
        unstarredGroup.splice(targetIdx, 0, dragged);
      }
    } else {
      // User dragged across boundary onto a starred entry!
      // Snap it back to the edge of its own group closest to starred (the top)
      unstarredGroup.unshift(dragged);
    }

    // Re-index sortOrder for all items in the unstarred group
    unstarredGroup = unstarredGroup.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
  }

  const updatedEntries = [...starredGroup, ...unstarredGroup];
  const affectedGroup = isDraggedStarred ? starredGroup : unstarredGroup;
  const affectedUpdates = affectedGroup.map((item) => ({
    id: item.id,
    sortOrder: item.sortOrder as number,
  }));

  return { updatedEntries, affectedUpdates };
}
