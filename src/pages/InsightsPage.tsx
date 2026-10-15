import React, { useMemo, useState } from 'react';
import { BrainCircuit, Camera, Droplets, Leaf, LineChart, RefreshCw, ShieldCheck, Sprout } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import type { Insight, InsightKind } from '../services/insightsService';
import { InsightCard, ConfidenceMeter } from '../components/InsightCard';
import {
  Badge,
  Button,
  EmptyState,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SourceTag,
  Tabs,
  formatRelativeTime,
} from '../components/ui';

type KindFilter = 'all' | InsightKind;
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'crop_stress', label: 'Crop stress' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'soil', label: 'Soil' },
  { value: 'weather', label: 'Weather' },
  { value: 'crop_health', label: 'Crop health' },
  { value: 'device', label: 'Devices' },
  { value: 'anomaly', label: 'Sensor anomalies' },
  { value: 'task', label: 'Tasks' },
];

const PLANNED_CAPABILITIES = [
  { icon: <Camera size={16} />, title: 'Image-based disease detection', status: 'planned' as const, note: 'The Disease Library records symptoms and gives rule-based guidance today. A configured vision service is required before photo analysis can return a diagnosis.' },
  { icon: <LineChart size={16} />, title: 'Model-based stress forecasting', status: 'planned' as const, note: 'Current stress scores are rule-based. Trained models need months of paired sensor and outcome data from your farm before predictions can be trusted.' },
  { icon: <Sprout size={16} />, title: 'Yield estimation', status: 'planned' as const, note: 'Not available in this release. No yield figures are shown anywhere in the portal.' },
];

const severityMatches = (insight: Insight, filter: SeverityFilter) => {
  if (filter === 'all') return true;
  if (filter === 'high') return insight.severity === 'critical' || insight.severity === 'high';
  if (filter === 'medium') return insight.severity === 'medium';
  return insight.severity === 'low' || insight.severity === 'info';
};

export const InsightsPage: React.FC = () => {
  const { activeFarm, plots } = useAgriPulse();
  const { insights, stressByPlot, generatedAt, telemetry } = useFarmIntelligence();
  const [kind, setKind] = useState<KindFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [plotFilter, setPlotFilter] = useState<string>('all');

  const farmPlots = plots.filter((plot) => plot.farmId === activeFarm?.id);
  const filtered = useMemo(
    () =>
      insights.filter(
        (insight) =>
          (kind === 'all' || insight.kind === kind) &&
          severityMatches(insight, severity) &&
          (plotFilter === 'all' || insight.plotId === plotFilter || (plotFilter === 'farm' && !insight.plotId))
      ),
    [insights, kind, severity, plotFilter]
  );

  const counts = {
    high: insights.filter((item) => item.severity === 'high' || item.severity === 'critical').length,
    medium: insights.filter((item) => item.severity === 'medium').length,
    low: insights.filter((item) => item.severity === 'low' || item.severity === 'info').length,
  };
  const kindCount = (value: KindFilter) => (value === 'all' ? insights.length : insights.filter((item) => item.kind === value).length);

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="AI insights" icon={<BrainCircuit size={14} />} title="AI insights" />
        <EmptyState icon={<BrainCircuit />} title="No farm selected" description="Insights are generated per farm from its zones, crops, observations, devices and weather." actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="AI insights"
        icon={<BrainCircuit size={14} />}
        title="AI insights"
        description={`Every insight for ${activeFarm.name} shows what was observed, which zone it concerns, the supporting data, why it matters, a suggested action and how confident the rule is.`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => void telemetry.refresh()} loading={telemetry.refreshing} leadingIcon={<RefreshCw size={14} />}>
            Refresh inputs
          </Button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="rule_based" />
            <span>Rule set v1 · generated {generatedAt ? formatRelativeTime(generatedAt) : 'just now'} · re-evaluated every 5 minutes and whenever your records change.</span>
          </div>
        }
      />

      <Notice tone="info" title="How these insights are produced">
        AgriPulse applies transparent agronomic rules to your own records: sensor telemetry (only from paired nodes), farmer-recorded observations, crop and zone details, device status and the weather provider shown on the Weather page.
        Measured facts, rule-based conclusions and provider forecasts are labelled separately. No machine-learning model is used in this release; see <em>Planned capabilities</em> below.
      </Notice>

      <section aria-label="Insight summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<ShieldCheck />} label="High priority" value={counts.high} note="Needs action soon" tone="neutral" source="rule_based" onClick={() => setSeverity('high')} />
        <MetricCard icon={<Leaf />} label="Medium" value={counts.medium} note="Review this week" tone="amber" onClick={() => setSeverity('medium')} />
        <MetricCard icon={<Sprout />} label="Low / info" value={counts.low} note="Awareness only" tone="leaf" onClick={() => setSeverity('low')} />
        <MetricCard icon={<Droplets />} label="Zones assessed" value={`${stressByPlot.length}/${farmPlots.length}`} note="Zones with a crop record" tone="water" />
      </section>

      <Panel as="section" title="Crop stress by zone" subtitle="Composite score from moisture, heat, humidity, observations and open reports. Decision support only." actions={<Button size="sm" variant="ghost" to="/crop-health">Open crop health</Button>}>
        {stressByPlot.length === 0 ? (
          <EmptyState compact icon={<Sprout />} title="No zones can be assessed yet" description="Add a crop record to a field zone to switch on stress scoring." actions={<Button size="sm" variant="secondary" to="/farm?tab=farms">Add crop record</Button>} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stressByPlot.map((assessment) => (
              <li key={assessment.plot.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{assessment.plot.name}</p>
                    <p className="text-[11px] text-slate-500">{assessment.crop ? `${assessment.crop.cropName} · ${assessment.crop.growthStage}` : 'No crop'}</p>
                  </div>
                  <Badge tone={assessment.level === 'high' ? 'danger' : assessment.level === 'moderate' ? 'warning' : 'success'} size="sm">{assessment.level} · {assessment.score}</Badge>
                </div>
                <div className="ap-meter mt-3" aria-label={`Stress score ${assessment.score} out of 100`} role="img">
                  <div className="ap-meter__fill" style={{ width: `${assessment.score}%`, background: assessment.level === 'high' ? '#c84e48' : assessment.level === 'moderate' ? '#c78a2f' : '#387333' }} />
                </div>
                <ul className="mt-3 space-y-1 text-[11px] text-slate-700">
                  {assessment.factors.length === 0 && <li className="text-slate-500">No stress factors detected.</li>}
                  {assessment.factors.slice(0, 4).map((factor) => (
                    <li key={factor.label} className="flex items-center justify-between gap-2">
                      <span className="truncate">{factor.label}</span>
                      <span className="flex items-center gap-1.5 shrink-0"><SourceTag source={factor.source} />+{factor.points}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3"><ConfidenceMeter confidence={assessment.confidence} note={assessment.confidenceNote} /></div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        as="section"
        title="All insights"
        subtitle={`${filtered.length} of ${insights.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl ariaLabel="Severity filter" value={severity} onChange={setSeverity} options={[{ value: 'all', label: 'Any severity' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
            {farmPlots.length > 0 && (
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                Zone
                <select className="ap-select" style={{ minHeight: 32, padding: '4px 28px 4px 10px', fontSize: 12 }} value={plotFilter} onChange={(event) => setPlotFilter(event.target.value)}>
                  <option value="all">All zones</option>
                  <option value="farm">Farm-wide</option>
                  {farmPlots.map((plot) => (
                    <option key={plot.id} value={plot.id}>{plot.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        }
      >
        <Tabs ariaLabel="Insight type" value={kind} onChange={setKind} tabs={KIND_TABS.map((tab) => ({ ...tab, count: kindCount(tab.value) })).filter((tab) => tab.value === 'all' || tab.count > 0)} className="mb-4" />
        {filtered.length === 0 ? (
          <EmptyState compact icon={<BrainCircuit />} title={insights.length === 0 ? 'No insights right now' : 'No insights match these filters'} description={insights.length === 0 ? 'Rules found nothing that needs attention in the current records. Insights appear as observations, telemetry, weather or tasks change.' : 'Clear a filter to see more.'} />
        ) : (
          <div className="grid gap-3">
            {filtered.map((insight, index) => (
              <InsightCard key={insight.id} insight={insight} defaultExpanded={index < 2} />
            ))}
          </div>
        )}
      </Panel>

      <Panel as="section" title="Planned capabilities" subtitle="Listed so you know exactly what the portal does not do yet.">
        <ul className="grid gap-3 md:grid-cols-3">
          {PLANNED_CAPABILITIES.map((item) => (
            <li key={item.title} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">{item.icon}{item.title}</span>
                <SourceTag source={item.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.note}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};

export default InsightsPage;
