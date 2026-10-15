import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CloudRain, Droplets, Gauge, Sprout, ThermometerSun, Waves } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { next48hForecast, type IrrigationGuidance } from '../services/insightsService';
import { ConfidenceMeter } from '../components/InsightCard';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  KeyValueList,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SourceTag,
  Timestamp,
  formatRelativeTime,
  type BadgeTone,
} from '../components/ui';
import type { FarmActivity } from '../types';

const STATUS_META: Record<IrrigationGuidance['status'], { label: string; tone: BadgeTone; order: number }> = {
  irrigate_now: { label: 'Irrigate now', tone: 'danger', order: 0 },
  irrigate_soon: { label: 'Irrigate soon', tone: 'warning', order: 1 },
  hold_rain: { label: 'Hold — rain expected', tone: 'info', order: 2 },
  too_wet: { label: 'Too wet — drain / pause', tone: 'info', order: 3 },
  adequate: { label: 'Adequate', tone: 'success', order: 4 },
  no_data: { label: 'No moisture data', tone: 'neutral', order: 5 },
};

const MoistureBand: React.FC<{ guidance: IrrigationGuidance }> = ({ guidance }) => {
  const { target, moisture } = guidance;
  const value = moisture?.value;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-slate-100" role="img" aria-label={`Target moisture ${target.min} to ${target.max} percent${typeof value === 'number' ? `, current ${value} percent` : ', no current reading'}`}>
        <div className="absolute inset-y-0 rounded-full bg-water-200" style={{ left: `${clamp(target.min)}%`, width: `${clamp(target.max) - clamp(target.min)}%` }} />
        {typeof value === 'number' && (
          <div className="absolute -top-1 h-5 w-1.5 rounded-full bg-forest-800 shadow" style={{ left: `calc(${clamp(value)}% - 3px)` }} />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-500">
        <span>0%</span>
        <span>Target {target.min}–{target.max}%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export const IrrigationPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeFarm, plots, weather, activities, rainfallLogs } = useAgriPulse();
  const { irrigationByPlot } = useFarmIntelligence();

  const farmPlots = plots.filter((plot) => plot.farmId === activeFarm?.id);
  const sorted = useMemo(() => [...irrigationByPlot].sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order), [irrigationByPlot]);
  const count = (status: IrrigationGuidance['status']) => irrigationByPlot.filter((item) => item.status === status).length;

  const next48 = next48hForecast(weather.daily);
  const rainProb = next48.length ? Math.max(...next48.map((day) => day.rainProbPct)) : 0;
  const rainMm = next48.reduce((sum, day) => sum + (day.expectedRainMm || 0), 0);
  const weatherIsDemo = weather.sourceType.toLowerCase().includes('demo');

  const irrigationTasks = activities
    .filter((activity) => activity.farmId === activeFarm?.id && activity.category === 'Irrigation' && activity.status === 'Pending')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const recentRain = rainfallLogs.filter((log) => log.farmId === activeFarm?.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const targets = useMemo(() => {
    const map = new Map<string, { min: number; max: number; note: string }>();
    irrigationByPlot.forEach((item) => {
      if (item.crop) map.set(item.crop.cropName, item.target);
    });
    return Array.from(map.entries());
  }, [irrigationByPlot]);

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Irrigation guidance" icon={<Droplets size={14} />} title="Irrigation guidance" />
        <EmptyState icon={<Droplets />} title="No farm selected" actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Irrigation guidance"
        icon={<Droplets size={14} />}
        title="Irrigation guidance"
        description={`Per-zone guidance for ${activeFarm.name} based on the freshest soil-moisture value available (sensor first, then your recorded observations), the crop's target band and the 48-hour rain outlook.`}
        actions={
          <>
            <Button size="sm" variant="secondary" to="/farm?tab=observations&action=new" leadingIcon={<Gauge size={14} />}>Record moisture reading</Button>
            <Button size="sm" to="/home?action=new-task&category=Irrigation" leadingIcon={<CalendarDays size={14} />}>Plan irrigation task</Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="rule_based" />
            <span>Rule irrigation.target-band.v1 · guidance, not a controller. AgriPulse does not switch pumps or valves.</span>
          </div>
        }
      />

      <section aria-label="Irrigation summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Droplets />} label="Irrigate now" value={count('irrigate_now')} note="Below target by 8 points or more" tone="neutral" />
        <MetricCard icon={<Waves />} label="Irrigate soon" value={count('irrigate_soon')} note="Approaching the lower bound" tone="amber" />
        <MetricCard icon={<Sprout />} label="Adequate / hold" value={count('adequate') + count('hold_rain') + count('too_wet')} note="No irrigation needed today" tone="leaf" />
        <MetricCard icon={<Gauge />} label="No moisture data" value={count('no_data') + (farmPlots.length - irrigationByPlot.length)} note="Record a reading or pair a sensor" tone="water" source="unavailable" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          {farmPlots.length === 0 ? (
            <EmptyState icon={<Sprout />} title="No field zones yet" description="Irrigation guidance is produced per zone with a crop record." actions={<Button to="/farm?tab=farms">Add a zone</Button>} />
          ) : sorted.length === 0 ? (
            <EmptyState icon={<Sprout />} title="No zones with a crop record" description="Add a crop to each zone so the correct moisture target band can be applied." actions={<Button to="/farm?tab=farms">Add crop record</Button>} />
          ) : (
            sorted.map((guidance) => {
              const meta = STATUS_META[guidance.status];
              return (
                <article key={guidance.plot.id} className="ap-panel p-5" aria-labelledby={`irr-${guidance.plot.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 id={`irr-${guidance.plot.id}`} className="text-base font-extrabold text-forest-950">{guidance.plot.name}</h3>
                      <p className="text-xs text-slate-600">{guidance.crop ? `${guidance.crop.cropName} · ${guidance.crop.variety} · ${guidance.crop.growthStage}` : 'No crop'} · {guidance.plot.irrigationMethod} · {guidance.plot.area} {guidance.plot.areaUnit}</p>
                    </div>
                    <Badge tone={meta.tone} size="md">{meta.label}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{guidance.headline}</p>
                  <MoistureBand guidance={guidance} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Moisture input</p>
                      {guidance.moisture ? (
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-800">
                          <span className="text-lg font-extrabold text-forest-950">{guidance.moisture.value}%</span>
                          <SourceTag source={guidance.moisture.source} />
                          <span className="text-slate-500">{guidance.moisture.label} · {formatRelativeTime(guidance.moisture.at)}</span>
                          {guidance.moisture.stale && <Badge tone="warning" size="sm">Older than 7 days</Badge>}
                        </p>
                      ) : (
                        <p className="mt-1 text-slate-600">No moisture value yet. <button type="button" className="font-semibold text-forest-800 underline" onClick={() => navigate('/farm?tab=observations&action=new')}>Record one now</button> or assign a sensor node to this zone.</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Rain outlook (48 h)</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-800">
                        <span className="text-lg font-extrabold text-water-700">{guidance.forecastRainProbPct}%</span>
                        <span>chance · ≈{guidance.forecastRainMm.toFixed(1)} mm</span>
                        <SourceTag source={weatherIsDemo ? 'weather_demo' : 'weather_api'} />
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-700">
                    {guidance.reasoning.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <ConfidenceMeter
                      confidence={guidance.confidence}
                      note={
                        guidance.confidence === 'high'
                          ? 'Fresh sensor reading from this zone.'
                          : guidance.confidence === 'medium'
                            ? 'Based on a recent farmer-recorded value.'
                            : guidance.moisture?.source === 'demo'
                              ? 'Based on a demo sample record — record your own reading or pair a sensor to raise confidence.'
                              : guidance.moisture?.stale
                                ? 'The moisture value is older than 7 days — treat this as a reminder to check the field.'
                                : 'No fresh moisture value — treat this as a reminder to check the field.'
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" to={`/home?action=new-task&category=Irrigation&plot=${encodeURIComponent(guidance.plot.name)}`} leadingIcon={<CalendarDays size={13} />}>Schedule irrigation</Button>
                      <Button size="sm" variant="ghost" to={`/twin?zone=${guidance.plot.id}`}>View in twin</Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Panel as="aside" title="Weather context" subtitle={`${weather.locationLabel || weather.district} · ${weather.sourceProvider}`} actions={<Button size="sm" variant="ghost" to="/weather">Weather</Button>}>
            <KeyValueList
              items={[
                { label: 'Rain chance (48 h)', value: `${rainProb}%` },
                { label: 'Expected rain (48 h)', value: `≈${rainMm.toFixed(1)} mm (${weatherIsDemo ? 'demo forecast' : 'provider forecast'})` },
                { label: 'Max temperature today', value: `${Math.round(weather.tempMaxC)} °C` },
                { label: 'Humidity now', value: `${Math.round(weather.humidityPct)}%` },
                { label: 'Updated', value: formatRelativeTime(weather.updatedAt) },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <SourceTag source={weatherIsDemo ? 'weather_demo' : 'weather_api'} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Rainfall figures are provider forecasts or estimates, never measured on the farm — AgriPulse has no rain gauge sensor.</p>
          </Panel>

          <Panel as="aside" title="Target moisture bands" subtitle="Rule set v1 — general bands by crop, not tuned to your soil yet.">
            {targets.length === 0 ? (
              <p className="text-xs text-slate-600">Bands appear once zones have crop records.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {targets.map(([crop, target]) => (
                  <li key={crop} className="flex items-start justify-between gap-3 py-2">
                    <span className="font-semibold text-slate-800">{crop}</span>
                    <span className="text-right text-slate-600">{target.min}–{target.max}%<br /><span className="text-[10.5px] text-slate-500">{target.note}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel as="aside" title="Pending irrigation tasks" actions={<Button size="sm" variant="ghost" to="/home#farm-calendar">Calendar</Button>} flush>
            <DataTable<FarmActivity>
              caption="Pending irrigation tasks"
              rows={irrigationTasks.slice(0, 6)}
              rowKey={(row) => row.id}
              minWidth={0}
              emptyMessage="No pending irrigation tasks."
              columns={[
                { key: 'title', header: 'Task', render: (row) => <span className="font-semibold">{row.title}</span> },
                { key: 'plot', header: 'Zone', render: (row) => row.plotName || 'Farm' },
                { key: 'date', header: 'Due', render: (row) => <Timestamp iso={row.scheduledDate} withTime={false} /> },
              ]}
            />
          </Panel>

          {recentRain.length > 0 && (
            <Panel as="aside" title="Recent rainfall records" subtitle="Farmer-recorded or provider estimates — not sensor data.">
              <ul className="divide-y divide-slate-100 text-xs">
                {recentRain.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex items-center gap-2"><CloudRain size={13} className="text-water-600" aria-hidden="true" />{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="font-semibold">{log.amountMm} mm</span>
                    <SourceTag source={log.sourceType === 'Farmer Recorded' ? 'manual_observation' : log.sourceType === 'Forecast Estimate' ? 'weather_api' : 'weather_demo'} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Notice tone="neutral" title="Water-saving reminders">
            <ul className="list-disc space-y-1 pl-4">
              <li className="flex items-start gap-2"><ThermometerSun size={13} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Irrigate early morning or evening when temperatures are high to reduce evaporation.</span></li>
              <li>Record every irrigation as an observation so the guidance can account for it.</li>
            </ul>
          </Notice>
        </div>
      </div>
    </div>
  );
};

export default IrrigationPage;
