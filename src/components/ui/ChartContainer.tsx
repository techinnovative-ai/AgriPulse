import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DataSource, SourceTag } from './Badge';
import { EmptyState } from './States';

interface ChartContainerProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  unit?: string;
  source?: DataSource;
  actions?: React.ReactNode;
  legend?: React.ReactNode;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  /** Plain-language summary of the chart for screen readers and reduced-motion users. */
  summary?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/** Uniform chart frame: title, unit, provenance, legend, empty fallback and a text summary. */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  unit,
  source,
  actions,
  legend,
  isEmpty,
  emptyTitle = 'No data to chart yet',
  emptyDescription,
  summary,
  size = 'md',
  children,
  className,
}) => (
  <figure className={`ap-panel ${className || ''}`.trim()}>
    <figcaption className="ap-panel__header">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="ap-panel__title">{title}</h3>
          {unit && <span className="text-[11px] font-semibold text-slate-500">({unit})</span>}
          {source && <SourceTag source={source} />}
        </div>
        {subtitle && <p className="ap-panel__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </figcaption>
    <div className="ap-panel__body">
      {isEmpty ? (
        <EmptyState compact icon={<BarChart3 size={20} />} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className={`ap-chart ${size === 'sm' ? 'ap-chart--sm' : size === 'lg' ? 'ap-chart--lg' : ''}`.trim()} role="img" aria-label={summary || (typeof title === 'string' ? title : 'Chart')}>
            {children}
          </div>
          {legend && <div className="mt-3">{legend}</div>}
          {summary && <p className="sr-only">{summary}</p>}
        </>
      )}
    </div>
  </figure>
);

/** Recharts tooltip renderer consistent with the design system. */
export const ChartTooltip: React.FC<{
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; value?: number | string; color?: string; unit?: string; payload?: Record<string, unknown> }[];
  formatter?: (value: number | string, name?: string) => string;
}> = ({ active, label, payload, formatter }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="ap-chart-tooltip">
      {label !== undefined && <strong>{label}</strong>}
      {payload.map((entry, index) => (
        <span key={`${entry.name}-${index}`}>
          <i style={{ background: entry.color || '#4d8c3f' }} aria-hidden="true" />
          {entry.name}: {formatter ? formatter(entry.value ?? '', entry.name) : `${entry.value ?? '—'}${entry.unit || ''}`}
        </span>
      ))}
    </div>
  );
};

export const CHART_COLORS = {
  forest: '#387333',
  leaf: '#72a94b',
  water: '#3f8394',
  sky: '#5aa4c4',
  amber: '#c78a2f',
  harvest: '#dda33b',
  red: '#c84e48',
  slate: '#8a978c',
  earth: '#a98550',
};

export const CHART_AXIS_PROPS = {
  tick: { fontSize: 10, fill: '#6c7b6c' },
  axisLine: { stroke: '#e2e9de' },
  tickLine: false as const,
};

export const CHART_GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#e8eee4',
  vertical: false,
};
