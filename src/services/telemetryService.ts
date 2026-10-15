import type { InstalledSensorType, IoTDevice, TelemetryReading } from '../types';

/**
 * A measurement channel is what the farmer sees (e.g. "Air humidity"). One installed
 * sensor can produce more than one channel (the combined air temperature/humidity
 * sensor reports both °C and % readings), so channels are resolved from
 * sensorType + unit rather than from sensorType alone.
 */
export type TelemetryChannel =
  | 'soil_moisture'
  | 'soil_temperature'
  | 'air_temperature'
  | 'air_humidity'
  | 'light'
  | 'soil_ph'
  | 'soil_npk'
  | 'battery_voltage'
  | 'standing_water';

export interface ChannelMeta {
  label: string;
  shortLabel: string;
  unit: string;
  precision: number;
  color: string;
  /** Comfortable range used for threshold indicators (general guidance, not crop-specific). */
  guide?: { min?: number; max?: number; note: string };
  domain?: [number, number];
}

export const CHANNEL_META: Record<TelemetryChannel, ChannelMeta> = {
  soil_moisture: { label: 'Soil moisture', shortLabel: 'Moisture', unit: '%', precision: 1, color: '#3f8394', guide: { min: 35, max: 75, note: 'Most field crops prefer 35–75% volumetric moisture; crop-specific targets are applied in Irrigation guidance.' }, domain: [0, 100] },
  soil_temperature: { label: 'Soil temperature', shortLabel: 'Soil temp', unit: '°C', precision: 1, color: '#a98550', guide: { min: 10, max: 35, note: 'Germination and root activity slow outside roughly 10–35 °C.' } },
  air_temperature: { label: 'Air temperature', shortLabel: 'Air temp', unit: '°C', precision: 1, color: '#c78a2f', guide: { max: 38, note: 'Sustained canopy temperatures above 38 °C indicate heat-stress risk.' } },
  air_humidity: { label: 'Air humidity', shortLabel: 'Humidity', unit: '%', precision: 0, color: '#5aa4c4', guide: { max: 85, note: 'Humidity above 85% for long periods raises fungal disease pressure.' }, domain: [0, 100] },
  light: { label: 'Light intensity', shortLabel: 'Light', unit: 'lux', precision: 0, color: '#dda33b' },
  soil_ph: { label: 'Soil pH', shortLabel: 'pH', unit: 'pH', precision: 2, color: '#72a94b', guide: { min: 6, max: 7.5, note: 'Nutrient availability is best between pH 6.0 and 7.5 for most crops.' }, domain: [0, 14] },
  soil_npk: { label: 'Soil NPK (generic)', shortLabel: 'NPK', unit: 'mg/kg', precision: 0, color: '#8d6c40' },
  battery_voltage: { label: 'Node battery', shortLabel: 'Battery', unit: 'V', precision: 2, color: '#8a978c', guide: { min: 3.5, note: 'Lithium packs below about 3.5 V need charging or replacement.' } },
  standing_water: { label: 'Standing water', shortLabel: 'Standing water', unit: '', precision: 0, color: '#2d5f73' },
};

export const CHANNEL_ORDER: TelemetryChannel[] = [
  'soil_moisture',
  'soil_temperature',
  'air_temperature',
  'air_humidity',
  'soil_ph',
  'light',
  'soil_npk',
  'standing_water',
  'battery_voltage',
];

/** Channels an installed sensor can report. */
export function channelsForSensor(sensor: InstalledSensorType): TelemetryChannel[] {
  switch (sensor) {
    case 'air_temperature_humidity':
      return ['air_temperature', 'air_humidity'];
    case 'soil_moisture':
    case 'soil_temperature':
    case 'light':
    case 'soil_ph':
    case 'soil_npk':
    case 'battery_voltage':
    case 'standing_water':
      return [sensor];
    default:
      return [];
  }
}

export function channelForReading(reading: Pick<TelemetryReading, 'sensorType' | 'unit'>): TelemetryChannel | null {
  if (reading.sensorType === 'air_temperature_humidity') {
    return reading.unit === '%' || reading.unit.toLowerCase() === 'percent' ? 'air_humidity' : 'air_temperature';
  }
  const channels = channelsForSensor(reading.sensorType);
  return channels[0] ?? null;
}

export function formatChannelValue(channel: TelemetryChannel, value: number): string {
  const meta = CHANNEL_META[channel];
  if (channel === 'standing_water') return value >= 1 ? 'Detected' : 'None';
  const fixed = value.toFixed(meta.precision);
  return meta.unit ? `${fixed}${meta.unit === '%' || meta.unit === '°C' ? '' : ' '}${meta.unit}` : fixed;
}

export type ThresholdState = 'ok' | 'low' | 'high' | 'none';

export function evaluateThreshold(channel: TelemetryChannel, value: number): ThresholdState {
  const guide = CHANNEL_META[channel].guide;
  if (!guide) return 'none';
  if (guide.min !== undefined && value < guide.min) return 'low';
  if (guide.max !== undefined && value > guide.max) return 'high';
  return 'ok';
}

/* ---------- Time ranges ---------- */

export type TimeRange = 'live' | '24h' | '7d' | '30d';

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; ms: number }[] = [
  { value: 'live', label: 'Live (2 h)', ms: 2 * 3_600_000 },
  { value: '24h', label: '24 hours', ms: 24 * 3_600_000 },
  { value: '7d', label: '7 days', ms: 7 * 86_400_000 },
  { value: '30d', label: '30 days', ms: 30 * 86_400_000 },
];

export function rangeStart(range: TimeRange, now: number = Date.now()): number {
  const option = TIME_RANGE_OPTIONS.find((item) => item.value === range) || TIME_RANGE_OPTIONS[1];
  return now - option.ms;
}

export function filterByRange<T extends { measuredAt: string }>(readings: T[], range: TimeRange, now: number = Date.now()): T[] {
  const start = rangeStart(range, now);
  return readings.filter((reading) => {
    const t = new Date(reading.measuredAt).getTime();
    return Number.isFinite(t) && t >= start && t <= now + 5 * 60_000;
  });
}

/* ---------- Aggregation ---------- */

export interface ChannelSnapshot {
  channel: TelemetryChannel;
  deviceId: string;
  latest: TelemetryReading;
  previous?: TelemetryReading;
  count: number;
  min: number;
  max: number;
  trend: 'rising' | 'falling' | 'steady' | 'unknown';
  isStale: boolean;
  threshold: ThresholdState;
}

function sortByMeasuredAt<T extends { measuredAt: string }>(readings: T[]): T[] {
  return [...readings].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
}

/** Readings are stale when older than three sampling intervals (default interval 30 minutes). */
export function isReadingStale(measuredAt: string, samplingIntervalMinutes = 30, now: number = Date.now()): boolean {
  const age = now - new Date(measuredAt).getTime();
  return age > Math.max(samplingIntervalMinutes, 5) * 3 * 60_000;
}

export function summarizeByChannel(readings: TelemetryReading[], device?: Pick<IoTDevice, 'samplingIntervalMinutes'>, now: number = Date.now()): ChannelSnapshot[] {
  const byChannel = new Map<TelemetryChannel, TelemetryReading[]>();
  for (const reading of readings) {
    if (reading.quality === 'invalid') continue;
    const channel = channelForReading(reading);
    if (!channel) continue;
    const list = byChannel.get(channel) || [];
    list.push(reading);
    byChannel.set(channel, list);
  }
  const snapshots: ChannelSnapshot[] = [];
  for (const [channel, list] of byChannel) {
    const sorted = sortByMeasuredAt(list);
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
    const values = sorted.map((item) => item.value);
    let trend: ChannelSnapshot['trend'] = 'unknown';
    if (previous) {
      const delta = latest.value - previous.value;
      const tolerance = Math.max(Math.abs(previous.value) * 0.02, 0.05);
      trend = delta > tolerance ? 'rising' : delta < -tolerance ? 'falling' : 'steady';
    }
    snapshots.push({
      channel,
      deviceId: latest.deviceId,
      latest,
      previous,
      count: sorted.length,
      min: Math.min(...values),
      max: Math.max(...values),
      trend,
      isStale: isReadingStale(latest.measuredAt, device?.samplingIntervalMinutes, now),
      threshold: evaluateThreshold(channel, latest.value),
    });
  }
  return snapshots.sort((a, b) => CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel));
}

export interface SeriesPoint {
  t: number;
  value: number;
}

/**
 * Builds a chart series for one channel. Long ranges are bucketed (mean per bucket)
 * so charts stay responsive with thousands of readings.
 */
export function buildSeries(readings: TelemetryReading[], channel: TelemetryChannel, range: TimeRange, now: number = Date.now()): SeriesPoint[] {
  const points = sortByMeasuredAt(
    filterByRange(readings, range, now).filter((reading) => reading.quality !== 'invalid' && channelForReading(reading) === channel)
  ).map((reading) => ({ t: new Date(reading.measuredAt).getTime(), value: reading.value }));
  if (points.length <= 240) return points;
  const bucketMs = range === '30d' ? 3 * 3_600_000 : range === '7d' ? 3_600_000 : 10 * 60_000;
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const point of points) {
    const key = Math.floor(point.t / bucketMs) * bucketMs;
    const bucket = buckets.get(key) || { sum: 0, count: 0 };
    bucket.sum += point.value;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, bucket]) => ({ t, value: Number((bucket.sum / bucket.count).toFixed(3)) }));
}

export function formatSeriesTick(t: number, range: TimeRange): string {
  const date = new Date(t);
  if (range === 'live' || range === '24h') return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ---------- Anomaly heuristics ---------- */

export interface TelemetryAnomaly {
  channel: TelemetryChannel;
  deviceId: string;
  kind: 'sudden_drop' | 'sudden_rise' | 'flatline' | 'low_battery' | 'stale';
  description: string;
  at: string;
}

/** Conservative, explainable anomaly checks on recent readings for one device. */
export function detectAnomalies(readings: TelemetryReading[], device: Pick<IoTDevice, 'id' | 'samplingIntervalMinutes' | 'status'>, now: number = Date.now()): TelemetryAnomaly[] {
  const anomalies: TelemetryAnomaly[] = [];
  const snapshots = summarizeByChannel(readings, device, now);
  for (const snapshot of snapshots) {
    const { channel, latest } = snapshot;
    if (snapshot.isStale && (device.status === 'online' || device.status === 'offline')) {
      anomalies.push({ channel, deviceId: device.id, kind: 'stale', at: latest.measuredAt, description: `${CHANNEL_META[channel].label} has not updated since ${new Date(latest.measuredAt).toLocaleString('en-IN')}.` });
    }
    if (channel === 'battery_voltage' && latest.value < 3.5) {
      anomalies.push({ channel, deviceId: device.id, kind: 'low_battery', at: latest.measuredAt, description: `Node battery is ${latest.value.toFixed(2)} V, below the 3.5 V service threshold.` });
    }
    if (channel === 'soil_moisture') {
      const recent = sortByMeasuredAt(filterByRange(readings, '24h', now).filter((item) => channelForReading(item) === 'soil_moisture'));
      const sixHoursAgo = now - 6 * 3_600_000;
      const earlier = recent.find((item) => new Date(item.measuredAt).getTime() >= sixHoursAgo);
      if (earlier && earlier !== latest) {
        const delta = latest.value - earlier.value;
        if (delta <= -15) anomalies.push({ channel, deviceId: device.id, kind: 'sudden_drop', at: latest.measuredAt, description: `Soil moisture fell ${Math.abs(delta).toFixed(1)} points within six hours. Check for a failed irrigation set, a broken line, or a disturbed probe.` });
        if (delta >= 25) anomalies.push({ channel, deviceId: device.id, kind: 'sudden_rise', at: latest.measuredAt, description: `Soil moisture rose ${delta.toFixed(1)} points within six hours — consistent with irrigation or heavy rain; confirm no waterlogging.` });
      }
      if (recent.length >= 12 && recent.every((item) => Math.abs(item.value - recent[0].value) < 0.05)) {
        anomalies.push({ channel, deviceId: device.id, kind: 'flatline', at: latest.measuredAt, description: 'Soil moisture has reported an identical value for 12 consecutive samples, which can indicate a disconnected probe.' });
      }
    }
  }
  return anomalies;
}
