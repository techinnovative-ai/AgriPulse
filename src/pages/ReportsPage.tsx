import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend as RechartsLegend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CheckSquare, ClipboardList, Download, FileText, Printer, Radio, Sprout } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { channelForReading, CHANNEL_META } from '../services/telemetryService';
import { downloadTextFile, slugify, toCsv, type CsvRow } from '../utils/csv';
import {
  Button,
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_GRID_PROPS,
  ChartContainer,
  ChartTooltip,
  EmptyState,
  KeyValueList,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SourceTag,
  formatAbsoluteTime,
} from '../components/ui';

type Range = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

const weekKey = (iso: string) => {
  const date = new Date(iso);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  return monday.toISOString().slice(0, 10);
};

export const ReportsPage: React.FC = () => {
  const { activeFarm, plots, crops, observations, activities, devices, diseaseReports, rainfallLogs } = useAgriPulse();
  const { telemetry, alerts, insights, stressByPlot, generatedAt } = useFarmIntelligence();
  const [range, setRange] = useState<Range>('30d');

  const farmId = activeFarm?.id;
  const since = useMemo(() => Date.now() - RANGE_DAYS[range] * 86400000, [range]);
  const inRange = (iso: string) => new Date(iso).getTime() >= since;

  const farmPlots = plots.filter((plot) => plot.farmId === farmId);
  const farmCrops = crops.filter((crop) => crop.farmId === farmId);
  const farmObservations = observations.filter((obs) => obs.farmId === farmId);
  const farmActivities = activities.filter((activity) => activity.farmId === farmId);
  const farmDevices = devices.filter((device) => device.farmId === farmId);
  const farmReports = diseaseReports.filter((report) => report.farmId === farmId);

  const periodObservations = farmObservations.filter((obs) => inRange(obs.recordedAt));
  const periodCompleted = farmActivities.filter((activity) => activity.status === 'Completed' && inRange(activity.completedAt || activity.scheduledDate));
  const periodPending = farmActivities.filter((activity) => activity.status === 'Pending');
  const periodReadings = telemetry.readings.filter((reading) => inRange(reading.measuredAt));
  const periodReports = farmReports.filter((report) => inRange(report.createdAt));

  const observationsByWeek = useMemo(() => {
    const map = new Map<string, { week: string; Normal: number; Watch: number; 'Action Needed': number }>();
    periodObservations.forEach((obs) => {
      const key = weekKey(obs.recordedAt);
      const row = map.get(key) || { week: key, Normal: 0, Watch: 0, 'Action Needed': 0 };
      row[obs.severity] += 1;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week)).map((row) => ({ ...row, label: new Date(row.week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }));
  }, [periodObservations]);

  const activitiesByCategory = useMemo(() => {
    const map = new Map<string, { category: string; Completed: number; Pending: number }>();
    farmActivities.forEach((activity) => {
      const row = map.get(activity.category) || { category: activity.category, Completed: 0, Pending: 0 };
      row[activity.status] += 1;
      map.set(activity.category, row);
    });
    return Array.from(map.values()).sort((a, b) => b.Completed + b.Pending - (a.Completed + a.Pending));
  }, [farmActivities]);

  const readingsByDay = useMemo(() => {
    const map = new Map<string, number>();
    periodReadings.forEach((reading) => {
      const key = reading.measuredAt.slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: new Date(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count }));
  }, [periodReadings]);

  const cropHealth = useMemo(() => {
    const counts = { Healthy: 0, 'Watch / Mild Stress': 0, 'Needs Inspection': 0 };
    farmCrops.forEach((crop) => { counts[crop.healthStatus] += 1; });
    return [
      { status: 'Healthy', count: counts.Healthy, fill: CHART_COLORS.forest },
      { status: 'Watch', count: counts['Watch / Mild Stress'], fill: CHART_COLORS.amber },
      { status: 'Needs inspection', count: counts['Needs Inspection'], fill: CHART_COLORS.red },
    ];
  }, [farmCrops]);

  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = `agripulse-${slugify(activeFarm?.name || 'farm')}-${stamp}`;

  const exportObservations = () =>
    downloadTextFile(`${prefix}-observations.csv`, toCsv(farmObservations.map<CsvRow>((obs) => ({ recordedAt: obs.recordedAt, zone: obs.plotName || '', crop: obs.cropName || '', category: obs.category, severity: obs.severity, soilMoisturePct: obs.soilMoisturePct ?? '', soilTempC: obs.soilTempC ?? '', standingWater: obs.standingWaterStatus || '', irrigationStatus: obs.irrigationStatus || '', notes: obs.notes, source: obs.sourceLabel }))));
  const exportActivities = () =>
    downloadTextFile(`${prefix}-tasks.csv`, toCsv(farmActivities.map<CsvRow>((activity) => ({ title: activity.title, category: activity.category, zone: activity.plotName || '', crop: activity.cropName || '', scheduledDate: activity.scheduledDate, priority: activity.priority, status: activity.status, completedAt: activity.completedAt || '', notes: activity.notes, demoRecord: activity.isDemoRecord }))));
  const exportCrops = () =>
    downloadTextFile(`${prefix}-crops.csv`, toCsv(farmCrops.map<CsvRow>((crop) => ({ zone: crop.plotName, crop: crop.cropName, variety: crop.variety, area: crop.cultivatedArea, areaUnit: crop.areaUnit, sowingDate: crop.sowingDate, expectedHarvest: crop.expectedHarvestDate, stage: crop.growthStage, irrigation: crop.irrigationMethod, health: crop.healthStatus, stressScore: stressByPlot.find((item) => item.plot.id === crop.plotId)?.score ?? '' }))));
  const exportDevices = () =>
    downloadTextFile(`${prefix}-devices.csv`, toCsv(farmDevices.map<CsvRow>((device) => ({ name: device.name, type: device.type, status: device.status, zone: farmPlots.find((plot) => plot.id === device.plotId)?.name || '', location: device.locationLabel || '', sensors: (device.installedSensors || []).join('; '), samplingIntervalMinutes: device.samplingIntervalMinutes ?? '', lastSeenAt: device.lastSeenAt || '' }))));
  const exportTelemetry = () =>
    downloadTextFile(`${prefix}-telemetry.csv`, toCsv(telemetry.readings.map<CsvRow>((reading) => ({ measuredAt: reading.measuredAt, receivedAt: reading.receivedAt, device: farmDevices.find((device) => device.id === reading.deviceId)?.name || reading.deviceId, channel: (() => { const channel = channelForReading(reading); return channel ? CHANNEL_META[channel].label : reading.sensorType; })(), value: reading.value, unit: reading.unit, source: reading.source, quality: reading.quality || '' }))));
  const exportAlerts = () =>
    downloadTextFile(`${prefix}-alerts-insights.csv`, toCsv([
      ...alerts.map<CsvRow>((alert) => ({ type: 'alert', severity: alert.severity, category: alert.category, title: alert.title, affected: alert.affected, detail: alert.detail, nextStep: alert.nextStep, at: alert.occurredAt })),
      ...insights.map<CsvRow>((insight) => ({ type: 'insight', severity: insight.severity, category: insight.kind, title: insight.title, affected: insight.zoneLabel, detail: insight.observed, nextStep: insight.action, at: insight.generatedAt, confidence: insight.confidence, rule: insight.ruleId })),
    ]));

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Reports & analytics" icon={<BarChart3 size={14} />} title="Reports & analytics" />
        <EmptyState icon={<BarChart3 />} title="No farm selected" actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  const exports = [
    { label: 'Observations', count: farmObservations.length, run: exportObservations },
    { label: 'Tasks', count: farmActivities.length, run: exportActivities },
    { label: 'Crop records', count: farmCrops.length, run: exportCrops },
    { label: 'Devices', count: farmDevices.length, run: exportDevices },
    { label: 'Sensor telemetry', count: telemetry.readings.length, run: exportTelemetry },
    { label: 'Alerts & insights', count: alerts.length + insights.length, run: exportAlerts },
  ];

  return (
    <div className="dashboard-page space-y-6 print-area">
      <PageHeader
        eyebrow="Reports & analytics"
        icon={<BarChart3 size={14} />}
        title="Reports & analytics"
        description={`Activity, observation and telemetry summaries for ${activeFarm.name}, with CSV exports of your own records. Charts show counts of records — missing data is shown as a gap, never as zero.`}
        actions={
          <>
            <SegmentedControl ariaLabel="Report period" value={range} onChange={setRange} options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
            <Button size="sm" variant="secondary" onClick={() => window.print()} leadingIcon={<Printer size={14} />}>Print summary</Button>
          </>
        }
        meta={<div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600"><SourceTag source="saved_record" /><SourceTag source="physical_sensor" /><span>Generated {formatAbsoluteTime(new Date().toISOString())}{generatedAt ? ` · insights evaluated ${formatAbsoluteTime(generatedAt)}` : ''}</span></div>}
      />

      <section aria-label="Period summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={<ClipboardList />} label="Observations" value={periodObservations.length} note={`in the last ${RANGE_DAYS[range]} days`} tone="forest" source="manual_observation" />
        <MetricCard icon={<CheckSquare />} label="Tasks completed" value={periodCompleted.length} note={`${periodPending.length} still pending`} tone="leaf" />
        <MetricCard icon={<Radio />} label="Sensor readings" value={periodReadings.length} note={periodReadings.length ? `${new Set(periodReadings.map((r) => r.deviceId)).size} node(s)` : 'No node has reported'} tone="water" source={periodReadings.length ? 'physical_sensor' : 'unavailable'} />
        <MetricCard icon={<Sprout />} label="Symptom reports" value={periodReports.length} note={`${farmReports.filter((r) => r.status !== 'Expert confirmed').length} open overall`} tone="amber" />
        <MetricCard icon={<FileText />} label="Open alerts" value={alerts.length} note="Across all categories" tone="neutral" source="rule_based" />
        <MetricCard icon={<BarChart3 />} label="Rainfall records" value={rainfallLogs.filter((log) => log.farmId === farmId && inRange(log.date)).length} note="Farmer or provider estimates" tone="sun" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartContainer title="Observations per week by severity" subtitle={`Last ${RANGE_DAYS[range]} days`} source="manual_observation" isEmpty={observationsByWeek.length === 0} emptyTitle="No observations in this period" legend={undefined} size="sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={observationsByWeek} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="label" {...CHART_AXIS_PROPS} />
              <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Normal" stackId="a" fill={CHART_COLORS.forest} isAnimationActive={false} />
              <Bar dataKey="Watch" stackId="a" fill={CHART_COLORS.amber} isAnimationActive={false} />
              <Bar dataKey="Action Needed" stackId="a" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Tasks by category" subtitle="All recorded tasks for this farm" source="saved_record" isEmpty={activitiesByCategory.length === 0} emptyTitle="No tasks recorded" size="sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activitiesByCategory} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 24 }}>
              <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} vertical />
              <XAxis type="number" allowDecimals={false} {...CHART_AXIS_PROPS} />
              <YAxis type="category" dataKey="category" width={120} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Completed" stackId="a" fill={CHART_COLORS.forest} isAnimationActive={false} />
              <Bar dataKey="Pending" stackId="a" fill={CHART_COLORS.slate} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Sensor readings received per day" subtitle={`Last ${RANGE_DAYS[range]} days · authenticated telemetry only`} source="physical_sensor" isEmpty={readingsByDay.length === 0} emptyTitle="No sensor readings in this period" emptyDescription="Counts appear once a paired node reports. Demo devices never contribute readings." size="sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={readingsByDay} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="day" {...CHART_AXIS_PROPS} />
              <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Readings" fill={CHART_COLORS.water} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Recorded crop health" subtitle="Status you set on each crop record" source="saved_record" isEmpty={farmCrops.length === 0} emptyTitle="No crop records" size="sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cropHealth} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="status" {...CHART_AXIS_PROPS} />
              <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Crops" radius={[4, 4, 0, 0]} isAnimationActive={false} fill={CHART_COLORS.forest} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
        <Panel as="section" title="Export your records" subtitle="CSV files generated in your browser from the data shown in the portal. Nothing is uploaded.">
          <ul className="grid gap-2 sm:grid-cols-2">
            {exports.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-500">{item.count} row{item.count === 1 ? '' : 's'}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={item.run} disabled={item.count === 0} leadingIcon={<Download size={13} />}>Export CSV</Button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel as="aside" title="Farm summary">
            <KeyValueList
              items={[
                { label: 'Farm', value: activeFarm.name },
                { label: 'Location', value: `${activeFarm.village}, ${activeFarm.district}` },
                { label: 'Area', value: `${activeFarm.totalArea} ${activeFarm.areaUnit}` },
                { label: 'Zones / crops', value: `${farmPlots.length} / ${farmCrops.length}` },
                { label: 'Devices', value: `${farmDevices.filter((d) => d.status !== 'retired').length} (${farmDevices.filter((d) => d.status === 'online').length} online)` },
                { label: 'Zones at high stress', value: `${stressByPlot.filter((item) => item.level === 'high').length}` },
              ]}
            />
          </Panel>
          <Notice tone="neutral" title="About these reports">
            Figures are counts of your own records and authenticated sensor readings. Yield, revenue or profit estimates are not produced by this release.
          </Notice>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
