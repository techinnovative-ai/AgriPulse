/** Minimal CSV export helpers (client-side, no external dependencies). */

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCell(value: CsvRow[string]): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Guard against spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvRow[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const headers = columns || Array.from(rows.reduce((set, row) => { Object.keys(row).forEach((key) => set.add(key)); return set; }, new Set<string>()));
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(headers.map((header) => escapeCell(row[header])).join(',')));
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
}
