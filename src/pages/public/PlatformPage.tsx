import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section, StatusPill } from '../../components/public/PublicSections';
import { PORTAL_MODULES, SENSOR_CHANNELS } from '../../data/publicContent';

export const PlatformPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="Platform"
      title="The Farmer Portal, module by module"
      lead="Every module reads from the same farm workspace — zones, crops, observations, devices, telemetry and weather — so numbers match wherever you look. Status labels below describe this release honestly."
      actions={
        <>
          <Button to="/farmer/signup" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Create farmer account</Button>
          <Button to="/digital-twin" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">Digital twin</Button>
        </>
      }
    />

    <Section eyebrow="Modules" title="Fourteen modules on one design system" intro="Each card lists the data the module uses. Where a capability is partial or planned, the card says so.">
      <div className="public-grid public-grid--3">
        {PORTAL_MODULES.map((module) => (
          <FeatureCard
            key={module.key}
            title={module.name}
            text={module.summary}
            bullets={module.inputs.map((input) => `Uses: ${input}`)}
            meta={
              <>
                <StatusPill status={module.status} />
                {module.note && <span className="text-[12px] text-slate-500">{module.note}</span>}
              </>
            }
          />
        ))}
      </div>
    </Section>

    <Section alt eyebrow="Sensors" title="Supported sensor channels" intro="Only these channels are accepted by the device API. Each reading is validated for unit, range and timestamp before it is stored or displayed.">
      <div className="public-table-wrap">
        <table className="public-table">
          <thead>
            <tr><th scope="col">Channel</th><th scope="col">Unit</th><th scope="col">Used for</th></tr>
          </thead>
          <tbody>
            {SENSOR_CHANNELS.map((channel) => (
              <tr key={channel.name}><td><strong>{channel.name}</strong></td><td>{channel.unit}</td><td>{channel.use}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-slate-600">There is no rain gauge channel. Rainfall is provider data and is labelled as forecast or historical estimate everywhere it appears.</p>
    </Section>

    <Section eyebrow="Market & knowledge" title="Also included" intro="The portal keeps the knowledge and market features of earlier releases, on the same navigation and design system.">
      <div className="public-grid public-grid--4">
        <FeatureCard title="Disease library" text="100 crop diseases with structured dossiers: symptoms, conditions, look-alikes, management and when to consult an expert." />
        <FeatureCard title="Farming dictionary" text="Agronomic terms explained in plain language, with bookmarks and recent lookups." />
        <FeatureCard title="News & schemes" text="Agricultural news and government scheme summaries with eligibility notes." />
        <FeatureCard title="Input store" text="Browse products, offers, wishlist, cart and orders. A separate seller portal manages listings." />
      </div>
    </Section>

    <CtaBand title="See the modules with your own records" text="Sign up, add a farm and a zone, and the dashboard, twin and guidance populate from what you enter." />
  </>
);

export default PlatformPage;
