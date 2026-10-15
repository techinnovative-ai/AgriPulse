import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, deviceApi } from '../services/apiClient';
import type { IoTDevice, TelemetryReading } from '../types';

export interface DeviceTelemetryState {
  deviceId: string;
  readings: TelemetryReading[];
  error: string | null;
}

export interface FarmTelemetry {
  /** All validated physical readings for the farm's sensor nodes, newest last per device. */
  readings: TelemetryReading[];
  byDevice: Record<string, DeviceTelemetryState>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastCheckedAt: string | null;
  /** True when polling is active because at least one node has reported before. */
  autoRefreshActive: boolean;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 60_000;

/**
 * Loads physical telemetry for every active sensor node on a farm from the API.
 * Polls only when a node has actually reported before (there is nothing to poll for
 * devices that have never paired) and only while the tab is visible.
 */
export function useFarmTelemetry(farmId: string | undefined, devices: IoTDevice[], enabled = true): FarmTelemetry {
  const nodes = useMemo(
    () => devices.filter((device) => device.type === 'sensor_node' && device.status !== 'retired' && (!farmId || device.farmId === farmId)),
    [devices, farmId]
  );
  const nodeKey = nodes.map((node) => `${node.id}:${node.lastSeenAt || ''}`).join('|');
  const [byDevice, setByDevice] = useState<Record<string, DeviceTelemetryState>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const hasLoaded = useRef(false);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const load = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const currentNodes = nodesRef.current;
    if (currentNodes.length === 0) {
      setByDevice({});
      setError(null);
      setLastCheckedAt(new Date().toISOString());
      hasLoaded.current = true;
      return;
    }
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    const run = (async () => {
      const results = await Promise.all(
        currentNodes.map(async (node): Promise<DeviceTelemetryState> => {
          try {
            const response = await deviceApi.telemetry(node.id, 500);
            // The API returns newest first; keep readings in chronological order for charts and "latest" lookups.
            const readings = [...response.readings].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
            return { deviceId: node.id, readings, error: null };
          } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Telemetry could not be loaded.';
            return { deviceId: node.id, readings: [], error: message };
          }
        })
      );
      const next: Record<string, DeviceTelemetryState> = {};
      for (const result of results) next[result.deviceId] = result;
      setByDevice(next);
      const firstError = results.find((result) => result.error)?.error || null;
      setError(firstError);
      setLastCheckedAt(new Date().toISOString());
      hasLoaded.current = true;
      setLoading(false);
      setRefreshing(false);
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    hasLoaded.current = false;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, enabled, load]);

  const autoRefreshActive = enabled && nodes.some((node) => Boolean(node.lastSeenAt));

  useEffect(() => {
    if (!autoRefreshActive) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [autoRefreshActive, load]);

  const readings = useMemo(() => Object.values(byDevice).flatMap((state) => state.readings), [byDevice]);

  return { readings, byDevice, loading, refreshing, error, lastCheckedAt, autoRefreshActive, refresh: load };
}
