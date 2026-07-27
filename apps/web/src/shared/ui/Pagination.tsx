import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  disabled?: boolean;
  onPageChange: (page: number) => void;
  page: number;
  siblingCount?: number;
  totalPages: number;
}

export function Pagination({ disabled, onPageChange, page, siblingCount = 1, totalPages }: PaginationProps) {
  const start = Math.max(1, page - siblingCount);
  const end = Math.min(totalPages, page + siblingCount);
  const pages = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1">
      <Button aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} size="sm" variant="ghost"><ChevronLeft size={16} /></Button>
      {start > 1 ? <><Button disabled={disabled} onClick={() => onPageChange(1)} size="sm" variant="ghost">1</Button>{start > 2 ? <span aria-hidden="true" className="px-1">…</span> : null}</> : null}
      {pages.map((item) => <Button aria-current={item === page ? 'page' : undefined} disabled={disabled} key={item} onClick={() => onPageChange(item)} size="sm" variant={item === page ? 'primary' : 'ghost'}>{item}</Button>)}
      {end < totalPages ? <>{end < totalPages - 1 ? <span aria-hidden="true" className="px-1">…</span> : null}<Button disabled={disabled} onClick={() => onPageChange(totalPages)} size="sm" variant="ghost">{totalPages}</Button></> : null}
      <Button aria-label="Next page" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)} size="sm" variant="ghost"><ChevronRight size={16} /></Button>
    </nav>
  );
}
