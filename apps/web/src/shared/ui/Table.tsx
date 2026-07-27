import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface TableColumn<Row> {
  align?: 'left' | 'center' | 'right';
  header: ReactNode;
  key: string;
  render: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  caption?: string;
  columns: readonly TableColumn<Row>[];
  disabled?: boolean;
  emptyMessage?: string;
  getRowKey: (row: Row) => string;
  rows: readonly Row[];
}

export function Table<Row>({ caption, columns, disabled, emptyMessage = 'No records found.', getRowKey, rows }: TableProps<Row>) {
  return <div className={cn('max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700', disabled && 'pointer-events-none opacity-60')}><table className="w-full min-w-[36rem] border-collapse text-left text-sm">
    {caption ? <caption className="sr-only">{caption}</caption> : null}
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>{columns.map((column) => <th className={cn('px-4 py-3 font-semibold', column.align === 'center' && 'text-center', column.align === 'right' && 'text-right')} key={column.key} scope="col">{column.header}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{rows.length ? rows.map((row) => <tr className="bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900" key={getRowKey(row)}>{columns.map((column) => <td className={cn('px-4 py-3', column.align === 'center' && 'text-center', column.align === 'right' && 'text-right')} key={column.key}>{column.render(row)}</td>)}</tr>) : <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody>
  </table></div>;
}
