import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Table, type TableColumn } from './Table';

export interface DataGridColumn<Row> extends TableColumn<Row> {
  sortValue?: (row: Row) => number | string;
}

export interface DataGridProps<Row> {
  columns: readonly DataGridColumn<Row>[];
  disabled?: boolean;
  getRowKey: (row: Row) => string;
  loading?: boolean;
  rows: readonly Row[];
}

export function DataGrid<Row>({ columns, disabled, getRowKey, loading, rows }: DataGridProps<Row>) {
  const [sort, setSort] = useState<{ direction: 'asc' | 'desc'; key: string } | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const left = column.sortValue?.(a) ?? '';
      const right = column.sortValue?.(b) ?? '';
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [columns, rows, sort]);
  const renderedColumns = columns.map((column): TableColumn<Row> => ({
    ...column,
    header: column.sortValue ? <button aria-label={`Sort column ${column.key}`} className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" disabled={disabled || loading} onClick={() => setSort((current) => current?.key === column.key ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key: column.key, direction: 'asc' })} type="button">{column.header}{sort?.key === column.key ? sort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : <ChevronsUpDown size={14} />}</button> : column.header,
  }));
  if (loading) return <div aria-label="Loading data" className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" role="status" />;
  return <Table columns={renderedColumns} getRowKey={getRowKey} rows={sortedRows} {...(disabled === undefined ? {} : { disabled })} />;
}
