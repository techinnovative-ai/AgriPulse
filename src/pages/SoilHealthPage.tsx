import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList, Droplets, FlaskConical, Layers, Mountain, ThermometerSun, Waves } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { CHANNEL_META, formatChannelValue, summarizeByChannel, type ChannelSnapshot } from '../services/telemetryService';
import {
  Badge,
  Button,
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  ChartContainer,
  ChartTooltip,
  DataTable,
  EmptyState,
  KeyValueList,
  Legend,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SourceTag,
  Timestamp,
  formatRelativeTime,
  type DataSource,
} from '../components/ui';
import type { FieldObservation } from '../types';

interface SoilValue {
  value: number;
  unit: string;
  at: string;
  source: DataSource;
  label: string;
}

const PH_GUIDE = [
  { range: '< 5.5', label: 'Strongly acidic', tone: 'danger' as const, note: 'Aluminium toxicity risk; liming usually advised after a Soil Health Card test.' },
  { range: '5.5 – 6.0', label: 'Moderately acidic', tone: 'warning' as const, note: 'Phosphorus availability drops; suits tea, potato, some pulses.' },
  { range: '6.0 – 7.5', label: 'Near neutral', tone: 'success' as const, note: 'Best nutrient availability for most field crops.' },
  { range: '7.5 – 8.5', label: 'Moderately alkaline', tone: 'warning' as const, note: 'Zinc and iron lock-up; gypsum or organic matter may help.' },
  { range: '> 8.5', label: 'Strongly alkaline / sodic', tone: 'danger' as const, note: 'Reclamation needed; consult the district soil testing lab.' },
];

export const SoilHealthPage: React.FC = () => {
  const { activeFarm, plots, crops, devices, observations } = useAgriPulse();
  const { telemetry, irrigationByPlot } = useFarmIntelligence();
  const farmId = activeFarm?.id;
  const farmPlots = useMemo(() => plots.filter((plot) => plot.farmId === farmId), [plots, farmId]);
  const [plotFilter, setPlotFilter] = useState('all');

  const soilObservations = useMemo(
    () =>
      observations
        .filter((obs) => obs.farmId === farmId && (obs.category === 'Soil Moisture' || obs.category === 'Standing Water' || obs.category === 'Irrigation Observation' || typeof obs.soilMoisturePct === 'number' || typeof obs.soilTempC === 'number'))
        .filter((obs) => plotFilter === 'all' || obs.plotId === plotFilter)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [observations, farmId, plotFilter]
  );

  const sensorSnapshots = useMemo(() => {
    const farmNodes = devices.filter((device) => device.farmId === farmId && device.type === 'sensor_node' && device.status !== 'retired' && (plotFilter === 'all' || device.plotId === plotFilter));
    return farmNodes.flatMap((device) => summarizeByChannel(telemetry.byDevice[device.id]?.readings || [], device).map((snapshot) => ({ snapshot, device })));
  }, [devices, farmId, plotFilter, telemetry.byDevice]);

  const pickSensor = (channel: ChannelSnapshot['channel']) => {
    const candidates = sensorSnapshots.filter((item) => item.snapshot.channel === channel && !item.snapshot.isStale);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.snapshot.latest.measuredAt.localeCompare(a.snapshot.latest.measuredAt))[0];
  };

  const latestValue = (channel: 'soil_moisture' | 'soil_temperature' | 'soil_ph' | 'soil_npk'): SoilValue | null => {
    const sensor = pickSensor(channel);
    if (sensor) {
      return { value: sensor.snapshot.latest.value, unit: CHANNEL_META[channel].unit, at: sensor.snapshot.latest.measuredAt, source: 'physical_sensor', label: `${sensor.device.name}` };
    }
    if (channel === 'soil_moisture' || channel === 'soil_temperature') {
      const key = channel === 'soil_moisture' ? 'soilMoisturePct' : 'soilTempC';
      const obs = soilObservations.find((item) => typeof item[key] === 'number');
      if (obs) return { value: obs[key] as number, unit: channel === 'soil_moisture' ? '%' : '°C', at: obs.recordedAt, source: obs.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation', label: obs.plotName || 'Farm' };
    }
    return null;
  };

  const moisture = latestValue('soil_moisture');
  const soilTemp = latestValue('soil_temperature');
  const ph = latestValue('soil_ph');
  const npk = latestValue('soil_npk');

  const series = useMemo(
    () =>
      [...soilObservations]
        .filter((obs) => typeof obs.soilMoisturePct === 'number' || typeof obs.soilTempC === 'number')
        .reverse()
        .map((obs) => ({ t: new Date(obs.recordedAt).getTime(), moisture: obs.soilMoisturePct, soilTemp: obs.soilTempC })),
    [soilObservations]
  );

  const waterlogged = soilObservations.filter((obs) => obs.standingWaterStatus === 'Waterlogged' && Date.now() - new Date(obs.recordedAt).getTime() < 10 * 86400000).length;
  const phBand = ph ? (ph.value < 5.5 ? 0 : ph.value < 6 ? 1 : ph.value <= 7.5 ? 2 : ph.value <= 8.5 ? 3 : 4) : null;
  const soilTypes = Array.from(new Set(farmPlots.map((plot) => plot.soilType).filter(Boolean)));

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Soil health" icon={<Mountain size={14} />} title="Soil health" />
        <EmptyState icon={<Mountain />} title="No farm selected" actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Soil health"
        icon={<Mountain size={14} />}
        title="Soil health"
        description={`Soil type, moisture, temperature, pH and nutrient status for ${activeFarm.name}. Sensor values are used when a paired node reports; otherwise your recorded observations are shown and labelled.`}
        actions={<Button size="sm" to="/farm?tab=observations&action=new" leadingIcon={<ClipboardList size={14} />}>Record soil observation</Button>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            {farmPlots.length > 1 && (
              <label className="flex items-center gap-2 font-semibold">
                Zone
                <select className="ap-select" style={{ minHeight: 32, padding: '4px 28px 4px 10px', fontSize: 12 }} value={plotFilter} onChange={(event) => setPlotFilter(event.target.value)}>
                  <option value="all">All zones</option>
                  {farmPlots.map((plot) => (
                    <option key={plot.id} value={plot.id}>{plot.name}</option>
                  ))}
                </select>
              </label>
            )}
            <SourceTag source="physical_sensor" /><SourceTag source="manual_observation" />
          </div>
        }
      />

      <section aria-label="Soil summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Droplets />} label="Soil moisture" value={moisture ? `${moisture.value}` : '—'} unit={moisture ? moisture.unit : undefined} note={moisture ? `${moisture.label} · ${formatRelativeTime(moisture.at)}` : 'No reading recorded'} tone="water" source={moisture?.source || 'unavailable'} />
        <MetricCard icon={<ThermometerSun />} label="Soil temperature" value={soilTemp ? `${soilTemp.value}` : '—'} unit={soilTemp ? soilTemp.unit : undefined} note={soilTemp ? `${soilTemp.label} · ${formatRelativeTime(soilTemp.at)}` : 'No reading recorded'} tone="amber" source={soilTemp?.source || 'unavailable'} />
        <MetricCard icon={<FlaskConical />} label="Soil pH" value={ph ? formatChannelValue('soil_ph', ph.value) : 'Not measured'} note={ph ? `${PH_GUIDE[phBand ?? 2].label} · ${formatRelativeTime(ph.at)}` : 'Needs a pH sensor or lab test'} tone="leaf" source={ph?.source || 'unavailable'} />
        <MetricCard icon={<Layers />} label="Soil NPK" value={npk ? formatChannelValue('soil_npk', npk.value) : 'Not measured'} note={npk ? `${npk.label} · ${formatRelativeTime(npk.at)}` : 'Use your Soil Health Card'} tone="neutral" source={npk?.source || 'unavailable'} />
      </section>

      {waterlogged > 0 && (
        <Notice tone="warning" title={`${waterlogged} waterlogging observation${waterlogged === 1 ? '' : 's'} in the last 10 days`} role="status">
          Standing water starves roots of oxygen and raises fungal risk. Check drainage in the affected zone and pause irrigation until the topsoil drains.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <ChartContainer
            title="Soil moisture and temperature history"
            subtitle={plotFilter === 'all' ? 'All zones · farmer-recorded observations' : `${farmPlots.find((plot) => plot.id === plotFilter)?.name} · farmer-recorded observations`}
            source="manual_observation"
            isEmpty={series.length === 0}
            emptyTitle="No measured soil observations yet"
            emptyDescription="Add soil moisture or soil temperature when you record an observation. Sensor history is on the Live Monitoring page once a node reports."
            legend={<Legend items={[{ label: 'Soil moisture (%)', color: CHART_COLORS.water, shape: 'line' }, { label: 'Soil temperature (°C)', color: CHART_COLORS.amber, shape: 'line' }]} />}
            size="md"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
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

          <Panel as="section" title="Zones and soil profile" subtitle="Soil type and irrigation method come from your zone records." flush>
            <DataTable
              caption="Soil profile per zone"
              rows={farmPlots}
              rowKey={(row) => row.id}
              emptyMessage="No field zones yet."
              columns={[
                { key: 'zone', header: 'Zone', render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
                { key: 'soil', header: 'Soil type', render: (row) => row.soilType || '—' },
                { key: 'irr', header: 'Irrigation', render: (row) => row.irrigationMethod || '—' },
                { key: 'crop', header: 'Crop', render: (row) => crops.find((crop) => crop.plotId === row.id)?.cropName || <span className="text-slate-500">None</span> },
                {
                  key: 'moisture',
                  header: 'Moisture status',
                  render: (row) => {
                    const guidance = irrigationByPlot.find((item) => item.plot.id === row.id);
                    if (!guidance || !guidance.moisture) return <span className="text-slate-500">No data</span>;
                    return <span className="flex items-center gap-2">{guidance.moisture.value}% <SourceTag source={guidance.moisture.source} /></span>;
                  },
                },
                { key: 'sensors', header: 'Soil sensors', render: (row) => { const n = devices.filter((d) => d.plotId === row.id && d.status !== 'retired' && (d.installedSensors || []).some((s) => s.startsWith('soil'))).length; return n ? `${n}` : <span className="text-slate-500">None</span>; } },
              ]}
            />
          </Panel>

          <Panel as="section" title="Soil observation log" subtitle={`${soilObservations.length} record${soilObservations.length === 1 ? '' : 's'}`} flush>
            <DataTable<FieldObservation>
              caption="Soil-related observations"
              rows={soilObservations.slice(0, 40)}
              rowKey={(row) => row.id}
              emptyMessage="No soil observations recorded yet."
              maxHeight={380}
              columns={[
                { key: 'when', header: 'Recorded', render: (row) => <Timestamp iso={row.recordedAt} /> },
                { key: 'zone', header: 'Zone', render: (row) => row.plotName || 'Farm' },
                { key: 'cat', header: 'Category', render: (row) => row.category },
                { key: 'moisture', header: 'Moisture', numeric: true, render: (row) => (typeof row.soilMoisturePct === 'number' ? `${row.soilMoisturePct}%` : '—') },
                { key: 'temp', header: 'Soil temp', numeric: true, render: (row) => (typeof row.soilTempC === 'number' ? `${row.soilTempC} °C` : '—') },
                { key: 'water', header: 'Standing water', render: (row) => row.standingWaterStatus || '—' },
                { key: 'irr', header: 'Irrigation', render: (row) => row.irrigationStatus || '—' },
                { key: 'sev', header: 'Severity', render: (row) => <Badge tone={row.severity === 'Action Needed' ? 'danger' : row.severity === 'Watch' ? 'warning' : 'success'} size="sm">{row.severity}</Badge> },
              ]}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel as="aside" title="Farm soil profile">
            <KeyValueList
              items={[
                { label: 'Dominant soil type', value: activeFarm.soilType || '—' },
                { label: 'Zone soil types', value: soilTypes.length ? soilTypes.join(', ') : '—' },
                { label: 'Water source', value: activeFarm.waterSource || '—' },
                { label: 'Total area', value: `${activeFarm.totalArea} ${activeFarm.areaUnit}` },
              ]}
            />
          </Panel>

          <Panel as="aside" title="Soil pH guide" subtitle={ph ? `Latest pH ${formatChannelValue('soil_ph', ph.value)} is highlighted` : 'No pH measurement yet'}>
            <ul className="grid gap-1.5">
              {PH_GUIDE.map((band, index) => (
                <li key={band.range} className={`rounded-lg border px-3 py-2 text-xs ${phBand === index ? 'border-forest-400 bg-forest-50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{band.range}</span>
                    <Badge tone={band.tone} size="sm">{band.label}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">{band.note}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel as="aside" title="Nutrient status (NPK)">
            {npk ? (
              <p className="text-xs text-slate-700">Latest sensor value {formatChannelValue('soil_npk', npk.value)} from {npk.label}. Sensor NPK is indicative; confirm with a lab test before changing fertiliser plans.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-700">
                <p>No NPK sensor has reported for this farm. The most reliable source remains your <strong>Soil Health Card</strong> from the district soil testing laboratory.</p>
                <Button size="sm" variant="secondary" to="/schemes" leadingIcon={<Waves size={13} />}>Soil Health Card scheme</Button>
              </div>
            )}
          </Panel>

          <Notice tone="neutral" title="Good soil practice">
            Keep residue cover, rotate legumes, and record every irrigation and standing-water event so the moisture history reflects reality.
          </Notice>
        </div>
      </div>
    </div>
  );
};

export default SoilHealthPage;
