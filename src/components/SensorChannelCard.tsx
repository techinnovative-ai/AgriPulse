import React from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import type { IoTDevice } from '../types';
import { CHANNEL_META, formatChannelValue, type ChannelSnapshot, type SeriesPoint } from '../services/telemetryService';
import { Badge, SourceTag, Timestamp } from './ui';

interface SensorChannelCardProps {
  snapshot: ChannelSnapshot;
  device: IoTDevice;
  zoneLabel?: string;
  series: SeriesPoint[];
  onOpen?: () => void;
}

const TREND_ICON = {
  rising: <ArrowUpRight size={13} aria-hidden="true" />,
  falling: <ArrowDownRight size={13} aria-hidden="true" />,
  steady: <ArrowRight size={13} aria-hidden="true" />,
  unknown: <Minus size={13} aria-hidden="true" />,
};

const TREND_LABEL = { rising: 'Rising', falling: 'Falling', steady: 'Steady', unknown: 'No trend yet' };

/** One measured channel from one sensor node: latest value, threshold state, trend and sparkline. */
export const SensorChannelCard: React.FC<SensorChannelCardProps> = ({ snapshot, device, zoneLabel, series, onOpen }) => {
  const meta = CHANNEL_META[snapshot.channel];
  const thresholdBadge =
    snapshot.threshold === 'low' ? <Badge tone="warning" size="sm">Below guide range</Badge>
      : snapshot.threshold === 'high' ? <Badge tone="danger" size="sm">Above guide range</Badge>
        : snapshot.threshold === 'ok' ? <Badge tone="success" size="sm">Within guide range</Badge>
          : null;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500 truncate">{meta.label}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">
            {device.name}
            {zoneLabel ? ` · ${zoneLabel}` : ''}
          </p>
        </div>
        <SourceTag source="physical_sensor" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[26px] font-extrabold leading-none tracking-tight text-forest-950">{formatChannelValue(snapshot.channel, snapshot.latest.value)}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            {TREND_ICON[snapshot.trend]}
            {TREND_LABEL[snapshot.trend]}
            {snapshot.previous && snapshot.channel !== 'standing_water' && (
              <span className="font-normal text-slate-500">
                · prev {formatChannelValue(snapshot.channel, snapshot.previous.value)}
              </span>
            )}
          </p>
        </div>
        {series.length > 1 && (
          <div className="h-12 w-28 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${device.id}-${snapshot.channel}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['auto', 'auto']} />
                <Area type="monotone" dataKey="value" stroke={meta.color} strokeWidth={1.6} fill={`url(#spark-${device.id}-${snapshot.channel})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {thresholdBadge}
        {snapshot.isStale && <Badge tone="warning" size="sm">Stale</Badge>}
        <span className="text-[10.5px] text-slate-500">
          {snapshot.count} reading{snapshot.count === 1 ? '' : 's'} · range {formatChannelValue(snapshot.channel, snapshot.min)} – {formatChannelValue(snapshot.channel, snapshot.max)}
        </span>
      </div>
      <div className="mt-2">
        <Timestamp iso={snapshot.latest.measuredAt} prefix="Measured" />
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className="ap-panel ap-panel--interactive w-full p-4 text-left" aria-label={`${meta.label} from ${device.name}: ${formatChannelValue(snapshot.channel, snapshot.latest.value)}. View device details.`}>
        {content}
      </button>
    );
  }
  return <article className="ap-panel p-4">{content}</article>;
};
