import React from 'react';
import { DataSource, SourceTag } from './Badge';

export type MetricTone = 'forest' | 'leaf' | 'water' | 'amber' | 'sun' | 'store' | 'neutral';

const TONE_CLASS: Record<MetricTone, string> = {
  forest: '',
  leaf: 'metric-icon--leaf',
  water: 'metric-icon--water',
  amber: 'metric-icon--amber',
  sun: 'metric-icon--sun',
  store: 'metric-icon--store',
  neutral: 'metric-icon--neutral',
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  note?: React.ReactNode;
  tone?: MetricTone;
  source?: DataSource;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Compact KPI tile. Reuses the Farmer Portal's `.metric-card` styles so dashboard,
 * monitoring and report metrics look identical everywhere.
 */
export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, unit, note, tone = 'forest', source, onClick, ariaLabel, className }) => {
  const content = (
    <>
      <div className="metric-card-heading">
        <span className={`metric-icon ${TONE_CLASS[tone]}`.trim()}>{icon}</span>
        <span className="truncate">{label}</span>
        {source && (
          <span className="ml-auto">
            <SourceTag source={source} />
          </span>
        )}
      </div>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </div>
      {note !== undefined && <p>{note}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={`metric-card metric-card--button text-left ${className || ''}`.trim()}>
        {content}
      </button>
    );
  }
  return <article className={`metric-card ${className || ''}`.trim()}>{content}</article>;
};
