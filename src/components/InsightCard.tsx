import React, { useState } from 'react';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import type { Insight, Confidence } from '../services/insightsService';
import { Badge, Button, SeverityBadge, SourceTag, Timestamp } from './ui';

const KIND_LABEL: Record<Insight['kind'], string> = {
  crop_stress: 'Crop stress',
  irrigation: 'Irrigation',
  soil: 'Soil',
  weather: 'Weather',
  device: 'Device',
  anomaly: 'Sensor anomaly',
  crop_health: 'Crop health',
  task: 'Task',
};

const CONFIDENCE_META: Record<Confidence, { label: string; width: string; color: string }> = {
  high: { label: 'High confidence', width: '100%', color: '#387333' },
  medium: { label: 'Medium confidence', width: '62%', color: '#c78a2f' },
  low: { label: 'Low confidence', width: '30%', color: '#8a978c' },
};

export const ConfidenceMeter: React.FC<{ confidence: Confidence; note?: string; compact?: boolean }> = ({ confidence, note, compact }) => {
  const meta = CONFIDENCE_META[confidence];
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-slate-700">{meta.label}</span>
      </div>
      <div className="ap-meter mt-1.5" aria-hidden="true">
        <div className="ap-meter__fill" style={{ width: meta.width, background: meta.color }} />
      </div>
      {note && !compact && <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">{note}</p>}
    </div>
  );
};

interface InsightCardProps {
  insight: Insight;
  defaultExpanded?: boolean;
  compact?: boolean;
}

/**
 * Presents one insight with the full transparency structure:
 * observed → zone → evidence → why it matters → action → confidence → generated time.
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight, defaultExpanded = false, compact }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const severityClass = insight.severity === 'critical' || insight.severity === 'high' ? 'ap-insight--high' : insight.severity === 'medium' ? 'ap-insight--medium' : 'ap-insight--low';
  const detailsId = `insight-${insight.id}-details`;

  return (
    <article className={`ap-insight ${severityClass}`} aria-labelledby={`insight-${insight.id}-title`}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={insight.severity} size="sm" />
        <Badge tone="neutral" size="sm">{KIND_LABEL[insight.kind]}</Badge>
        <SourceTag source={insight.method} />
        <span className="ml-auto">
          <Timestamp iso={insight.generatedAt} prefix="Generated" />
        </span>
      </div>

      <div>
        <h4 id={`insight-${insight.id}-title`} className="text-sm font-bold text-slate-900 leading-snug">
          {insight.title}
        </h4>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-forest-800">
          <MapPin size={12} aria-hidden="true" />
          {insight.zoneLabel}
        </p>
        <p className="mt-2 text-xs text-slate-700 leading-relaxed">{insight.observed}</p>
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-bold text-forest-800 hover:text-forest-950"
        >
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          {expanded ? 'Hide supporting data' : 'Show supporting data & reasoning'}
        </button>
      )}

      {(expanded || compact) && (
        <div id={detailsId} className="grid gap-4">
          {insight.evidence.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Supporting data</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {insight.evidence.map((item, index) => (
                  <li key={`${item.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      {item.value}
                      <SourceTag source={item.source} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="ap-insight__grid">
            <div>
              <dt>Why it matters</dt>
              <dd>{insight.whyItMatters}</dd>
            </div>
            <div>
              <dt>Suggested action</dt>
              <dd>{insight.action}</dd>
            </div>
          </dl>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <ConfidenceMeter confidence={insight.confidence} note={insight.confidenceNote} />
            <Button variant="secondary" size="sm" to={insight.route} trailingIcon={<ArrowRight size={13} />}>
              {insight.actionLabel}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400">Rule {insight.ruleId} · decision support only, not a diagnosis or guarantee.</p>
        </div>
      )}
    </article>
  );
};
