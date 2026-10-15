import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  ClipboardList,
  Cpu,
  Radio,
  RefreshCw,
  Router,
  Satellite,
  Wifi,
} from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import type { FieldObservation, IoTDevice, TelemetryReading } from '../types';
import {
  CHANNEL_META,
  CHANNEL_ORDER,
  buildSeries,
  channelsForSensor,
  filterByRange,
  formatChannelValue,
  formatSeriesTick,
  summarizeByChannel,
  TIME_RANGE_OPTIONS,
  type TelemetryChannel,
  type TimeRange,
} from '../services/telemetryService';
import { SensorChannelCard } from '../components/SensorChannelCard';
import {
  Badge,
  Button,
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  ChartContainer,
  ChartTooltip,
  DataTable,
  DeviceStatusPill,
  EmptyState,
  ErrorState,
  Legend,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SkeletonCard,
  SourceTag,
  Tabs,
  Timestamp,
  type DataTableColumn,
} from '../components/ui';
import { formatRelativeTime } from '../components/ui';

const SERIES_PALETTE = [CHART_COLORS.forest, CHART_COLORS.water, CHART_COLORS.amber, CHART_COLORS.earth, CHART_COLORS.sky, CHART_COLORS.red];

type ViewMode = 'sensors' | 'observations';

export const MonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeFarm, plots, devices, devicesLoading, deviceApiError, refreshDevices, observations } = useAgriPulse();
  const { telemetry } = useFarmIntelligence();

  const [range, setRange] = useState<TimeRange>('24h');
  const [view, setView] = useState<ViewMode>('sensors');
  const [trendChannel, setTrendChannel] = useState<TelemetryChannel | null>(null);

  const farmId = activeFarm?.id;
  const farmPlots = useMemo(() => plots.filter((plot) => plot.farmId === farmId), [plots, farmId]);
  const plotName = (plotId?: string) => farmPlots.find((plot) => plot.id === plotId)?.name;

  const farmDevices = useMemo(() => devices.filter((device) => device.farmId === farmId && device.status !== 'retired'), [devices, farmId]);
  const sensorNodes = farmDevices.filter((device) => device.type === 'sensor_node');
  const gateways = farmDevices.filter((device) => device.type === 'lora_gateway');
  const onlineNodes = sensorNodes.filter((device) => device.status === 'online');
  const reportingNodes = sensorNodes.filter((device) => (telemetry.byDevice[device.id]?.readings.length || 0) > 0);

  const now = Date.now();
  const rangedReadings = useMemo(() => filterByRange(telemetry.readings, range, now), [telemetry.readings, range, now]);

  const snapshots = useMemo(
    () =>
      sensorNodes.flatMap((device) => {
        const readings = telemetry.byDevice[device.id]?.readings || [];
        return summarizeByChannel(readings, device, now).map((snapshot) => ({ snapshot, device }));
      }),
    [sensorNodes, telemetry.byDevice, now]
  );

  const latestReading = useMemo(() => {
    let latest: TelemetryReading | null = null;
    for (const reading of telemetry.readings) {
      if (!latest || reading.measuredAt > latest.measuredAt) latest = reading;
    }
    return latest;
  }, [telemetry.readings]);

  const expectedChannels = useMemo(() => {
    const set = new Set<TelemetryChannel>();
    sensorNodes.forEach((device) => (device.installedSensors || []).forEach((sensor) => channelsForSensor(sensor).forEach((channel) => set.add(channel))));
    return CHANNEL_ORDER.filter((channel) => set.has(channel));
  }, [sensorNodes]);

  const reportedChannels = useMemo(() => {
    const set = new Set<TelemetryChannel>(snapshots.map((item) => item.snapshot.channel));
    return CHANNEL_ORDER.filter((channel) => set.has(channel));
  }, [snapshots]);

  const activeTrendChannel = trendChannel && reportedChannels.includes(trendChannel) ? trendChannel : reportedChannels[0] || null;

  const trendData = useMemo(() => {
    if (!activeTrendChannel) return { rows: [] as Record<string, number>[], keys: [] as { key: string; label: string; color: string }[] };
    const keys: { key: string; label: string; color: string }[] = [];
    const rowsByTime = new Map<number, Record<string, number>>();
    sensorNodes.forEach((device, index) => {
      const series = buildSeries(telemetry.byDevice[device.id]?.readings || [], activeTrendChannel, range, now);
      if (series.length === 0) return;
      keys.push({ key: device.id, label: device.name, color: SERIES_PALETTE[index % SERIES_PALETTE.length] });
      series.forEach((point) => {
        const row = rowsByTime.get(point.t) || { t: point.t };
        row[device.id] = point.value;
        rowsByTime.set(point.t, row);
      });
    });
    const rows = Array.from(rowsByTime.values()).sort((a, b) => a.t - b.t);
    return { rows, keys };
  }, [activeTrendChannel, sensorNodes, telemetry.byDevice, range, now]);

  const farmObservations = useMemo(
    () => observations.filter((obs) => obs.farmId === farmId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [observations, farmId]
  );
  const measuredObservations = farmObservations.filter((obs) => typeof obs.soilMoisturePct === 'number' || typeof obs.soilTempC === 'number');
  const observationSeries = useMemo(
    () =>
      [...measuredObservations]
        .reverse()
        .map((obs) => ({
          t: new Date(obs.recordedAt).getTime(),
          moisture: obs.soilMoisturePct,
          soilTemp: obs.soilTempC,
          plot: obs.plotName || '—',
        })),
    [measuredObservations]
  );

  const handleRefresh = async () => {
    await Promise.all([refreshDevices(), telemetry.refresh()]);
  };

  const observationColumns: DataTableColumn<FieldObservation>[] = [
    { key: 'when', header: 'Recorded', render: (row) => <Timestamp iso={row.recordedAt} /> },
    { key: 'plot', header: 'Zone', render: (row) => row.plotName || 'Farm-wide' },
    { key: 'category', header: 'Category', render: (row) => row.category },
    { key: 'moisture', header: 'Soil moisture', numeric: true, render: (row) => (typeof row.soilMoisturePct === 'number' ? `${row.soilMoisturePct}%` : '—') },
    { key: 'temp', header: 'Soil temp', numeric: true, render: (row) => (typeof row.soilTempC === 'number' ? `${row.soilTempC} °C` : '—') },
    { key: 'severity', header: 'Severity', render: (row) => <Badge tone={row.severity === 'Action Needed' ? 'danger' : row.severity === 'Watch' ? 'warning' : 'success'} size="sm">{row.severity}</Badge> },
    { key: 'source', header: 'Source', render: (row) => <SourceTag source={row.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation'} /> },
  ];

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Live monitoring" icon={<Activity size={14} />} title="Live sensor monitoring" />
        <EmptyState icon={<Radio />} title="Select or create a farm first" description="Sensor readings and observations are grouped per farm." actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Live monitoring"
        icon={<Activity size={14} />}
        title="Live sensor monitoring"
        description={`Readings from paired sensor nodes on ${activeFarm.name}, alongside the measurements you record yourself. Values appear only after a node sends authenticated telemetry.`}
        actions={
          <>
            <Button variant="secondary" size="sm" to="/devices" leadingIcon={<Cpu size={14} />}>Manage devices</Button>
            <Button size="sm" onClick={() => void handleRefresh()} loading={telemetry.refreshing || devicesLoading} leadingIcon={<RefreshCw size={14} />}>
              Refresh readings
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Wifi size={12} aria-hidden="true" />
              {telemetry.autoRefreshActive ? 'Auto-refresh every 60 s (at least one node has reported)' : 'Auto-refresh paused — no node has reported yet'}
            </span>
            <span>Last checked {telemetry.lastCheckedAt ? formatRelativeTime(telemetry.lastCheckedAt) : 'not yet'}</span>
            <SourceTag source="physical_sensor" />
            <SourceTag source="manual_observation" />
          </div>
        }
      />

      {deviceApiError && <ErrorState compact message={deviceApiError} onRetry={() => void refreshDevices()} retrying={devicesLoading} />}
      {telemetry.error && <ErrorState compact title="Telemetry could not be loaded" message={telemetry.error} onRetry={() => void telemetry.refresh()} retrying={telemetry.refreshing} />}

      <section aria-label="Monitoring summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <MetricCard icon={<Cpu />} label="Sensor nodes" value={sensorNodes.length} note={`${onlineNodes.length} online · ${reportingNodes.length} have reported`} tone="forest" onClick={() => navigate('/devices')} />
        <MetricCard icon={<Router />} label="Gateways" value={gateways.length} note={gateways.length ? `${gateways.filter((g) => g.status === 'online').length} online` : 'None registered'} tone="neutral" />
        <MetricCard icon={<Radio />} label="Channels reporting" value={`${reportedChannels.length}/${expectedChannels.length || 0}`} note={expectedChannels.length ? 'of installed sensor channels' : 'No sensors installed'} tone="water" />
        <MetricCard icon={<Satellite />} label="Latest reading" value={latestReading ? formatRelativeTime(latestReading.measuredAt) : '—'} note={latestReading ? `${CHANNEL_META[(reportedChannels[0] || 'soil_moisture')].shortLabel} and others` : 'Waiting for first reading'} tone="leaf" source={latestReading ? 'physical_sensor' : 'unavailable'} />
        <MetricCard icon={<ClipboardList />} label="Farmer observations" value={farmObservations.length} note={`${measuredObservations.length} with measurements`} tone="amber" source="manual_observation" onClick={() => setView('observations')} className="col-span-2 md:col-span-1" />
      </section>

      <Tabs
        ariaLabel="Monitoring view"
        value={view}
        onChange={setView}
        tabs={[
          { value: 'sensors', label: 'Sensor telemetry', icon: <Radio size={14} />, count: snapshots.length },
          { value: 'observations', label: 'Farmer-recorded observations', icon: <ClipboardList size={14} />, count: farmObservations.length },
        ]}
      />

      {view === 'sensors' && (
        <div className="space-y-6">
          {sensorNodes.length === 0 ? (
            <EmptyState
              icon={<Cpu />}
              title="No sensor nodes registered for this farm"
              description="Register a sensor node, complete secure pairing on the device, and readings will appear here automatically. Nothing is simulated."
              actions={<Button to="/devices" leadingIcon={<Cpu size={14} />}>Register a device</Button>}
            />
          ) : reportingNodes.length === 0 ? (
            <Notice tone="info" title="Waiting for readings" role="status">
              {sensorNodes.length} sensor node{sensorNodes.length === 1 ? ' is' : 's are'} registered but none has sent telemetry yet
              {sensorNodes.some((d) => d.status === 'pending_pairing') ? ' — pairing is still pending on the device' : ''}.
              AgriPulse never fills this screen with sample values; the first authenticated reading will appear within one sampling interval of pairing.
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" to="/devices">Review device status</Button>
                <Button variant="ghost" size="sm" onClick={() => void handleRefresh()}>Check again</Button>
              </div>
            </Notice>
          ) : null}

          {telemetry.loading && snapshots.length === 0 && reportingNodes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : null}

          {snapshots.length > 0 && (
            <Panel title="Latest values per channel" subtitle="One card per measured channel and node. Guide ranges are general agronomic bands, not crop-specific thresholds." as="section">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {snapshots.map(({ snapshot, device }) => (
                  <SensorChannelCard
                    key={`${device.id}-${snapshot.channel}`}
                    snapshot={snapshot}
                    device={device}
                    zoneLabel={plotName(device.plotId) || device.locationLabel}
                    series={buildSeries(telemetry.byDevice[device.id]?.readings || [], snapshot.channel, range, now)}
                    onOpen={() => navigate(`/devices/${device.id}`)}
                  />
                ))}
              </div>
            </Panel>
          )}

          <ChartContainer
            title="Channel history"
            subtitle={activeTrendChannel ? `${CHANNEL_META[activeTrendChannel].label} per sensor node` : 'Select a channel once readings arrive'}
            unit={activeTrendChannel ? CHANNEL_META[activeTrendChannel].unit : undefined}
            source="physical_sensor"
            isEmpty={trendData.rows.length === 0}
            emptyTitle={reportedChannels.length === 0 ? 'No telemetry history yet' : `No ${activeTrendChannel ? CHANNEL_META[activeTrendChannel].shortLabel.toLowerCase() : ''} readings in this period`}
            emptyDescription={reportedChannels.length === 0 ? 'History charts switch on as soon as a paired node reports. Gaps in the line indicate missing readings, never zero.' : 'Try a longer period. Missing points are shown as gaps, never as zero.'}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {reportedChannels.length > 1 && (
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                    Channel
                    <select className="ap-select" style={{ minHeight: 32, padding: '4px 28px 4px 10px', fontSize: 12 }} value={activeTrendChannel || ''} onChange={(event) => setTrendChannel(event.target.value as TelemetryChannel)}>
                      {reportedChannels.map((channel) => (
                        <option key={channel} value={channel}>{CHANNEL_META[channel].label}</option>
                      ))}
                    </select>
                  </label>
                )}
                <SegmentedControl ariaLabel="Time range" value={range} onChange={setRange} options={TIME_RANGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
              </div>
            }
            legend={trendData.keys.length > 0 ? <Legend items={trendData.keys.map((key) => ({ label: key.label, color: key.color, shape: 'line' }))} /> : undefined}
            summary={trendData.rows.length > 0 ? `${trendData.rows.length} time points across ${trendData.keys.length} node(s). Readings in range: ${rangedReadings.length}.` : undefined}
            size="md"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t: number) => formatSeriesTick(t, range)} {...CHART_AXIS_PROPS} />
                <YAxis {...CHART_AXIS_PROPS} domain={activeTrendChannel ? CHANNEL_META[activeTrendChannel].domain || ['auto', 'auto'] : ['auto', 'auto']} width={44} />
                <Tooltip content={<ChartTooltip formatter={(value) => (activeTrendChannel && typeof value === 'number' ? formatChannelValue(activeTrendChannel, value) : String(value))} />} labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-IN')} />
                {trendData.keys.map((key) => (
                  <Line key={key.key} type="monotone" dataKey={key.key} name={key.label} stroke={key.color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <Panel title="Sensor nodes on this farm" subtitle="Connection status is derived by the server from authenticated heartbeats and telemetry." as="section" flush>
            <DataTable<IoTDevice>
              caption="Sensor nodes and gateways for the active farm"
              rows={farmDevices}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/devices/${row.id}`)}
              emptyMessage="No devices registered for this farm."
              columns={[
                { key: 'name', header: 'Device', render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
                { key: 'type', header: 'Type', render: (row) => (row.type === 'lora_gateway' ? 'Gateway' : 'Sensor node') },
                { key: 'zone', header: 'Zone', render: (row) => plotName(row.plotId) || row.locationLabel || '—' },
                { key: 'sensors', header: 'Installed sensors', render: (row) => (row.installedSensors?.length ? row.installedSensors.map((s) => channelsForSensor(s).map((c) => CHANNEL_META[c].shortLabel).join('/')).join(', ') : '—') },
                { key: 'status', header: 'Status', render: (row) => <DeviceStatusPill status={row.status} /> },
                { key: 'seen', header: 'Last seen', render: (row) => <Timestamp iso={row.lastSeenAt} fallback="Never" /> },
                { key: 'readings', header: 'Readings', numeric: true, render: (row) => telemetry.byDevice[row.id]?.readings.length || 0 },
              ]}
            />
          </Panel>
        </div>
      )}

      {view === 'observations' && (
        <div className="space-y-6">
          <Notice tone="neutral" title="Farmer-recorded measurements are kept separate from sensor telemetry">
            These values come from field visits you log in Farms & Field Zones. They are useful context for irrigation and stress rules, but they are not live readings.
            <div className="mt-3">
              <Button size="sm" variant="secondary" to="/farm?tab=observations&action=new" leadingIcon={<ClipboardList size={14} />}>Record an observation</Button>
            </div>
          </Notice>

          <ChartContainer
            title="Recorded soil moisture and soil temperature"
            subtitle="Each point is one field observation with a measured value"
            source="manual_observation"
            isEmpty={observationSeries.length === 0}
            emptyTitle="No measured observations yet"
            emptyDescription="Add soil moisture or soil temperature when recording an observation to build this history."
            legend={<Legend items={[{ label: 'Soil moisture (%)', color: CHART_COLORS.water, shape: 'line' }, { label: 'Soil temperature (°C)', color: CHART_COLORS.amber, shape: 'line' }]} />}
            size="md"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={observationSeries} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {...CHART_AXIS_PROPS} />
                <YAxis yAxisId="left" {...CHART_AXIS_PROPS} width={40} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} width={40} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-IN')} />
                <Line yAxisId="left" type="monotone" dataKey="moisture" name="Soil moisture" unit="%" stroke={CHART_COLORS.water} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="soilTemp" name="Soil temperature" unit="°C" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <Panel title="Observation log" subtitle={`${farmObservations.length} record${farmObservations.length === 1 ? '' : 's'} for ${activeFarm.name}`} as="section" flush actions={<Button size="sm" variant="ghost" to="/farm?tab=observations">Open full log</Button>}>
            <DataTable<FieldObservation>
              caption="Field observations for the active farm"
              rows={farmObservations.slice(0, 50)}
              rowKey={(row) => row.id}
              columns={observationColumns}
              emptyMessage="No observations recorded yet."
              maxHeight={420}
            />
          </Panel>
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;
