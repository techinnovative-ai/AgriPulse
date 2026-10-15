import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bug, ClipboardList, FileSearch, Leaf, Plus, Sprout, Stethoscope } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { analyzeCropSymptoms } from '../services/diseaseService';
import { ConfidenceMeter } from '../components/InsightCard';
import type { CropRecord, DiseaseReport } from '../types';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SourceTag,
  Timestamp,
  formatRelativeTime,
  type BadgeTone,
} from '../components/ui';

const HEALTH_TONE: Record<CropRecord['healthStatus'], BadgeTone> = { Healthy: 'success', 'Watch / Mild Stress': 'warning', 'Needs Inspection': 'danger' };
const REPORT_TONE: Record<DiseaseReport['status'], BadgeTone> = { 'Possible issue': 'warning', 'Needs inspection': 'danger', 'Expert confirmed': 'info' };

const SYMPTOM_OPTIONS = ['Yellowing / chlorosis', 'Leaf spots or lesions', 'Wilting or drooping', 'Leaf curling or cupping', 'Sticky residue / honeydew', 'Stunted growth', 'Holes or chewed tissue', 'Powdery or fuzzy growth', 'Rotting stems or roots', 'Discoloured grains / fruit'];
const PART_OPTIONS = ['Older lower leaves', 'New top leaves', 'Stems', 'Roots', 'Flowers', 'Fruit / grain / pods', 'Whole plant'];

export const CropHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeFarm, plots, crops, observations, diseaseReports, addDiseaseReport, updateDiseaseReportStatus, updateCropRecord } = useAgriPulse();
  const { stressByPlot } = useFarmIntelligence();

  const farmId = activeFarm?.id;
  const farmPlots = plots.filter((plot) => plot.farmId === farmId);
  const farmCrops = useMemo(() => crops.filter((crop) => crop.farmId === farmId), [crops, farmId]);
  const farmReports = useMemo(() => diseaseReports.filter((report) => report.farmId === farmId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [diseaseReports, farmId]);
  const openReports = farmReports.filter((report) => report.status !== 'Expert confirmed');
  const symptomObservations = useMemo(
    () => observations.filter((obs) => obs.farmId === farmId && ['Visible Plant Symptoms', 'Pest Sighting', 'Leaf Color Change', 'Weather Damage'].includes(obs.category)).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [observations, farmId]
  );

  const [reportFilter, setReportFilter] = useState<'open' | 'all'>('open');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selectedReport = farmReports.find((report) => report.id === selectedReportId) || null;

  // ---- Report a crop problem (uses the existing rule-based symptom guidance service) ----
  const formOpen = searchParams.get('action') === 'report';
  const setFormOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set('action', 'report');
    else next.delete('action');
    setSearchParams(next, { replace: true });
  };
  const [cropId, setCropId] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [onset, setOnset] = useState(() => new Date().toISOString().slice(0, 10));
  const [areaPct, setAreaPct] = useState('5');
  const [description, setDescription] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const resetForm = () => {
    setCropId('');
    setSymptoms([]);
    setParts([]);
    setOnset(new Date().toISOString().slice(0, 10));
    setAreaPct('5');
    setDescription('');
    setWeatherNotes('');
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeFarm) return;
    const crop = farmCrops.find((item) => item.id === cropId);
    if (!crop) return setFormError('Choose the crop and zone the problem was seen in.');
    if (symptoms.length === 0) return setFormError('Select at least one symptom.');
    const pct = Number(areaPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return setFormError('Affected area must be between 0 and 100 percent.');
    if (description.trim().length < 10) return setFormError('Describe what you saw in at least a short sentence (10+ characters).');
    setFormError(null);
    setSubmitting(true);
    try {
      const analysis = await analyzeCropSymptoms({
        farmId: activeFarm.id,
        farmName: activeFarm.name,
        plotName: crop.plotName,
        cropName: crop.cropName,
        variety: crop.variety,
        growthStage: crop.growthStage,
        symptomCategories: symptoms,
        affectedParts: parts,
        onsetDate: onset,
        affectedAreaPct: pct,
        weatherIrrigationNotes: weatherNotes.trim(),
        farmerDescription: description.trim(),
      });
      const saved = addDiseaseReport(analysis);
      if (crop.healthStatus === 'Healthy') updateCropRecord({ ...crop, healthStatus: pct >= 8 ? 'Needs Inspection' : 'Watch / Mild Stress' });
      resetForm();
      setFormOpen(false);
      setSelectedReportId(saved.id);
    } finally {
      setSubmitting(false);
    }
  };

  const cropRows = farmCrops.map((crop) => ({ crop, stress: stressByPlot.find((item) => item.plot.id === crop.plotId), reports: openReports.filter((report) => report.plotName === crop.plotName && report.cropName === crop.cropName).length }));
  const needsInspection = farmCrops.filter((crop) => crop.healthStatus === 'Needs Inspection').length;
  const watch = farmCrops.filter((crop) => crop.healthStatus === 'Watch / Mild Stress').length;

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Crop health" icon={<Leaf size={14} />} title="Crop health" />
        <EmptyState icon={<Leaf />} title="No farm selected" actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Crop health"
        icon={<Leaf size={14} />}
        title="Crop health"
        description={`Crop records, stress assessments, symptom reports and inspection guidance for ${activeFarm.name}. Guidance is rule-based decision support — confirm with a KVK scientist or agriculture officer before treatment.`}
        actions={
          <>
            <Button size="sm" variant="secondary" to="/disease" leadingIcon={<FileSearch size={14} />}>Disease library</Button>
            <Button size="sm" onClick={() => setFormOpen(true)} leadingIcon={<Plus size={14} />} disabled={farmCrops.length === 0}>Report a crop problem</Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="saved_record" /><SourceTag source="rule_based" />
            <span>Image-based diagnosis is not available in this release; photos are kept for your own records.</span>
          </div>
        }
      />

      <section aria-label="Crop health summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Sprout />} label="Crops recorded" value={farmCrops.length} note={`${farmPlots.length} zone${farmPlots.length === 1 ? '' : 's'}`} tone="forest" />
        <MetricCard icon={<Leaf />} label="Needs inspection" value={needsInspection} note={`${watch} on watch`} tone="neutral" />
        <MetricCard icon={<Bug />} label="Open symptom reports" value={openReports.length} note={`${farmReports.length} total`} tone="amber" onClick={() => setReportFilter('open')} />
        <MetricCard icon={<ClipboardList />} label="Symptom observations" value={symptomObservations.length} note="Pest, leaf colour, damage" tone="leaf" source="manual_observation" />
      </section>

      <Panel as="section" title="Crops by zone" subtitle="Health status is what you recorded; the stress score is calculated by rule set v1." flush actions={<Button size="sm" variant="ghost" to="/farm?tab=crops">Manage crop records</Button>}>
        <DataTable
          caption="Crop records for the active farm"
          rows={cropRows}
          rowKey={(row) => row.crop.id}
          emptyMessage="No crop records yet — add crops to zones in Farms & Field Zones."
          columns={[
            { key: 'crop', header: 'Crop', render: (row) => <><span className="font-semibold text-slate-900">{row.crop.cropName}</span><br /><span className="text-[11px] text-slate-500">{row.crop.variety}</span></> },
            { key: 'zone', header: 'Zone', render: (row) => row.crop.plotName },
            { key: 'stage', header: 'Stage', render: (row) => row.crop.growthStage },
            { key: 'sowing', header: 'Sown', render: (row) => <Timestamp iso={row.crop.sowingDate} withTime={false} /> },
            { key: 'harvest', header: 'Expected harvest', render: (row) => <Timestamp iso={row.crop.expectedHarvestDate} withTime={false} /> },
            { key: 'health', header: 'Recorded health', render: (row) => <Badge tone={HEALTH_TONE[row.crop.healthStatus]} size="sm">{row.crop.healthStatus}</Badge> },
            { key: 'stress', header: 'Stress score', render: (row) => (row.stress ? <Badge tone={row.stress.level === 'high' ? 'danger' : row.stress.level === 'moderate' ? 'warning' : 'success'} size="sm">{row.stress.level} · {row.stress.score}</Badge> : <span className="text-slate-500">—</span>) },
            { key: 'reports', header: 'Open reports', numeric: true, render: (row) => row.reports },
            { key: 'actions', header: <span className="sr-only">Actions</span>, render: (row) => <Button size="sm" variant="ghost" onClick={() => navigate(`/twin?zone=${row.crop.plotId}`)}>View zone</Button> },
          ]}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <Panel
          as="section"
          title="Symptom reports"
          subtitle="Each report keeps your description and the rule-based guidance generated from it."
          actions={<SegmentedControl ariaLabel="Report filter" value={reportFilter} onChange={setReportFilter} options={[{ value: 'open', label: `Open (${openReports.length})` }, { value: 'all', label: `All (${farmReports.length})` }]} />}
        >
          {(reportFilter === 'open' ? openReports : farmReports).length === 0 ? (
            <EmptyState compact icon={<Stethoscope />} title={reportFilter === 'open' ? 'No open symptom reports' : 'No symptom reports yet'} description="When you notice spots, yellowing, wilting or pests, report it here to get structured inspection steps." actions={farmCrops.length > 0 ? <Button size="sm" onClick={() => setFormOpen(true)} leadingIcon={<Plus size={13} />}>Report a crop problem</Button> : undefined} />
          ) : (
            <ul className="grid gap-3">
              {(reportFilter === 'open' ? openReports : farmReports).map((report) => (
                <li key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{report.cropName} · {report.plotName}</p>
                      <p className="text-[11px] text-slate-500">{report.growthStage} · onset {new Date(report.onsetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {report.affectedAreaPct}% of area · reported {formatRelativeTime(report.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2"><Badge tone={REPORT_TONE[report.status]} size="sm">{report.status}</Badge><SourceTag source="rule_based" /></div>
                  </div>
                  <p className="mt-2 text-xs text-slate-700">{report.symptomCategories.join(', ')}{report.affectedParts.length ? ` — ${report.affectedParts.join(', ')}` : ''}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{report.farmerDescription}</p>
                  {report.possibleCauses.length > 0 && (
                    <p className="mt-2 text-xs text-slate-700"><span className="font-semibold">Possible causes to check:</span> {report.possibleCauses.map((cause) => cause.type).join(' · ')}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedReportId(report.id)}>View guidance</Button>
                    {report.status !== 'Expert confirmed' && (
                      <Button size="sm" variant="ghost" onClick={() => updateDiseaseReportStatus(report.id, 'Expert confirmed')}>Mark as expert confirmed</Button>
                    )}
                    {report.status === 'Possible issue' && (
                      <Button size="sm" variant="ghost" onClick={() => updateDiseaseReportStatus(report.id, 'Needs inspection')}>Escalate to inspection</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel as="aside" title="Recent symptom observations" subtitle="From your field log" flush actions={<Button size="sm" variant="ghost" to="/farm?tab=observations">All observations</Button>}>
            <DataTable
              caption="Symptom-related field observations"
              rows={symptomObservations.slice(0, 8)}
              rowKey={(row) => row.id}
              minWidth={0}
              emptyMessage="No symptom observations recorded."
              columns={[
                { key: 'when', header: 'When', render: (row) => <Timestamp iso={row.recordedAt} withTime={false} /> },
                { key: 'zone', header: 'Zone', render: (row) => row.plotName || 'Farm' },
                { key: 'cat', header: 'Category', render: (row) => row.category },
                { key: 'sev', header: 'Severity', render: (row) => <Badge tone={row.severity === 'Action Needed' ? 'danger' : row.severity === 'Watch' ? 'warning' : 'success'} size="sm">{row.severity}</Badge> },
              ]}
            />
          </Panel>

          <Panel as="aside" title="Stress assessment inputs">
            {stressByPlot.length === 0 ? (
              <p className="text-xs text-slate-600">Add crop records to see stress scoring per zone.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stressByPlot.map((assessment) => (
                  <li key={assessment.plot.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{assessment.plot.name}</span>
                      <Badge tone={assessment.level === 'high' ? 'danger' : assessment.level === 'moderate' ? 'warning' : 'success'} size="sm">{assessment.score}</Badge>
                    </div>
                    <div className="mt-2"><ConfidenceMeter confidence={assessment.confidence} note={assessment.confidenceNote} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Notice tone="warning" title="Before any spray or treatment">
            Confirm the cause with fresh plant samples at your nearest Krishi Vigyan Kendra or with a licensed plant pathologist. AgriPulse guidance never replaces label directions.
          </Notice>
        </div>
      </div>

      {/* Report form */}
      <Dialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormError(null); }}
        title="Report a crop problem"
        description="Describe what you saw. The portal applies transparent symptom rules and returns inspection steps — it does not diagnose disease."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => { setFormOpen(false); setFormError(null); }}>Cancel</Button>
            <Button type="submit" form="crop-problem-form" loading={submitting}>Generate guidance</Button>
          </>
        }
      >
        <form id="crop-problem-form" onSubmit={(event) => void handleSubmit(event)} className="grid gap-4" noValidate>
          {formError && <Notice tone="danger" role="alert">{formError}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Crop and zone" required>
              {({ id, invalid }) => (
                <select id={id} className="ap-select" value={cropId} onChange={(event) => setCropId(event.target.value)} aria-invalid={invalid} required>
                  <option value="">Select…</option>
                  {farmCrops.map((crop) => (
                    <option key={crop.id} value={crop.id}>{crop.cropName} — {crop.plotName} ({crop.growthStage})</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="First noticed" required>
              {({ id }) => <input id={id} type="date" className="ap-input" value={onset} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setOnset(event.target.value)} required />}
            </Field>
          </div>
          <fieldset>
            <legend className="ap-field__label">Symptoms seen <span className="text-red-600">*</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((option) => (
                <label key={option} className={`ap-chip ${symptoms.includes(option) ? 'is-active' : ''}`}>
                  <input type="checkbox" className="sr-only" checked={symptoms.includes(option)} onChange={() => toggle(symptoms, option, setSymptoms)} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="ap-field__label">Affected plant parts</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PART_OPTIONS.map((option) => (
                <label key={option} className={`ap-chip ${parts.includes(option) ? 'is-active' : ''}`}>
                  <input type="checkbox" className="sr-only" checked={parts.includes(option)} onChange={() => toggle(parts, option, setParts)} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Share of the zone affected (%)" required hint="Rough estimate is fine.">
              {({ id }) => <input id={id} type="number" min={0} max={100} className="ap-input" value={areaPct} onChange={(event) => setAreaPct(event.target.value)} required />}
            </Field>
            <Field label="Recent weather or irrigation notes">
              {({ id }) => <input id={id} type="text" className="ap-input" value={weatherNotes} onChange={(event) => setWeatherNotes(event.target.value)} placeholder="e.g. heavy rain 3 days ago, irrigated yesterday" />}
            </Field>
          </div>
          <Field label="What did you see?" required hint="Colour, pattern, spread, smell, insects — anything you noticed.">
            {({ id }) => <textarea id={id} className="ap-textarea" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required />}
          </Field>
        </form>
      </Dialog>

      {/* Report detail */}
      <Dialog open={Boolean(selectedReport)} onClose={() => setSelectedReportId(null)} title={selectedReport ? `${selectedReport.cropName} · ${selectedReport.plotName}` : ''} description={selectedReport ? `Reported ${formatRelativeTime(selectedReport.createdAt)} · ${selectedReport.analysisMode}` : undefined} wide>
        {selectedReport && (
          <div className="grid gap-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={REPORT_TONE[selectedReport.status]} size="md">{selectedReport.status}</Badge>
              <SourceTag source="rule_based" />
              <span className="text-xs text-slate-600">{selectedReport.affectedAreaPct}% of zone · {selectedReport.growthStage}</span>
            </div>
            <div>
              <p className="ap-section-label">Your description</p>
              <p className="mt-1 text-xs text-slate-700">{selectedReport.farmerDescription}</p>
              <p className="mt-1 text-xs text-slate-600">{selectedReport.symptomCategories.join(', ')}{selectedReport.affectedParts.length ? ` — ${selectedReport.affectedParts.join(', ')}` : ''}</p>
            </div>
            {selectedReport.possibleCauses.length > 0 ? (
              <div>
                <p className="ap-section-label">Possible causes to check</p>
                <ul className="mt-2 grid gap-3">
                  {selectedReport.possibleCauses.map((cause) => (
                    <li key={cause.name} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-900">{cause.name} <Badge tone="neutral" size="sm">{cause.type}</Badge></p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">Matching symptoms</p>
                      <ul className="list-disc pl-4 text-xs text-slate-700">{cause.matchingSymptoms.map((item) => <li key={item}>{item}</li>)}</ul>
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">How to tell it apart</p>
                      <ul className="list-disc pl-4 text-xs text-slate-700">{cause.distinguishingChecks.map((item) => <li key={item}>{item}</li>)}</ul>
                      <p className="mt-1 text-[11px] font-semibold text-slate-600">Management guidance</p>
                      <ul className="list-disc pl-4 text-xs text-slate-700">{cause.managementGuidance.map((item) => <li key={item}>{item}</li>)}</ul>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Notice tone="neutral">The symptom rules did not match a specific pattern. Use the inspection steps below and consult an expert if symptoms spread.</Notice>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="ap-section-label">Immediate inspection steps</p><ul className="mt-1 list-disc pl-4 text-xs text-slate-700">{selectedReport.immediateInspectionSteps.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><p className="ap-section-label">Alternative explanations</p><ul className="mt-1 list-disc pl-4 text-xs text-slate-700">{selectedReport.alternativeExplanations.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><p className="ap-section-label">Preventive guidance</p><ul className="mt-1 list-disc pl-4 text-xs text-slate-700">{selectedReport.preventiveGuidance.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><p className="ap-section-label">When to consult an expert</p><ul className="mt-1 list-disc pl-4 text-xs text-slate-700">{selectedReport.whenToConsultExpert.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
            {selectedReport.expertNotes && <Notice tone="info" title="Expert notes">{selectedReport.expertNotes}</Notice>}
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {selectedReport.status !== 'Expert confirmed' && <Button size="sm" variant="secondary" onClick={() => updateDiseaseReportStatus(selectedReport.id, 'Expert confirmed')}>Mark as expert confirmed</Button>}
              <Button size="sm" variant="ghost" to={`/disease`} leadingIcon={<FileSearch size={13} />}>Search disease library</Button>
              <Button size="sm" variant="ghost" to="/farm?tab=observations&action=new" leadingIcon={<ClipboardList size={13} />}>Record follow-up observation</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default CropHealthPage;
