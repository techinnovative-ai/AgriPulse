import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Legend, SegmentedControl } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section } from '../../components/public/PublicSections';
import { FarmTwinMap, MOISTURE_FILL, STRESS_FILL, type TwinOverlay, type TwinZone } from '../../components/FarmTwinMap';
import type { FarmPlot, IoTDevice } from '../../types';

/* Sample zones used only to illustrate the twin on the public site. Clearly labelled as a sample. */
const sampleFarmId = 'sample-farm';
const plot = (id: string, name: string, area: number, soilType: string, irrigationMethod: string): FarmPlot => ({ id, farmId: sampleFarmId, name, area, areaUnit: 'acre', soilType, irrigationMethod });
const device = (id: string, name: string, plotId: string, status: IoTDevice['status']): IoTDevice => ({
  id,
  ownerUserId: 'sample',
  farmId: sampleFarmId,
  plotId,
  name,
  type: 'sensor_node',
  status,
  locationLabel: '',
  isDemoRecord: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const SAMPLE_ZONES: TwinZone[] = [
  { plot: plot('z1', 'North Paddy Block', 3.2, 'Clay loam', 'Flood'), crop: undefined, stress: undefined, irrigation: undefined, devices: [device('d1', 'Node A', 'z1', 'pending_pairing')], alertCount: 1 },
  { plot: plot('z2', 'East Wheat Field', 2.4, 'Sandy loam', 'Sprinkler'), crop: undefined, stress: undefined, irrigation: undefined, devices: [], alertCount: 0 },
  { plot: plot('z3', 'Vegetable Plot', 1.1, 'Loam', 'Drip'), crop: undefined, stress: undefined, irrigation: undefined, devices: [device('d2', 'Node B', 'z3', 'pending_pairing')], alertCount: 0 },
  { plot: plot('z4', 'Orchard Strip', 0.8, 'Loam', 'Drip'), crop: undefined, stress: undefined, irrigation: undefined, devices: [], alertCount: 0 },
];

export const DigitalTwinPage: React.FC = () => {
  const [overlay, setOverlay] = useState<TwinOverlay>('devices');
  const [selected, setSelected] = useState<string | null>('z1');

  return (
    <>
      <PageHero
        compact
        eyebrow="Digital farm twin"
        title="Your farm as a connected, selectable model"
        lead="The twin draws every field zone in proportion to its recorded area and layers crop stress, irrigation guidance, crops and device status on top. Select a zone to see its measurements, devices, open alerts and recommended actions — the same data the rest of the portal uses."
        actions={
          <>
            <Button to="/farmer/signup" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Build your twin</Button>
            <Button to="/ai-capabilities" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">How stress is scored</Button>
          </>
        }
      />

      <Section eyebrow="Interactive sample" title="Try the zone map" intro="This sample farm has four zones and two registered sensor nodes that have not paired yet — exactly how a new farm looks before telemetry arrives. Zones are keyboard-selectable.">
        <div className="public-card mt-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="public-status public-status--partial">Sample farm · illustrative</span>
            <SegmentedControl ariaLabel="Overlay" value={overlay} onChange={setOverlay} options={[{ value: 'stress', label: 'Crop stress' }, { value: 'moisture', label: 'Irrigation' }, { value: 'crop', label: 'Crops' }, { value: 'devices', label: 'Devices' }]} />
          </div>
          <FarmTwinMap zones={SAMPLE_ZONES} unassignedDevices={[]} overlay={overlay} selectedPlotId={selected} onSelect={setSelected} farmName="Sample farm" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Legend
              items={
                overlay === 'stress'
                  ? [{ label: 'Low', color: STRESS_FILL.low }, { label: 'Moderate', color: STRESS_FILL.moderate }, { label: 'High', color: STRESS_FILL.high }, { label: 'Not assessed (no crop record)', color: STRESS_FILL.none }]
                  : overlay === 'moisture'
                    ? [{ label: 'Irrigate now', color: MOISTURE_FILL.irrigate_now }, { label: 'Adequate', color: MOISTURE_FILL.adequate }, { label: 'No data', color: MOISTURE_FILL.no_data }]
                    : overlay === 'crop'
                      ? [{ label: 'No crop recorded', color: '#dde4d8' }]
                      : [{ label: 'Pending pairing', color: '#c78a2f', shape: 'dot' }, { label: 'Online', color: '#387333', shape: 'dot' }]
              }
            />
            <span className="text-[12px] text-slate-500">{selected ? `Selected: ${SAMPLE_ZONES.find((zone) => zone.plot.id === selected)?.plot.name}` : 'No zone selected'} · In the portal the side panel shows measurements, devices, alerts and guidance.</span>
          </div>
        </div>
      </Section>

      <Section alt eyebrow="What the twin shows" title="Four overlays, one source of truth">
        <div className="public-grid public-grid--4">
          <FeatureCard title="Crop stress" text="Rule-based stress level per zone (low, moderate, high) with the score and contributing factors in the side panel." />
          <FeatureCard title="Irrigation" text="Irrigate now, soon, adequate, hold for rain or too wet, from the freshest soil-moisture value and the crop's target band." iconTone="water" />
          <FeatureCard title="Crops" text="Which crop and growth stage is recorded in each zone, so the map doubles as a season plan." />
          <FeatureCard title="Devices" text="Sensor nodes and gateways placed in their zones with server-derived status: online, offline, pending pairing or attention required." iconTone="amber" />
        </div>
      </Section>

      <Section eyebrow="Honest representation" title="Schematic today, geospatial later" intro="The twin is a connected representation of your records, not a satellite map.">
        <div className="public-grid public-grid--3">
          <FeatureCard title="Proportional, not GPS" text="Zone sizes follow the area you recorded; positions are arranged automatically. GPS-accurate boundaries are on the roadmap." />
          <FeatureCard title="Live only when paired" text="Device markers show server-derived status. Zones without reporting sensors show recorded values, clearly labelled, or 'no data'." />
          <FeatureCard title="Accessible alternative" text="A zone list with the same information sits under the map and is fully usable with a keyboard or screen reader." />
        </div>
      </Section>

      <CtaBand title="Build the twin from your own zones" text="Add a farm and its zones; the twin appears immediately with crop, stress and irrigation overlays." />
    </>
  );
};

export default DigitalTwinPage;
