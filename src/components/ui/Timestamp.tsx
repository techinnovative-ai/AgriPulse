import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from './Badge';

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'unknown time';
  const diffMs = now - then;
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  let label: string;
  if (abs < 45_000) label = 'just now';
  else if (minutes < 60) label = `${minutes} min`;
  else if (hours < 24) label = `${hours} h`;
  else if (days < 30) label = `${days} d`;
  else label = `${Math.round(days / 30)} mo`;
  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
}

export function formatAbsoluteTime(iso: string, withTime = true): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  });
}

interface TimestampProps {
  iso?: string | null;
  prefix?: string;
  /** Minutes after which the value is flagged as stale (omit to disable). */
  staleAfterMinutes?: number;
  withTime?: boolean;
  fallback?: string;
  className?: string;
}

/** Absolute + relative time with an explicit stale indicator. */
export const Timestamp: React.FC<TimestampProps> = ({ iso, prefix, staleAfterMinutes, withTime = true, fallback = 'No timestamp yet', className }) => {
  if (!iso) {
    return (
      <span className={`ap-timestamp ${className || ''}`.trim()}>
        <Clock size={12} aria-hidden="true" />
        <span>{fallback}</span>
      </span>
    );
  }
  const ageMinutes = (Date.now() - new Date(iso).getTime()) / 60_000;
  const stale = staleAfterMinutes !== undefined && ageMinutes > staleAfterMinutes;
  return (
    <span className={`ap-timestamp ${className || ''}`.trim()}>
      <Clock size={12} aria-hidden="true" />
      {prefix && <span>{prefix}</span>}
      <time dateTime={iso}>{formatAbsoluteTime(iso, withTime)}</time>
      <span className="ap-timestamp__relative">({formatRelativeTime(iso)})</span>
      {stale && (
        <Badge tone="warning" size="sm">
          Stale
        </Badge>
      )}
    </span>
  );
};
