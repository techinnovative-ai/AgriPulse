import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FeatureCard, PageHero, Section, Steps } from '../../components/public/PublicSections';
import { HOW_IT_WORKS_STEPS } from '../../data/publicContent';

const PAIRING_STEPS = [
  { title: 'Register the device', text: 'In Devices & Sensors, add a sensor node or LoRa gateway with its installed sensors, zone and sampling interval. It starts as pending pairing.' },
  { title: 'Start a pairing session', text: 'The portal issues a short-lived pairing token. Enter it on the device (or through its provisioning tool).' },
  { title: 'The device completes pairing', text: 'The device exchanges the token for its own device secret over the device API. The secret is never shown in the portal.' },
  { title: 'Telemetry flows', text: 'Readings are validated for unit, range and timestamp and stored. The server derives online, offline or attention status from heartbeats and readings.' },
];

export const HowItWorksPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="How it works"
      title="From first record to daily decisions in five steps"
      lead="AgriPulse is designed to be useful on day one with nothing but your own records, and to grow more precise as sensors and seasons add data."
      actions={<Button to="/farmer/signup" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Start with step one</Button>}
    />

    <Section eyebrow="Farmer journey" title="Five steps">
      <Steps steps={HOW_IT_WORKS_STEPS} />
    </Section>

    <Section alt eyebrow="Devices" title="How a sensor node joins your farm" intro="Pairing is deliberate and secure. Until it completes, the portal shows the device as pending and the monitoring page says 'Waiting for readings'.">
      <Steps steps={PAIRING_STEPS} row />
    </Section>

    <Section eyebrow="Every day" title="What a typical morning looks like">
      <div className="public-grid public-grid--3">
        <FeatureCard title="1 · Dashboard" text="Open alerts first, then condition tiles with their sources, irrigation guidance per zone and the weather outlook from the named provider." />
        <FeatureCard title="2 · Twin or monitoring" text="Check the zone that raised an alert: latest readings or recorded values, device status and the recommended action." iconTone="water" />
        <FeatureCard title="3 · Act and record" text="Schedule the irrigation or inspection, record what you find, and the rule engine re-evaluates immediately." iconTone="amber" />
      </div>
    </Section>

    <CtaBand title="Ready to try it?" text="Create an account, add one farm and one zone, and follow the steps above. The demo workspace can be reset at any time from Farm Settings." />
  </>
);

export default HowItWorksPage;
