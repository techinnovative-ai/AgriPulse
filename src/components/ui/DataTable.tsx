import React from 'react';

export interface DataTableColumn<Row> {
  key: string;
  header: React.ReactNode;
  render: (row: Row) => React.ReactNode;
  numeric?: boolean;
  width?: string | number;
  className?: string;
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption: string;
  emptyMessage?: React.ReactNode;
  onRowClick?: (row: Row) => void;
  maxHeight?: number;
  minWidth?: number;
}

/** Responsive data table with controlled horizontal scrolling on narrow screens. */
export function DataTable<Row>({ columns, rows, rowKey, caption, emptyMessage, onRowClick, maxHeight, minWidth }: DataTableProps<Row>) {
  return (
    <div className="ap-table-wrap" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="ap-table" style={minWidth ? { minWidth } : undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? 'is-numeric' : undefined} style={column.width ? { width: column.width } : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-xs text-slate-500">
                {emptyMessage || 'No rows to show.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === 'Enter') onRowClick(row); } : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={[column.numeric ? 'is-numeric' : '', column.className || ''].filter(Boolean).join(' ') || undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
