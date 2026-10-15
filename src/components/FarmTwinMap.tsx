import React, { useMemo } from 'react';
import type { FarmPlot, IoTDevice, CropRecord } from '../types';
import type { CropStressAssessment, IrrigationGuidance } from '../services/insightsService';

export type TwinOverlay = 'stress' | 'moisture' | 'crop' | 'devices';

export interface TwinZone {
  plot: FarmPlot;
  crop?: CropRecord;
  stress?: CropStressAssessment;
  irrigation?: IrrigationGuidance;
  devices: IoTDevice[];
  alertCount: number;
}

interface FarmTwinMapProps {
  zones: TwinZone[];
  unassignedDevices: IoTDevice[];
  overlay: TwinOverlay;
  selectedPlotId: string | null;
  onSelect: (plotId: string | null) => void;
  farmName: string;
}

interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const W = 100;
const H = 62;
const GAP = 1.6;
const PAD = 2.2;

export const STRESS_FILL: Record<string, string> = {
  low: '#b9d98f',
  moderate: '#f1cf7a',
  high: '#e79b93',
  none: '#dde4d8',
};
export const MOISTURE_FILL: Record<string, string> = {
  irrigate_now: '#f0b27a',
  irrigate_soon: '#f6d79a',
  adequate: '#a7cde0',
  hold_rain: '#9fc0d8',
  too_wet: '#6fa4c3',
  no_data: '#dde4d8',
};
export const CROP_PALETTE = ['#b9d98f', '#cfe3a4', '#e8d9a1', '#d6e6c2', '#c9dfbe', '#e3d3b3', '#d0e2d0', '#f1e2b8'];
const DEVICE_COLOR: Record<string, string> = {
  online: '#387333',
  offline: '#8a978c',
  attention_required: '#c84e48',
  pending_pairing: '#c78a2f',
  pending_gateway_assignment: '#c78a2f',
  draft: '#8a978c',
  retired: '#b6bfb6',
};

/** Deterministic 0–1 value from a string, used to place markers consistently between renders. */
function hashFraction(input: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Proportional strip layout: rows of zones whose heights follow area share and widths follow area within the row. */
export function layoutZones(zones: TwinZone[]): Map<string, LayoutRect> {
  const result = new Map<string, LayoutRect>();
  if (zones.length === 0) return result;
  const sorted = [...zones].sort((a, b) => (b.plot.area || 0) - (a.plot.area || 0));
  const total = sorted.reduce((sum, zone) => sum + Math.max(zone.plot.area || 0, 0.1), 0);
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(sorted.length))));
  const rows: TwinZone[][] = [];
  for (let i = 0; i < sorted.length; i += columns) rows.push(sorted.slice(i, i + columns));

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const totalGapY = GAP * (rows.length - 1);
  let y = PAD;
  rows.forEach((row) => {
    const rowArea = row.reduce((sum, zone) => sum + Math.max(zone.plot.area || 0, 0.1), 0);
    const rowH = Math.max(8, ((innerH - totalGapY) * rowArea) / total);
    const totalGapX = GAP * (row.length - 1);
    let x = PAD;
    row.forEach((zone) => {
      const area = Math.max(zone.plot.area || 0, 0.1);
      const w = ((innerW - totalGapX) * area) / rowArea;
      result.set(zone.plot.id, { x, y, w, h: rowH });
      x += w + GAP;
    });
    y += rowH + GAP;
  });

  // Normalise if minimum heights pushed the layout past the canvas.
  const overflow = y - GAP + PAD - H;
  if (overflow > 0) {
    const scale = (H - PAD * 2) / (y - GAP - PAD);
    result.forEach((rect, key) => {
      result.set(key, { ...rect, y: PAD + (rect.y - PAD) * scale, h: rect.h * scale });
    });
  }
  return result;
}

export function zoneFill(zone: TwinZone, overlay: TwinOverlay, cropIndex: number): string {
  if (overlay === 'stress') return STRESS_FILL[zone.stress?.level || 'none'];
  if (overlay === 'moisture') return MOISTURE_FILL[zone.irrigation?.status || 'no_data'];
  if (overlay === 'crop') return zone.crop ? CROP_PALETTE[cropIndex % CROP_PALETTE.length] : '#dde4d8';
  return '#e4ebe0';
}

export const FarmTwinMap: React.FC<FarmTwinMapProps> = ({ zones, unassignedDevices, overlay, selectedPlotId, onSelect, farmName }) => {
  const layout = useMemo(() => layoutZones(zones), [zones]);
  const cropIndex = useMemo(() => {
    const names = Array.from(new Set(zones.map((zone) => zone.crop?.cropName).filter(Boolean))) as string[];
    return new Map(names.map((name, index) => [name, index]));
  }, [zones]);

  const describe = (zone: TwinZone) => {
    const parts = [`${zone.plot.name}, ${zone.plot.area} ${zone.plot.areaUnit}`];
    if (zone.crop) parts.push(`${zone.crop.cropName} at ${zone.crop.growthStage} stage`);
    if (overlay === 'stress') parts.push(zone.stress ? `stress ${zone.stress.level}, score ${zone.stress.score}` : 'no stress assessment');
    if (overlay === 'moisture') parts.push(zone.irrigation ? zone.irrigation.headline : 'no irrigation guidance');
    parts.push(`${zone.devices.length} device${zone.devices.length === 1 ? '' : 's'}`);
    if (zone.alertCount) parts.push(`${zone.alertCount} open alert${zone.alertCount === 1 ? '' : 's'}`);
    return parts.join('. ');
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H + (unassignedDevices.length ? 9 : 0)}`}
      role="group"
      aria-label={`Schematic zone map of ${farmName}`}
      className="ap-twin-map"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <title>Schematic zone map of {farmName}</title>
      <desc>Zones are sized in proportion to recorded area. Positions are illustrative, not GPS coordinates.</desc>
      <defs>
        <pattern id="twin-soil" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
          <circle cx="0.6" cy="0.6" r="0.22" fill="#a7b4a3" />
        </pattern>
      </defs>
      <rect x="0.4" y="0.4" width={W - 0.8} height={H - 0.8} rx="2.6" fill="#f4f7f0" stroke="#cfdac8" strokeWidth="0.5" />
      <rect x="0.4" y="0.4" width={W - 0.8} height={H - 0.8} rx="2.6" fill="url(#twin-soil)" opacity="0.5" />

      {zones.map((zone) => {
        const rect = layout.get(zone.plot.id);
        if (!rect) return null;
        const selected = selectedPlotId === zone.plot.id;
        const fill = zoneFill(zone, overlay, cropIndex.get(zone.crop?.cropName || '') || 0);
        const labelSize = Math.max(2.1, Math.min(3.1, rect.w / 9));
        const showMeta = rect.h > 11 && rect.w > 18;
        return (
          <g
            key={zone.plot.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={describe(zone)}
            className="ap-twin-zone"
            onClick={() => onSelect(selected ? null : zone.plot.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(selected ? null : zone.plot.id);
              }
            }}
          >
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="1.4" fill={fill} stroke={selected ? '#1f4a25' : '#ffffff'} strokeWidth={selected ? 0.9 : 0.6} />
            {selected && <rect x={rect.x + 0.7} y={rect.y + 0.7} width={rect.w - 1.4} height={rect.h - 1.4} rx="1" fill="none" stroke="#ffffff" strokeWidth="0.45" strokeDasharray="1 0.8" />}
            <text x={rect.x + 1.6} y={rect.y + 1.6 + labelSize} fontSize={labelSize} fontWeight={800} fill="#1b2e1f">
              {zone.plot.name.length > Math.floor(rect.w / (labelSize * 0.58)) ? `${zone.plot.name.slice(0, Math.max(3, Math.floor(rect.w / (labelSize * 0.58)) - 1))}…` : zone.plot.name}
            </text>
            {showMeta && (
              <text x={rect.x + 1.6} y={rect.y + 1.6 + labelSize * 2.35} fontSize={labelSize * 0.72} fontWeight={600} fill="#3a4b3d">
                {zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : 'No crop recorded'}
              </text>
            )}
            {showMeta && (
              <text x={rect.x + 1.6} y={rect.y + rect.h - 1.8} fontSize={labelSize * 0.68} fontWeight={600} fill="#4d5d4f">
                {zone.plot.area} {zone.plot.areaUnit} · {zone.plot.irrigationMethod}
              </text>
            )}
            {zone.alertCount > 0 && (
              <g aria-hidden="true">
                <circle cx={rect.x + rect.w - 2.6} cy={rect.y + 2.6} r="1.9" fill="#c84e48" stroke="#fff" strokeWidth="0.4" />
                <text x={rect.x + rect.w - 2.6} y={rect.y + 3.35} fontSize="2.1" fontWeight={800} fill="#fff" textAnchor="middle">{zone.alertCount > 9 ? '9+' : zone.alertCount}</text>
              </g>
            )}
            {zone.devices.map((device, index) => {
              const fx = 0.2 + hashFraction(device.id, 1) * 0.6;
              const fy = 0.45 + hashFraction(device.id, 2) * 0.35;
              const cx = rect.x + rect.w * fx;
              const cy = rect.y + rect.h * fy;
              const color = DEVICE_COLOR[device.status] || '#8a978c';
              const pulse = overlay === 'devices' && device.status === 'online';
              return (
                <g key={device.id} aria-hidden="true" transform={`translate(${cx} ${cy})`}>
                  {pulse && <circle r="2.8" fill={color} opacity="0.18" />}
                  {device.type === 'lora_gateway' ? (
                    <path d="M-1.4 1.6 L0 -1.8 L1.4 1.6 Z M-1 0.9 H1" fill="#fff" stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
                  ) : (
                    <>
                      <circle r="1.55" fill="#fff" stroke={color} strokeWidth="0.55" />
                      <circle r="0.6" fill={color} />
                    </>
                  )}
                  {overlay === 'devices' && index < 3 && (
                    <text y="3.6" fontSize="1.7" fontWeight={700} fill="#2b3b2e" textAnchor="middle">{device.name.length > 14 ? `${device.name.slice(0, 13)}…` : device.name}</text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {unassignedDevices.length > 0 && (
        <g aria-hidden="true">
          <rect x={PAD} y={H + 1.2} width={W - PAD * 2} height="6.4" rx="1.2" fill="#eef2ea" stroke="#d6dfd1" strokeWidth="0.4" strokeDasharray="1 0.8" />
          <text x={PAD + 1.6} y={H + 4} fontSize="2.1" fontWeight={700} fill="#4d5d4f">Devices not assigned to a zone</text>
          {unassignedDevices.slice(0, 10).map((device, index) => {
            const color = DEVICE_COLOR[device.status] || '#8a978c';
            const cx = W - PAD - 3 - index * 4.6;
            return (
              <g key={device.id} transform={`translate(${cx} ${H + 4.4})`}>
                {device.type === 'lora_gateway' ? (
                  <path d="M-1.4 1.6 L0 -1.8 L1.4 1.6 Z M-1 0.9 H1" fill="#fff" stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
                ) : (
                  <>
                    <circle r="1.55" fill="#fff" stroke={color} strokeWidth="0.55" />
                    <circle r="0.6" fill={color} />
                  </>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
};
