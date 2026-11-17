/** Render at most seven items, regardless of the number of catalogue entries. */
export function paginationPages(
  total: number,
  position: number,
): (number | "before" | "after")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (position <= 3 || position >= total - 2)
    return [1, 2, 3, "after", total - 2, total - 1, total];
  return [1, "before", position - 1, position, position + 1, "after", total];
}
