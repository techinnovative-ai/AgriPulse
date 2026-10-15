import React from 'react';
import { ArrowRight, Activity, Bell, BrainCircuit, Droplets, Map as MapIcon, BarChart3, ShieldCheck, Cpu, Leaf } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, PortalPreview, Section, StatusPill, Steps } from '../../components/public/PublicSections';
import { DATA_PRINCIPLES, HOW_IT_WORKS_STEPS, PORTAL_MODULES } from '../../data/publicContent';

const HIGHLIGHTS = [
  { icon: <MapIcon size={20} />, title: 'Digital farm twin', text: 'Your zones, crops, devices and current guidance in one connected view. Select a zone to see what is happening and what to do.', to: '/digital-twin' },
  { icon: <Leaf size={20} />, title: 'Early crop-stress detection', text: 'A transparent stress score per zone from moisture, heat, humidity, your observations and open reports — with confidence shown.', to: '/ai-capabilities' },
  { icon: <Droplets size={20} />, title: 'Irrigation guidance', text: 'Irrigate now, soon, hold for rain or not at all — decided from crop target bands and the 48-hour outlook.', to: '/platform', tone: 'water' as const },
  { icon: <Activity size={20} />, title: 'Live monitoring', text: 'Latest values, trends and history per sensor channel, with honest "Waiting for readings" states until nodes report.', to: '/platform' },
  { icon: <Bell size={20} />, title: 'Alerts that say what to do', text: 'Severity, affected zone or device, time raised and the next step — never a bare red dot.', to: '/platform', tone: 'amber' as const },
  { icon: <BarChart3 size={20} />, title: 'Reports and exports', text: 'Period summaries of observations, tasks and telemetry, plus CSV export of everything you recorded.', to: '/platform' },
];

export const HomePage: React.FC = () => (
  <>
    <PageHero
      eyebrow="Intelligent Farm Digital Twin & Early Crop-Stress Detection"
      title={<>See More. Predict Earlier.<br />Grow Smarter.</>}
      lead="AgriPulse turns your farm records, field sensors and weather into a living digital twin that flags crop stress early and tells you what to do next — with every value labelled as measured, recorded, estimated or rule-based."
      actions={
        <>
          <Button size="lg" to="/farmer/signup" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Create farmer account</Button>
          <Button size="lg" to="/how-it-works" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">See how it works</Button>
        </>
      }
      aside={<PortalPreview />}
    />

    <Section eyebrow="What AgriPulse does" title="One platform from field record to decision" intro="Built around the Farmer Portal: fourteen modules on a single design system, all reading from the same farm workspace so the dashboard, twin, insights and alerts never disagree.">
      <div className="public-grid public-grid--3">
        {HIGHLIGHTS.map((item) => (
          <FeatureCard key={item.title} icon={item.icon} iconTone={item.tone} title={item.title} text={item.text} to={item.to} linkLabel="Explore" />
        ))}
      </div>
    </Section>

    <Section alt eyebrow="How it works" title="Works on day one — better with sensors" intro="Everything runs on the values you record. Pairing sensor nodes adds continuous readings and raises the confidence of every recommendation.">
      <Steps steps={HOW_IT_WORKS_STEPS.slice(0, 4)} row />
      <div className="mt-6">
        <Button to="/how-it-works" variant="secondary" trailingIcon={<ArrowRight size={14} />}>Full walkthrough</Button>
      </div>
    </Section>

    <Section eyebrow="Honest by design" title="Data integrity is a feature, not a footnote" intro="Farmers make real decisions from this screen, so the platform is strict about what it shows and how it labels it.">
      <div className="public-grid public-grid--3">
        {DATA_PRINCIPLES.map((item) => (
          <FeatureCard key={item.title} icon={<ShieldCheck size={20} />} title={item.title} text={item.text} />
        ))}
      </div>
    </Section>

    <Section alt eyebrow="Farmer Portal" title="Fourteen modules, one workspace" intro="Each module is listed with its status in this release so you know exactly what to expect after signing in.">
      <div className="public-table-wrap">
        <table className="public-table">
          <thead>
            <tr><th scope="col">Module</th><th scope="col">What it does</th><th scope="col">Status</th></tr>
          </thead>
          <tbody>
            {PORTAL_MODULES.map((module) => (
              <tr key={module.key}>
                <td><strong>{module.name}</strong></td>
                <td>{module.summary}{module.note && <><br /><span className="text-[12px] text-slate-500">{module.note}</span></>}</td>
                <td><StatusPill status={module.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button to="/platform" variant="secondary" trailingIcon={<ArrowRight size={14} />}>Module details</Button>
        <Button to="/roadmap" variant="ghost">What is planned</Button>
      </div>
    </Section>

    <Section eyebrow="Devices" title="Sensor nodes and gateways, paired securely" intro="Register a node in the portal, complete a short-lived pairing on the device and it starts reporting through its own secret. Status is derived by the server — never assumed.">
      <div className="public-grid public-grid--3">
        <FeatureCard icon={<Cpu size={20} />} title="Eight supported channels" text="Soil moisture, soil temperature, air temperature and humidity, light, soil pH, soil NPK, battery voltage and standing water — each validated for unit and range." to="/technology" linkLabel="Technology" />
        <FeatureCard icon={<BrainCircuit size={20} />} title="Anomaly rules" text="Stale nodes, low battery, sudden jumps and flat lines are flagged so silence is never mistaken for calm." to="/ai-capabilities" linkLabel="AI capabilities" />
        <FeatureCard icon={<ShieldCheck size={20} />} title="No rain gauge, no pretence" text="Rainfall comes from the weather provider and is always labelled as a forecast or estimate." to="/faq" linkLabel="FAQ" />
      </div>
    </Section>

    <CtaBand title="Start with your farm records today" text="Create a farmer account, add your zones and crops, and the twin, irrigation guidance and stress scoring switch on immediately. Add sensors when you are ready." />
  </>
);

export default HomePage;
