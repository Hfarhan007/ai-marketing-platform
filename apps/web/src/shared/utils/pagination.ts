import type { PaginatedResult, PaginationInput } from '@/shared/types';

export function normalizePagination(input: Partial<PaginationInput>, maxPageSize = 100): PaginationInput {
  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page as number : 1;
  const requested = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0 ? input.pageSize as number : 20;
  return { page, pageSize: Math.min(requested, maxPageSize) };
}
export function paginate<Value>(values: readonly Value[], input: PaginationInput): PaginatedResult<Value> {
  const { page, pageSize } = normalizePagination(input);
  const totalPages = Math.max(1, Math.ceil(values.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  return { items: values.slice((currentPage - 1) * pageSize, currentPage * pageSize), page: currentPage, pageSize, total: values.length, totalPages };
}
export function paginationRange(current: number, total: number, siblingCount = 1) {
  if (total < 1) return [];
  const start = Math.max(1, current - siblingCount);
  const end = Math.min(total, current + siblingCount);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
