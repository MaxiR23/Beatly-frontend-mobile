// INFO: the optimistic copy of an own playlist's tracks in its edit mode: the list with one item moved to a final index, and the list without one item.
export function movedItems<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(to, 0, moved);
  return next;
}

export function withoutIndex<T>(list: readonly T[], index: number): T[] {
  return list.filter((_item, position) => position !== index);
}
