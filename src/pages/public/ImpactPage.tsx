import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section } from '../../components/public/PublicSections';
import { IMPACT_POINTS } from '../../data/publicContent';

export const ImpactPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="Innovation & impact"
      title="Earlier, clearer decisions for smallholder farms"
      lead="Crop stress is usually visible only after yield is already lost. AgriPulse closes the gap between field visits with a twin that works from records first and sensors second — and refuses to dress up estimates as measurements."
      actions={<Button to="/roadmap" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Roadmap</Button>}
    />

    <Section eyebrow="The problem" title="Why early detection is hard on real farms">
      <div className="public-grid public-grid--3">
        <FeatureCard title="Stress is silent at first" text="Moisture deficit, heat and humidity-driven disease pressure build for days before leaves show it. By then the response is more expensive." />
        <FeatureCard title="Sensors arrive slowly" text="Hardware budgets and connectivity lag behind need. Tools that only work with full sensor coverage are not used." iconTone="amber" />
        <FeatureCard title="Advice is hard to trust" text="Dashboards that fill gaps with sample values or unexplained AI scores lose credibility the first time they are wrong." iconTone="water" />
      </div>
    </Section>

    <Section alt eyebrow="Our approach" title="What is different">
      <div className="public-grid public-grid--2">
        {IMPACT_POINTS.map((item) => (
          <FeatureCard key={item.title} title={item.title} text={item.text} />
        ))}
      </div>
    </Section>

    <Section eyebrow="Target outcomes" title="What we will measure in pilots" intro="These are the outcomes the pilot phase is designed to test. They are goals, not claims — no field results are published yet.">
      <div className="public-grid public-grid--4">
        <FeatureCard title="Irrigation timing" text="Share of irrigation events that fall inside the recommended window versus the farmer's previous practice." />
        <FeatureCard title="Days to first action" text="Time between the first stress signal and the farmer's recorded response." />
        <FeatureCard title="Water applied per zone" text="Recorded irrigation events and durations per zone and season." iconTone="water" />
        <FeatureCard title="Advice accepted" text="How often guidance is acted on, and how often it is overridden — both are logged." iconTone="amber" />
      </div>
    </Section>

    <CtaBand title="Interested in a pilot?" text="We are looking for farms, FPOs and KVKs willing to record outcomes alongside telemetry so the next phase of models can be validated honestly." primary={{ label: 'Contact us', to: '/contact' }} secondary={{ label: 'Roadmap', to: '/roadmap' }} />
  </>
);

export default ImpactPage;
