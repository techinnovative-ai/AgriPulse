import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, PageHero, Section, StatusPill } from '../../components/public/PublicSections';
import { ROADMAP } from '../../data/publicContent';

export const RoadmapPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="Roadmap"
      title="Where AgriPulse is today and what comes next"
      lead="Phases are ordered by what the data allows. Learned models come only after pilot farms have recorded enough outcomes to validate them."
      actions={<Button to="/contact" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Join a pilot</Button>}
    />

    <Section eyebrow="Phases" title="Delivery plan">
      <ol className="public-timeline">
        {ROADMAP.map((phase) => (
          <li key={phase.phase} className="public-timeline__item">
            <div>
              <StatusPill status={phase.status} />
              <p className="mt-2 text-[12px] font-semibold text-slate-500">{phase.when}</p>
            </div>
            <div>
              <h3>{phase.phase}</h3>
              <ul>
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </Section>

    <Section alt eyebrow="Principles" title="Rules for adding features" intro="Every item on the roadmap has to pass the same tests as the current release.">
      <ul className="public-grid public-grid--3" style={{ listStyle: 'none', padding: 0 }}>
        <li className="public-card"><h3>Label before launch</h3><p>A new data source ships with its source label and empty state, or it does not ship.</p></li>
        <li className="public-card"><h3>Validate before predicting</h3><p>No model output appears in the portal until it has been compared with recorded outcomes from pilot farms.</p></li>
        <li className="public-card"><h3>Same design system</h3><p>New modules reuse the shared components and navigation; no module gets its own template.</p></li>
      </ul>
    </Section>

    <CtaBand title="Help shape the next phase" text="Pilot partners, firmware contributors and agronomists are welcome. The repository is open." primary={{ label: 'Contact', to: '/contact' }} secondary={{ label: 'Technology', to: '/technology' }} />
  </>
);

export default RoadmapPage;
