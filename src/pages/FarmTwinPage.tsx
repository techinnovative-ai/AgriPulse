import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ClipboardList, Cpu, Droplets, Layers, Map as MapIcon, Sprout, ThermometerSun } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { FarmTwinMap, MOISTURE_FILL, STRESS_FILL, CROP_PALETTE, type TwinOverlay, type TwinZone } from '../components/FarmTwinMap';
import { ConfidenceMeter } from '../components/InsightCard';
import { CHANNEL_META, formatChannelValue, summarizeByChannel, type ChannelSnapshot } from '../services/telemetryService';
import type { IoTDevice } from '../types';
import {
  Badge,
  Button,
  DeviceStatusPill,
  EmptyState,
  KeyValueList,
  Legend,
  Notice,
  PageHeader,
  Panel,
  SegmentedControl,
  SeverityBadge,
  SourceTag,
  Timestamp,
  formatRelativeTime,
} from '../components/ui';

const OVERLAY_OPTIONS: { value: TwinOverlay; label: string }[] = [
  { value: 'stress', label: 'Crop stress' },
  { value: 'moisture', label: 'Irrigation' },
  { value: 'crop', label: 'Crops' },
  { value: 'devices', label: 'Devices' },
];

const IRRIGATION_LABEL: Record<string, string> = {
  irrigate_now: 'Irrigate now',
  irrigate_soon: 'Irrigate soon',
  adequate: 'Adequate',
  hold_rain: 'Hold — rain expected',
  too_wet: 'Too wet',
  no_data: 'No moisture data',
};

const HEALTH_TONE = { Healthy: 'success', 'Watch / Mild Stress': 'warning', 'Needs Inspection': 'danger' } as const;

export const FarmTwinPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeFarm, plots, crops, devices, observations } = useAgriPulse();
  const { stressByPlot, irrigationByPlot, activeAlerts, insights, telemetry } = useFarmIntelligence();

  const [overlay, setOverlay] = useState<TwinOverlay>('stress');
  const selectedPlotId = searchParams.get('zone');
  const setSelectedPlotId = (plotId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (plotId) next.set('zone', plotId);
    else next.delete('zone');
    setSearchParams(next, { replace: true });
  };

  const farmId = activeFarm?.id;
  const farmPlots = useMemo(() => plots.filter((plot) => plot.farmId === farmId), [plots, farmId]);
  const farmDevices = useMemo(() => devices.filter((device) => device.farmId === farmId && device.status !== 'retired'), [devices, farmId]);

  const zones: TwinZone[] = useMemo(
    () =>
      farmPlots.map((plot) => ({
        plot,
        crop: crops.find((crop) => crop.plotId === plot.id) || (plot.currentCropId ? crops.find((crop) => crop.id === plot.currentCropId) : undefined),
        stress: stressByPlot.find((item) => item.plot.id === plot.id),
        irrigation: irrigationByPlot.find((item) => item.plot.id === plot.id),
        devices: farmDevices.filter((device) => device.plotId === plot.id),
        alertCount: activeAlerts.filter((alert) => alert.plotId === plot.id).length,
      })),
    [farmPlots, crops, stressByPlot, irrigationByPlot, farmDevices, activeAlerts]
  );
  const unassignedDevices = farmDevices.filter((device) => !device.plotId || !farmPlots.some((plot) => plot.id === device.plotId));

  useEffect(() => {
    if (selectedPlotId && !farmPlots.some((plot) => plot.id === selectedPlotId)) setSelectedPlotId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlotId, farmPlots]);

  const selected = zones.find((zone) => zone.plot.id === selectedPlotId) || null;

  const selectedSnapshots: { snapshot: ChannelSnapshot; device: IoTDevice }[] = useMemo(() => {
    if (!selected) return [];
    return selected.devices.flatMap((device) => summarizeByChannel(telemetry.byDevice[device.id]?.readings || [], device).map((snapshot) => ({ snapshot, device })));
  }, [selected, telemetry.byDevice]);

  const selectedObservation = useMemo(() => {
    if (!selected) return null;
    return observations
      .filter((obs) => obs.plotId === selected.plot.id && (typeof obs.soilMoisturePct === 'number' || typeof obs.soilTempC === 'number'))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0] || null;
  }, [selected, observations]);

  const selectedInsights = selected ? insights.filter((insight) => insight.plotId === selected.plot.id) : [];
  const selectedAlerts = selected ? activeAlerts.filter((alert) => alert.plotId === selected.plot.id) : [];

  const legendItems = useMemo(() => {
    if (overlay === 'stress') {
      return [
        { label: 'Low stress', color: STRESS_FILL.low },
        { label: 'Moderate stress', color: STRESS_FILL.moderate },
        { label: 'High stress', color: STRESS_FILL.high },
        { label: 'Not assessed', color: STRESS_FILL.none },
      ];
    }
    if (overlay === 'moisture') {
      return [
        { label: 'Irrigate now', color: MOISTURE_FILL.irrigate_now },
        { label: 'Irrigate soon', color: MOISTURE_FILL.irrigate_soon },
        { label: 'Adequate', color: MOISTURE_FILL.adequate },
        { label: 'Hold — rain expected', color: MOISTURE_FILL.hold_rain },
        { label: 'Too wet', color: MOISTURE_FILL.too_wet },
        { label: 'No data', color: MOISTURE_FILL.no_data },
      ];
    }
    if (overlay === 'crop') {
      const names = Array.from(new Set(zones.map((zone) => zone.crop?.cropName).filter(Boolean))) as string[];
      return [...names.map((name, index) => ({ label: name, color: CROP_PALETTE[index % CROP_PALETTE.length] })), { label: 'No crop recorded', color: '#dde4d8' }];
    }
    return [
      { label: 'Online node', color: '#387333', shape: 'dot' as const },
      { label: 'Pending pairing / gateway', color: '#c78a2f', shape: 'dot' as const },
      { label: 'Offline', color: '#8a978c', shape: 'dot' as const },
      { label: 'Needs attention', color: '#c84e48', shape: 'dot' as const },
    ];
  }, [overlay, zones]);

  const stressCounts = {
    high: zones.filter((zone) => zone.stress?.level === 'high').length,
    moderate: zones.filter((zone) => zone.stress?.level === 'moderate').length,
    low: zones.filter((zone) => zone.stress?.level === 'low').length,
  };
  const onlineDevices = farmDevices.filter((device) => device.status === 'online').length;
  const zoneArea = farmPlots.reduce((sum, plot) => sum + (plot.area || 0), 0);

  if (!activeFarm) {
    return (
      <div className="dashboard-page space-y-6">
        <PageHeader eyebrow="Digital farm twin" icon={<MapIcon size={14} />} title="Digital Farm Twin" />
        <EmptyState icon={<MapIcon />} title="No farm selected" description="Create a farm with at least one field zone to build its twin." actions={<Button to="/farm">Open Farms & Field Zones</Button>} />
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Digital farm twin"
        icon={<MapIcon size={14} />}
        title={`${activeFarm.name} — zone twin`}
        description="A connected view of your field zones, crops, devices and current guidance. Select a zone on the map or in the list to see its measurements, device status, open alerts and recommended actions."
        actions={
          <>
            <Button variant="secondary" size="sm" to="/farm?tab=farms" leadingIcon={<Layers size={14} />}>Manage zones</Button>
            <Button size="sm" to="/monitoring" trailingIcon={<ArrowRight size={14} />}>Open live monitoring</Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <Badge tone="neutral" size="sm">Schematic layout</Badge>
            <span>Zone sizes follow recorded area ({zoneArea} of {activeFarm.totalArea} {activeFarm.areaUnit} allocated). Positions are illustrative, not GPS.</span>
            <span>·</span>
            <span>Live status appears only for paired devices.</span>
          </div>
        }
      />

      {farmPlots.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="This farm has no field zones yet"
          description="Add zones (plots) with their area, soil type and irrigation method. The twin, irrigation guidance and stress assessment all work per zone."
          actions={<Button to="/farm?tab=farms" leadingIcon={<Layers size={14} />}>Add a field zone</Button>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <Panel
            as="section"
            title="Zone map"
            subtitle={`Overlay: ${OVERLAY_OPTIONS.find((option) => option.value === overlay)?.label}`}
            actions={<SegmentedControl ariaLabel="Map overlay" value={overlay} onChange={setOverlay} options={OVERLAY_OPTIONS} />}
          >
            <FarmTwinMap zones={zones} unassignedDevices={unassignedDevices} overlay={overlay} selectedPlotId={selectedPlotId} onSelect={setSelectedPlotId} farmName={activeFarm.name} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Legend items={legendItems} />
              <span className="text-[11px] text-slate-500">Red counters mark zones with open alerts. Use Tab and Enter to select zones with a keyboard.</span>
            </div>
          </Panel>

          <Panel as="aside" title={selected ? selected.plot.name : 'Farm overview'} subtitle={selected ? `${selected.plot.area} ${selected.plot.areaUnit} · ${selected.plot.soilType} · ${selected.plot.irrigationMethod}` : `${activeFarm.village}, ${activeFarm.district}, ${activeFarm.state}`} actions={selected ? <Button variant="ghost" size="sm" onClick={() => setSelectedPlotId(null)}>Clear</Button> : undefined}>
            {!selected ? (
              <div className="space-y-4">
                <KeyValueList
                  items={[
                    { label: 'Field zones', value: `${farmPlots.length}` },
                    { label: 'Crops recorded', value: `${crops.filter((crop) => crop.farmId === farmId).length}` },
                    { label: 'Devices', value: `${farmDevices.length} (${onlineDevices} online)` },
                    { label: 'Open alerts', value: `${activeAlerts.length}` },
                    { label: 'Stress (high / moderate / low)', value: `${stressCounts.high} / ${stressCounts.moderate} / ${stressCounts.low}` },
                    { label: 'Water source', value: activeFarm.waterSource || '—' },
                  ]}
                />
                <Notice tone="neutral">Select a zone to see its measurements, devices, alerts and guidance. Assessments are rule-based and update whenever you record observations or sensors report.</Notice>
              </div>
            ) : (
              <div className="space-y-5">
                <section aria-labelledby="twin-crop">
                  <h4 id="twin-crop" className="ap-section-label">Crop</h4>
                  {selected.crop ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Sprout size={15} className="text-forest-800" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-900">{selected.crop.cropName}</span>
                      <span className="text-xs text-slate-600">{selected.crop.variety} · {selected.crop.growthStage}</span>
                      <Badge tone={HEALTH_TONE[selected.crop.healthStatus]} size="sm">{selected.crop.healthStatus}</Badge>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">No crop recorded for this zone. <button type="button" className="font-semibold text-forest-800 underline" onClick={() => navigate('/farm?tab=farms')}>Add crop record</button></p>
                  )}
                </section>

                <section aria-labelledby="twin-measurements">
                  <h4 id="twin-measurements" className="ap-section-label">Current measurements</h4>
                  {selectedSnapshots.length > 0 ? (
                    <ul className="mt-2 grid gap-1.5">
                      {selectedSnapshots.map(({ snapshot, device }) => (
                        <li key={`${device.id}-${snapshot.channel}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                          <span className="text-slate-600">{CHANNEL_META[snapshot.channel].label}</span>
                          <span className="flex items-center gap-2 font-semibold text-slate-900">
                            {formatChannelValue(snapshot.channel, snapshot.latest.value)}
                            {snapshot.isStale && <Badge tone="warning" size="sm">Stale</Badge>}
                            <SourceTag source="physical_sensor" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">
                      {selected.devices.length ? 'Sensor nodes are assigned but have not reported yet — waiting for readings.' : 'No sensor node is assigned to this zone.'}
                    </p>
                  )}
                  {selectedObservation && (
                    <div className="mt-2 rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">Latest farmer-recorded values</span>
                        <SourceTag source={selectedObservation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation'} />
                      </div>
                      <p className="mt-1 text-slate-700">
                        {typeof selectedObservation.soilMoisturePct === 'number' && <>Soil moisture {selectedObservation.soilMoisturePct}% </>}
                        {typeof selectedObservation.soilTempC === 'number' && <>· Soil temp {selectedObservation.soilTempC} °C </>}
                        · {formatRelativeTime(selectedObservation.recordedAt)}
                      </p>
                    </div>
                  )}
                </section>

                <section aria-labelledby="twin-stress">
                  <h4 id="twin-stress" className="ap-section-label">Crop stress assessment</h4>
                  {selected.stress ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">Score {selected.stress.score}/100</span>
                        <Badge tone={selected.stress.level === 'high' ? 'danger' : selected.stress.level === 'moderate' ? 'warning' : 'success'} size="sm">{selected.stress.level} stress</Badge>
                        <SourceTag source="rule_based" />
                      </div>
                      <div className="ap-meter" aria-hidden="true"><div className="ap-meter__fill" style={{ width: `${selected.stress.score}%`, background: selected.stress.level === 'high' ? '#c84e48' : selected.stress.level === 'moderate' ? '#c78a2f' : '#387333' }} /></div>
                      {selected.stress.factors.length > 0 ? (
                        <ul className="grid gap-1 text-xs text-slate-700">
                          {selected.stress.factors.map((factor) => (
                            <li key={factor.label} className="flex items-start justify-between gap-2">
                              <span>{factor.label} <span className="text-slate-500">— {factor.detail}</span></span>
                              <span className="shrink-0 font-semibold">+{factor.points}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600">No stress factors detected from current records.</p>
                      )}
                      <ConfidenceMeter confidence={selected.stress.confidence} note={selected.stress.confidenceNote} />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">Not assessed — add a crop record to enable stress scoring.</p>
                  )}
                </section>

                <section aria-labelledby="twin-irrigation">
                  <h4 id="twin-irrigation" className="ap-section-label">Irrigation guidance</h4>
                  {selected.irrigation ? (
                    <div className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                      <Droplets size={15} className="mt-0.5 shrink-0 text-water-600" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-slate-900">{IRRIGATION_LABEL[selected.irrigation.status]}</p>
                        <p className="mt-0.5">{selected.irrigation.headline}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">No guidance — add a crop record first.</p>
                  )}
                </section>

                <section aria-labelledby="twin-devices">
                  <h4 id="twin-devices" className="ap-section-label">Devices in this zone</h4>
                  {selected.devices.length ? (
                    <ul className="mt-2 grid gap-1.5">
                      {selected.devices.map((device) => (
                        <li key={device.id}>
                          <button type="button" onClick={() => navigate(`/devices/${device.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-forest-300">
                            <span className="flex items-center gap-2 font-semibold text-slate-900"><Cpu size={13} aria-hidden="true" />{device.name}</span>
                            <span className="flex items-center gap-2"><DeviceStatusPill status={device.status} /><Timestamp iso={device.lastSeenAt} fallback="Never seen" withTime={false} /></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">No devices assigned. <button type="button" className="font-semibold text-forest-800 underline" onClick={() => navigate('/devices')}>Assign a sensor node</button></p>
                  )}
                </section>

                {(selectedAlerts.length > 0 || selectedInsights.length > 0) && (
                  <section aria-labelledby="twin-actions">
                    <h4 id="twin-actions" className="ap-section-label">Alerts & recommendations</h4>
                    <ul className="mt-2 grid gap-1.5">
                      {selectedAlerts.map((alert) => (
                        <li key={alert.id} className="rounded-lg border border-red-200/70 bg-red-50/40 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2"><AlertTriangle size={13} className="text-red-600" aria-hidden="true" /><SeverityBadge severity={alert.severity} size="sm" /><span className="font-semibold text-slate-900">{alert.title}</span></div>
                          <p className="mt-1 text-slate-700">{alert.nextStep}</p>
                        </li>
                      ))}
                      {selectedInsights.filter((insight) => !selectedAlerts.some((alert) => alert.id === `insight:${insight.id}`)).slice(0, 4).map((insight) => (
                        <li key={insight.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                          <div className="flex items-center gap-2"><SeverityBadge severity={insight.severity} size="sm" /><span className="font-semibold text-slate-900">{insight.title}</span></div>
                          <p className="mt-1 text-slate-700">{insight.action}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <Button size="sm" variant="secondary" to="/farm?tab=observations&action=new" leadingIcon={<ClipboardList size={14} />}>Record observation</Button>
                  <Button size="sm" variant="ghost" to="/irrigation" leadingIcon={<Droplets size={14} />}>Irrigation</Button>
                  <Button size="sm" variant="ghost" to="/crop-health" leadingIcon={<ThermometerSun size={14} />}>Crop health</Button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {farmPlots.length > 0 && (
        <Panel as="section" title="Zone list" subtitle="Accessible alternative to the map — the same information per zone, selectable with a keyboard or screen reader." flush>
          <div className="overflow-x-auto">
            <table className="ap-table" aria-label="Field zones">
              <caption className="sr-only">Field zones with crop, stress, irrigation guidance and devices</caption>
              <thead>
                <tr>
                  <th scope="col">Zone</th>
                  <th scope="col">Crop</th>
                  <th scope="col">Stress</th>
                  <th scope="col">Irrigation</th>
                  <th scope="col">Devices</th>
                  <th scope="col">Alerts</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.plot.id} className={zone.plot.id === selectedPlotId ? 'is-selected' : undefined}>
                    <td><span className="font-semibold text-slate-900">{zone.plot.name}</span><br /><span className="text-[11px] text-slate-500">{zone.plot.area} {zone.plot.areaUnit} · {zone.plot.soilType}</span></td>
                    <td>{zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : <span className="text-slate-500">None</span>}</td>
                    <td>{zone.stress ? <Badge tone={zone.stress.level === 'high' ? 'danger' : zone.stress.level === 'moderate' ? 'warning' : 'success'} size="sm">{zone.stress.level} · {zone.stress.score}</Badge> : <span className="text-slate-500">Not assessed</span>}</td>
                    <td>{zone.irrigation ? IRRIGATION_LABEL[zone.irrigation.status] : <span className="text-slate-500">—</span>}</td>
                    <td>{zone.devices.length ? `${zone.devices.length} (${zone.devices.filter((d) => d.status === 'online').length} online)` : <span className="text-slate-500">None</span>}</td>
                    <td>{zone.alertCount ? <Badge tone="danger" size="sm">{zone.alertCount}</Badge> : <span className="text-slate-500">0</span>}</td>
                    <td className="text-right"><Button size="sm" variant={zone.plot.id === selectedPlotId ? 'primary' : 'outline'} onClick={() => setSelectedPlotId(zone.plot.id)} aria-pressed={zone.plot.id === selectedPlotId}>{zone.plot.id === selectedPlotId ? 'Selected' : 'Select zone'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default FarmTwinPage;
