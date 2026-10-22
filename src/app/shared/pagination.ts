export function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  const pageCount = Math.max(0, Math.floor(totalPages));
  if (pageCount === 0) {
    return [];
  }

  const maxVisiblePages = 5;
  const selectedPage = Math.min(pageCount, Math.max(1, Math.floor(currentPage)));
  const firstVisiblePage = Math.max(
    1,
    Math.min(selectedPage - Math.floor(maxVisiblePages / 2), pageCount - maxVisiblePages + 1)
  );
  const lastVisiblePage = Math.min(pageCount, firstVisiblePage + maxVisiblePages - 1);

  return Array.from(
    { length: lastVisiblePage - firstVisiblePage + 1 },
    (_, index) => firstVisiblePage + index
  );
}
