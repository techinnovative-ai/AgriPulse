import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { CtaBand, FaqList, PageHero, Section } from '../../components/public/PublicSections';
import { FAQ_ITEMS } from '../../data/publicContent';

export const FaqPage: React.FC = () => (
  <>
    <PageHero
      compact
      eyebrow="FAQ"
      title="Frequently asked questions"
      lead="Straight answers about data integrity, sensors, AI, weather, privacy and what the platform does not do yet."
      actions={<Button to="/contact" variant="on-dark" trailingIcon={<ArrowRight size={16} />}>Ask something else</Button>}
    />
    <Section eyebrow="Answers" title="Common questions">
      <FaqList items={FAQ_ITEMS} />
    </Section>
    <CtaBand title="Still unsure?" text="The Contact page explains how to reach the team and how to report a problem." primary={{ label: 'Contact', to: '/contact' }} secondary={{ label: 'How it works', to: '/how-it-works' }} />
  </>
);

export default FaqPage;
