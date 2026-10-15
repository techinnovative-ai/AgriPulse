import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section, StatusPill } from '../../components/public/PublicSections';
import { AI_CAPABILITIES } from '../../data/publicContent';

const STRESS_FACTORS = [
  { factor: 'Soil-moisture deficit below the crop band', points: 'up to 40', source: 'Sensor or recorded moisture' },
  { factor: 'Soil moisture above the crop band (waterlogging risk)', points: '20', source: 'Sensor or recorded moisture' },
  { factor: 'Heat: air ≥ 38 °C measured (≥ 42 °C scores higher) or forecast max ≥ 38 °C', points: '10–25', source: 'Sensor or weather provider' },
  { factor: 'Humidity ≥ 85 % with 18–32 °C (fungal pressure)', points: '15', source: 'Sensor or weather provider' },
  { factor: 'Observation severity in the last 10 days (Watch / Action Needed)', points: '10 / 25', source: 'Farmer recorded' },
  { factor: 'Waterlogged standing-water observation', points: '15', source: 'Farmer recorded' },
  { factor: 'Recorded crop health (Watch / Needs Inspection)', points: '8 / 15', source: 'Crop record' },
  { factor: 'Open symptom report for the zone', points: '15', source: 'Crop health' },
];

export const AiCapabilitiesPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="AI capabilities"
      title="Transparent rules first, learned models when the data earns them"
      lead="This release ships a readable rule engine (rule set v1). Every insight states what was observed, which zone, the supporting data, why it matters, the suggested action, its confidence and when it was generated. Machine-learning capabilities are listed as planned and are never presented as working."
      actions={<Button to="/farmer/signup" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>See insights on your farm</Button>}
    />

    <Section eyebrow="Capability map" title="What is available now, partially, or planned">
      <div className="public-grid public-grid--3">
        {AI_CAPABILITIES.map((item) => (
          <FeatureCard
            key={item.title}
            title={item.title}
            text={item.what}
            bullets={[`Inputs: ${item.inputs}`, `Limits: ${item.limits}`]}
            meta={<StatusPill status={item.status} />}
          />
        ))}
      </div>
    </Section>

    <Section alt eyebrow="Inside the stress score" title="How a zone's stress score is built" intro="Factors add up to a 0–100 score: below 30 is low, 30–59 moderate, 60 and above high. Each factor is shown with its data source in the portal.">
      <div className="public-table-wrap">
        <table className="public-table">
          <thead><tr><th scope="col">Factor</th><th scope="col">Points</th><th scope="col">Data source</th></tr></thead>
          <tbody>
            {STRESS_FACTORS.map((row) => (
              <tr key={row.factor}><td>{row.factor}</td><td>{row.points}</td><td>{row.source}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="public-grid public-grid--3">
        <FeatureCard title="High confidence" text="A fresh sensor reading from the zone drives the score." />
        <FeatureCard title="Medium confidence" text="The score relies on farmer-recorded values from the last ten days." iconTone="amber" />
        <FeatureCard title="Low confidence" text="Inputs are old or missing; treat the score as a reminder to check the field." />
      </div>
    </Section>

    <Section eyebrow="Labels" title="Measured, rule-based, forecast and planned are never mixed">
      <div className="public-grid public-grid--4">
        <FeatureCard title="Physical sensor" text="Authenticated telemetry from a paired node, with timestamp and staleness check." />
        <FeatureCard title="Farmer recorded" text="Values you logged during a field visit; used immediately and labelled." iconTone="amber" />
        <FeatureCard title="Weather provider" text="Forecast and estimates, including rainfall, from the named provider or a labelled demo fallback." iconTone="water" />
        <FeatureCard title="Rule-based" text="A conclusion from rule set v1 with its rule ID, evidence list and confidence." />
      </div>
    </Section>

    <CtaBand title="Read the reasoning behind every recommendation" text="Open AI Insights in the portal to see the evidence list, rule ID and confidence for each item — nothing is a black box." />
  </>
);

export default AiCapabilitiesPage;
