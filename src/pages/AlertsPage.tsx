import React, { useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, Clock3, MapPin, RotateCcw, ArrowRight } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { ALERT_CATEGORY_LABEL, type AlertCategory, type FarmAlert } from '../services/alertsService';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SeverityBadge,
  SourceTag,
  Tabs,
  Timestamp,
} from '../components/ui';

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';
type Scope = 'open' | 'reviewed';

const matchesSeverity = (alert: FarmAlert, filter: SeverityFilter) =>
  filter === 'all' ||
  (filter === 'high' && (alert.severity === 'critical' || alert.severity === 'high')) ||
  (filter === 'medium' && alert.severity === 'medium') ||
  (filter === 'low' && (alert.severity === 'low' || alert.severity === 'info'));

const AlertRow: React.FC<{ alert: FarmAlert; reviewedAt?: string; onAcknowledge: () => void; onRestore: () => void }> = ({ alert, reviewedAt, onAcknowledge, onRestore }) => (
  <li className={`ap-insight ${alert.severity === 'critical' || alert.severity === 'high' ? 'ap-insight--high' : alert.severity === 'medium' ? 'ap-insight--medium' : 'ap-insight--low'}`}>
    <div className="flex flex-wrap items-center gap-2">
      <SeverityBadge severity={alert.severity} size="sm" />
      <Badge tone="neutral" size="sm">{ALERT_CATEGORY_LABEL[alert.category]}</Badge>
      <span className="ml-auto flex items-center gap-2">
        <Timestamp iso={alert.occurredAt} />
      </span>
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-forest-800"><MapPin size={12} aria-hidden="true" />{alert.affected}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-700">{alert.detail}</p>
    </div>
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Next step</span>
      <p className="mt-0.5 text-slate-800">{alert.nextStep}</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button size="sm" variant="secondary" to={alert.route} trailingIcon={<ArrowRight size={13} />}>{alert.actionLabel}</Button>
      {reviewedAt ? (
        <span className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock3 size={12} aria-hidden="true" />Reviewed <Timestamp iso={reviewedAt} />
          <Button size="sm" variant="ghost" onClick={onRestore} leadingIcon={<RotateCcw size={12} />}>Restore</Button>
        </span>
      ) : (
        <Button size="sm" variant="ghost" onClick={onAcknowledge} leadingIcon={<CheckCheck size={13} />}>Mark as reviewed</Button>
      )}
    </div>
  </li>
);

export const AlertsPage: React.FC = () => {
  const { activeFarm } = useAgriPulse();
  const { alerts, activeAlerts, acknowledged, acknowledgeAlert, restoreAlert, acknowledgeAll, generatedAt } = useFarmIntelligence();
  const [scope, setScope] = useState<Scope>('open');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [category, setCategory] = useState<'all' | AlertCategory>('all');
  const [confirmAll, setConfirmAll] = useState(false);

  const reviewedAlerts = useMemo(() => alerts.filter((alert) => acknowledged[alert.id]), [alerts, acknowledged]);
  const source = scope === 'open' ? activeAlerts : reviewedAlerts;
  const visible = source.filter((alert) => matchesSeverity(alert, severity) && (category === 'all' || alert.category === category));

  const categories = (Object.keys(ALERT_CATEGORY_LABEL) as AlertCategory[]).filter((key) => alerts.some((alert) => alert.category === key));
  const highCount = activeAlerts.filter((alert) => alert.severity === 'high' || alert.severity === 'critical').length;
  const mediumCount = activeAlerts.filter((alert) => alert.severity === 'medium').length;
  const deviceCount = activeAlerts.filter((alert) => alert.category === 'device').length;

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Alerts & notifications"
        icon={<Bell size={14} />}
        title="Alerts & notifications"
        description={activeFarm ? `Everything that needs a decision on ${activeFarm.name}: crop stress, irrigation, soil, weather warnings, device status, overdue tasks and store orders. Each alert names the zone or device, when it was raised, its severity and the next step.` : 'Select a farm to see its alerts.'}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setConfirmAll(true)} disabled={activeAlerts.length === 0} leadingIcon={<CheckCheck size={14} />}>
            Mark all as reviewed
          </Button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="rule_based" />
            <span>Alerts are derived from your records and device status{generatedAt ? ' · evaluated ' : ''}{generatedAt && <Timestamp iso={generatedAt} />}. Reviewed alerts are remembered on this device only.</span>
          </div>
        }
      />

      <section aria-label="Alert summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Bell />} label="Open alerts" value={activeAlerts.length} note={`${reviewedAlerts.length} reviewed`} tone="forest" onClick={() => setScope('open')} />
        <MetricCard icon={<Bell />} label="High severity" value={highCount} note="Act today" tone="neutral" onClick={() => { setScope('open'); setSeverity('high'); }} />
        <MetricCard icon={<Bell />} label="Medium" value={mediumCount} note="Review this week" tone="amber" onClick={() => { setScope('open'); setSeverity('medium'); }} />
        <MetricCard icon={<BellOff />} label="Device alerts" value={deviceCount} note="Pairing, offline or attention" tone="water" onClick={() => { setScope('open'); setCategory('device'); }} />
      </section>

      <Panel
        as="section"
        title={scope === 'open' ? 'Open alerts' : 'Reviewed alerts'}
        subtitle={`${visible.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl ariaLabel="Alert scope" value={scope} onChange={setScope} options={[{ value: 'open', label: `Open (${activeAlerts.length})` }, { value: 'reviewed', label: `Reviewed (${reviewedAlerts.length})` }]} />
            <SegmentedControl ariaLabel="Severity" value={severity} onChange={setSeverity} options={[{ value: 'all', label: 'Any severity' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low / info' }]} />
          </div>
        }
      >
        {categories.length > 1 && (
          <Tabs
            ariaLabel="Alert category"
            value={category}
            onChange={setCategory}
            className="mb-4"
            tabs={[{ value: 'all' as const, label: 'All', count: source.length }, ...categories.map((key) => ({ value: key, label: ALERT_CATEGORY_LABEL[key], count: source.filter((alert) => alert.category === key).length }))]}
          />
        )}
        {visible.length === 0 ? (
          <EmptyState
            compact
            icon={scope === 'open' ? <CheckCheck /> : <BellOff />}
            title={scope === 'open' ? (activeAlerts.length === 0 ? 'No open alerts' : 'No alerts match these filters') : 'No reviewed alerts'}
            description={scope === 'open' && activeAlerts.length === 0 ? 'Nothing in your records, device status or the weather outlook needs attention right now.' : undefined}
          />
        ) : (
          <ul className="grid gap-3">
            {visible.map((alert) => (
              <AlertRow key={alert.id} alert={alert} reviewedAt={acknowledged[alert.id]} onAcknowledge={() => acknowledgeAlert(alert.id)} onRestore={() => restoreAlert(alert.id)} />
            ))}
          </ul>
        )}
      </Panel>

      <Notice tone="neutral" title="Delivery channels">
        Alerts are shown in the portal header and on this page. SMS, WhatsApp and push notifications are not configured in this release — see <strong>Farm Settings</strong> for the notification preferences that will apply once a channel is connected.
      </Notice>

      <ConfirmDialog
        open={confirmAll}
        title="Mark all open alerts as reviewed?"
        description={`${activeAlerts.length} alert${activeAlerts.length === 1 ? '' : 's'} will move to the Reviewed list. Alerts reappear automatically if the underlying condition changes.`}
        confirmLabel="Mark all as reviewed"
        onConfirm={() => { acknowledgeAll(); setConfirmAll(false); }}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
};

export default AlertsPage;
