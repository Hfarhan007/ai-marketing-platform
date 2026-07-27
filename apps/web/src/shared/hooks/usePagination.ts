import { useMemo, useState } from 'react';
import { paginationRange } from '@/shared/utils/pagination';
export function usePagination(totalItems: number, initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const setPageSize = (size: number) => { if (!Number.isInteger(size) || size < 1) throw new RangeError('Page size must be positive.'); setPageSizeState(size); setPage(1); };
  return { canNext: currentPage < totalPages, canPrevious: currentPage > 1, next: () => setPage((current) => Math.min(totalPages, current + 1)), page: currentPage, pages: useMemo(() => paginationRange(currentPage, totalPages), [currentPage, totalPages]), pageSize, previous: () => setPage((current) => Math.max(1, current - 1)), setPage: (next: number) => setPage(Math.min(totalPages, Math.max(1, next))), setPageSize, totalPages };
}
