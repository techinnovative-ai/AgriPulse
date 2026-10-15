import React from 'react';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section } from '../../components/public/PublicSections';
import { GITHUB_REPO_URL } from '../../data/publicContent';

export const AboutPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="About"
      title="AgriPulse"
      lead="AgriPulse is an Intelligent Farm Digital Twin & Early Crop-Stress Detection System developed in the open. Its purpose is simple: give farmers an honest, connected view of their fields and clear next steps — before stress turns into loss."
      actions={<Button href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" variant="on-dark" leadingIcon={<Github size={16} />}>Project on GitHub</Button>}
    />

    <Section eyebrow="Mission" title="See More. Predict Earlier. Grow Smarter.">
      <div className="public-grid public-grid--3">
        <FeatureCard title="See more" text="Bring zones, crops, observations, devices and weather into one twin so nothing important hides in a notebook or a separate app." />
        <FeatureCard title="Predict earlier" text="Apply transparent agronomic rules today and validated models tomorrow to surface stress before it is visible." iconTone="amber" />
        <FeatureCard title="Grow smarter" text="Turn every signal into a labelled, explainable recommendation the farmer can accept, adapt or reject." iconTone="water" />
      </div>
    </Section>

    <Section alt eyebrow="Values" title="How we work">
      <div className="public-grid public-grid--4">
        <FeatureCard title="Farmer first" text="The Farmer Portal is the product. Everything else — public site, seller portal, device tooling — exists to serve it." />
        <FeatureCard title="Honest data" text="Measured, recorded, estimated, demo and rule-based are different things and are labelled differently, always." />
        <FeatureCard title="Open development" text="Source, API contracts, firmware protocol and verification notes are public so partners can inspect and contribute." />
        <FeatureCard title="Accessible by default" text="Keyboard navigation, readable contrast, text alternatives to maps and charts, and plain language throughout." />
      </div>
    </Section>

    <Section eyebrow="Project" title="Who is behind it" intro="AgriPulse is maintained by the TechInnovative AI team on GitHub. Contributions from agronomists, firmware engineers and farmer organisations are welcome through the repository.">
      <div className="mt-6 flex flex-wrap gap-2">
        <Button href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" variant="secondary" leadingIcon={<Github size={14} />}>techinnovative-ai/AgriPulse</Button>
        <Button to="/contact" variant="ghost" trailingIcon={<ArrowRight size={14} />}>Contact</Button>
      </div>
    </Section>

    <CtaBand title="Try the Farmer Portal" text="Create an account and explore the modules with your own records or the labelled demo workspace." />
  </>
);

export default AboutPage;
