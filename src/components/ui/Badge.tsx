import React from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleDashed,
  Clock,
  CloudSun,
  Cpu,
  FlaskConical,
  PauseCircle,
  Radio,
  ScrollText,
  Sparkles,
  UserRound,
  WifiOff,
} from 'lucide-react';
import type { DeviceStatus } from '../../types';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'offline' | 'forest' | 'muted';

interface BadgeProps {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  dot?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', size = 'md', icon, dot, title, className, children }) => (
  <span
    className={['ap-badge', `ap-badge--${tone}`, size === 'sm' ? 'ap-badge--sm' : '', dot ? 'ap-badge--dot' : '', className || ''].filter(Boolean).join(' ')}
    title={title}
  >
    {icon}
    <span className="truncate">{children}</span>
  </span>
);

/* ---------- Severity ---------- */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export const SEVERITY_META: Record<Severity, { label: string; tone: BadgeTone }> = {
  critical: { label: 'Critical', tone: 'danger' },
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'success' },
  info: { label: 'Info', tone: 'info' },
};

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({ severity, size }) => {
  const meta = SEVERITY_META[severity];
  return (
    <Badge tone={meta.tone} size={size} icon={severity === 'info' ? <Activity /> : <AlertTriangle />}>
      {meta.label}
    </Badge>
  );
};

/* ---------- Device status ---------- */

const DEVICE_STATUS_BADGE: Record<DeviceStatus, { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  draft: { label: 'Draft', tone: 'neutral', icon: <CircleDashed /> },
  pending_pairing: { label: 'Pending pairing', tone: 'warning', icon: <Clock /> },
  pending_gateway_assignment: { label: 'Needs gateway', tone: 'warning', icon: <Radio /> },
  online: { label: 'Online', tone: 'success', icon: <CheckCircle2 /> },
  offline: { label: 'Offline', tone: 'offline', icon: <WifiOff /> },
  attention_required: { label: 'Attention required', tone: 'danger', icon: <AlertTriangle /> },
  retired: { label: 'Retired', tone: 'muted', icon: <Archive /> },
};

export const DeviceStatusPill: React.FC<{ status: DeviceStatus; size?: 'sm' | 'md' }> = ({ status, size }) => {
  const meta = DEVICE_STATUS_BADGE[status];
  return (
    <Badge tone={meta.tone} size={size} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
};

/* ---------- Data provenance ---------- */

/**
 * Every number shown to a farmer carries one of these labels so measured values,
 * farmer records, provider forecasts, demo samples and estimates are never confused.
 */
export type DataSource =
  | 'physical_sensor'
  | 'manual_observation'
  | 'weather_api'
  | 'weather_demo'
  | 'demo'
  | 'rule_based'
  | 'model_prediction'
  | 'planned'
  | 'unavailable'
  | 'saved_record';

export const DATA_SOURCE_META: Record<DataSource, { label: string; tone: BadgeTone; icon: React.ReactNode; description: string }> = {
  physical_sensor: { label: 'Sensor reading', tone: 'success', icon: <Cpu />, description: 'Measured by a paired AGRIPULSE sensor node and validated by the API.' },
  manual_observation: { label: 'Farmer recorded', tone: 'warning', icon: <UserRound />, description: 'Entered manually from a field visit or handheld probe.' },
  weather_api: { label: 'Weather provider', tone: 'info', icon: <CloudSun />, description: 'Forecast or estimate from the connected weather service, not a field measurement.' },
  weather_demo: { label: 'Demo forecast', tone: 'info', icon: <CloudSun />, description: 'Illustrative forecast dataset; no live weather provider is configured.' },
  demo: { label: 'Demo sample', tone: 'warning', icon: <FlaskConical />, description: 'Sample record included to demonstrate the interface.' },
  rule_based: { label: 'Rule-based estimate', tone: 'forest', icon: <ScrollText />, description: 'Derived from transparent agronomic thresholds applied to the records shown.' },
  model_prediction: { label: 'Model prediction', tone: 'neutral', icon: <Sparkles />, description: 'Produced by a statistical or machine-learning model with stated confidence.' },
  planned: { label: 'Planned', tone: 'muted', icon: <PauseCircle />, description: 'Not yet available in this release.' },
  unavailable: { label: 'No data', tone: 'muted', icon: <CircleDashed />, description: 'No connected data is available for this item yet.' },
  saved_record: { label: 'Saved record', tone: 'forest', icon: <ScrollText />, description: 'Stored in your farm records.' },
};

export const SourceTag: React.FC<{ source: DataSource; size?: 'sm' | 'md'; label?: string }> = ({ source, size = 'sm', label }) => {
  const meta = DATA_SOURCE_META[source];
  return (
    <Badge tone={meta.tone} size={size} icon={meta.icon} title={meta.description}>
      {label || meta.label}
    </Badge>
  );
};
