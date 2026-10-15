import React from 'react';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section } from '../../components/public/PublicSections';
import { GITHUB_REPO_URL, SECURITY_POINTS, TECH_STACK } from '../../data/publicContent';

const API_SURFACE = [
  { route: 'POST /api/auth/login · /register · /logout', purpose: 'Cookie-session authentication for farmer and seller portals' },
  { route: 'GET /api/farms · GET/PUT /api/workspace', purpose: 'Farm workspace persistence per account' },
  { route: 'GET/POST /api/devices · PATCH /api/devices/:id', purpose: 'Device registry with ownership checks' },
  { route: 'POST /api/devices/:id/pairing-sessions', purpose: 'Issue short-lived pairing tokens' },
  { route: 'POST /api/device-ingest/pairing/complete', purpose: 'Device exchanges token for its secret' },
  { route: 'POST /api/device-ingest/telemetry', purpose: 'Authenticated telemetry (≤ 40 readings per call, validated units and ranges)' },
  { route: 'GET /api/devices/:id/telemetry · /events', purpose: 'History for monitoring, insights and reports' },
];

export const TechnologyPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="Technology"
      title="A practical stack built for honest data"
      lead="A TypeScript React portal, an Express API with cookie sessions and ownership checks, SQLite storage, a documented device protocol and a rule engine that runs on the same data the farmer sees."
      actions={
        <>
          <Button href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" variant="on-dark" leadingIcon={<Github size={16} />}>View source</Button>
          <Button to="/ai-capabilities" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">AI capabilities</Button>
        </>
      }
    />

    <Section eyebrow="Architecture" title="Components">
      <div className="public-grid public-grid--3">
        {TECH_STACK.map((item) => (
          <FeatureCard key={item.area} title={item.area} text={item.detail} />
        ))}
      </div>
    </Section>

    <Section alt eyebrow="Device API" title="Pairing and telemetry contract" intro="The device contract is published in the repository (DEVICE_API_CONTRACTS.md and FIRMWARE_PROTOCOL.md). Highlights:">
      <div className="public-table-wrap">
        <table className="public-table">
          <thead><tr><th scope="col">Endpoint</th><th scope="col">Purpose</th></tr></thead>
          <tbody>
            {API_SURFACE.map((row) => (
              <tr key={row.route}><td><code className="text-[12px]">{row.route}</code></td><td>{row.purpose}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-slate-600">Timestamps must fall within the last 90 days and no more than 5 minutes in the future. Rate limits apply to authentication, pairing and telemetry routes.</p>
    </Section>

    <Section eyebrow="Security & privacy" title="Defaults that protect farmers">
      <div className="public-grid public-grid--3">
        {SECURITY_POINTS.map((point) => (
          <FeatureCard key={point} title={point.split(';')[0].split('.')[0]} text={point} />
        ))}
      </div>
      <div className="mt-6">
        <Button href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer" variant="secondary" trailingIcon={<ArrowRight size={14} />}>Security policy</Button>
      </div>
    </Section>

    <Section alt eyebrow="Known limitations" title="What this release does not do" intro="Documented so expectations are set correctly before a pilot.">
      <div className="public-grid public-grid--3">
        <FeatureCard title="No external AI service" text="Assistant answers and symptom guidance are retrieval and rule-based. A connected model would be labelled separately." />
        <FeatureCard title="No notification channels yet" text="Alerts are in-portal only; SMS, WhatsApp and push delivery are planned." iconTone="amber" />
        <FeatureCard title="Schematic twin" text="Zone layout is proportional to area, not GPS boundaries." />
        <FeatureCard title="Rainfall is never measured" text="No rain gauge channel exists; precipitation comes from the weather provider as forecast or estimate." iconTone="water" />
        <FeatureCard title="General target bands" text="Crop moisture bands are not yet calibrated to soil texture or growth stage." />
        <FeatureCard title="Demo fallback weather" text="Without a configured provider URL the Weather page uses a clearly labelled demo forecast." />
      </div>
    </Section>

    <CtaBand title="Build on it" text="The repository includes the API contracts, firmware protocol and verification notes needed to connect your own nodes." primary={{ label: 'Contact the team', to: '/contact' }} secondary={{ label: 'FAQ', to: '/faq' }} />
  </>
);

export default TechnologyPage;
