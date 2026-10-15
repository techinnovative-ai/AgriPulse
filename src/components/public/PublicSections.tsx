import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '../ui';
import { STATUS_LABEL, type CapabilityStatus } from '../../data/publicContent';

export const StatusPill: React.FC<{ status: CapabilityStatus }> = ({ status }) => (
  <span className={`public-status public-status--${status}`}>{STATUS_LABEL[status]}</span>
);

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  compact?: boolean;
}

export const PageHero: React.FC<PageHeroProps> = ({ eyebrow, title, lead, actions, aside, compact }) => (
  <section className={`public-hero ${compact ? 'public-hero--compact' : ''}`}>
    <div className="public-container">
      <div className="public-hero__inner" style={aside ? undefined : { gridTemplateColumns: '1fr' }}>
        <div>
          <span className="public-eyebrow">{eyebrow}</span>
          <h1 className="public-h1">{title}</h1>
          <p className="public-lead">{lead}</p>
          {actions && <div className="public-hero__actions">{actions}</div>}
        </div>
        {aside}
      </div>
    </div>
  </section>
);

interface SectionProps {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  alt?: boolean;
  tight?: boolean;
  id?: string;
  children?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ eyebrow, title, intro, alt, tight, id, children }) => (
  <section id={id} className={`public-section ${alt ? 'public-section--alt' : ''} ${tight ? 'public-section--tight' : ''}`} aria-labelledby={id ? `${id}-title` : undefined}>
    <div className="public-container">
      <div className="public-section__head">
        {eyebrow && <span className="public-eyebrow">{eyebrow}</span>}
        <h2 id={id ? `${id}-title` : undefined} className="public-h2">{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      {children}
    </div>
  </section>
);

interface FeatureCardProps {
  icon?: React.ReactNode;
  iconTone?: 'forest' | 'water' | 'amber';
  title: string;
  text?: React.ReactNode;
  bullets?: string[];
  meta?: React.ReactNode;
  to?: string;
  linkLabel?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, iconTone = 'forest', title, text, bullets, meta, to, linkLabel }) => {
  const body = (
    <>
      {icon && <span className={`public-card__icon ${iconTone !== 'forest' ? `public-card__icon--${iconTone}` : ''}`} aria-hidden="true">{icon}</span>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {bullets && (
        <ul>
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {meta && <div className="public-card__meta">{meta}</div>}
      {to && (
        <span className="public-card__link">
          {linkLabel || 'Learn more'}
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="public-card public-card--link">
        {body}
      </Link>
    );
  }
  return <article className="public-card">{body}</article>;
};

export const Steps: React.FC<{ steps: { title: string; text: string }[]; row?: boolean }> = ({ steps, row }) => (
  <ol className={`public-steps ${row ? 'public-steps--row' : ''}`}>
    {steps.map((step, index) => (
      <li key={step.title} className="public-step">
        <span className="public-step__num" aria-hidden="true">{index + 1}</span>
        <div>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

export const FaqList: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => (
  <div className="public-faq">
    {items.map((item) => (
      <details key={item.q}>
        <summary>
          {item.q}
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <p>{item.a}</p>
      </details>
    ))}
  </div>
);

export const CtaBand: React.FC<{ title: string; text: string; primary?: { label: string; to: string }; secondary?: { label: string; to: string } }> = ({ title, text, primary = { label: 'Create farmer account', to: '/farmer/signup' }, secondary = { label: 'Log in', to: '/farmer/login' } }) => (
  <section className="public-section public-section--tight">
    <div className="public-container">
      <div className="public-cta">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="public-cta__actions">
          <Button to={primary.to} variant="on-dark" trailingIcon={<ArrowRight size={14} />}>{primary.label}</Button>
          <Button to={secondary.to} variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">{secondary.label}</Button>
        </div>
      </div>
    </div>
  </section>
);

/** Illustrative preview of the dashboard built from the same visual language; labelled as illustrative. */
export const PortalPreview: React.FC = () => (
  <div>
    <div className="public-preview" aria-hidden="true">
      <div className="public-preview__window">
        <div className="public-preview__bar"><i /><i /><i /><span>Farmer Portal · Dashboard</span></div>
        <div className="public-preview__body">
          <div className="public-preview__tiles">
            <div className="public-preview__tile"><small>Soil moisture</small><strong>Waiting</strong><em style={{ background: '#eef1ec', color: '#5b6a5d' }}>No connected data</em></div>
            <div className="public-preview__tile"><small>Recorded moisture</small><strong>41%</strong><em style={{ background: '#fbf1dc', color: '#7a4e12' }}>Farmer recorded</em></div>
            <div className="public-preview__tile"><small>Rain · 48 h</small><strong>35%</strong><em style={{ background: '#e3f0f4', color: '#2a5967' }}>Provider forecast</em></div>
          </div>
          <div className="public-preview__tile">
            <small>Irrigation guidance · North Paddy Block</small>
            <strong style={{ fontSize: 14 }}>Irrigate soon — 41% is below the 60–95% paddy band</strong>
            <em style={{ background: '#e8f2e4', color: '#1f4a25' }}>Rule-based · medium confidence</em>
          </div>
          <div className="public-preview__tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="public-preview__tile"><small>Open alerts</small><strong>3</strong><em style={{ background: '#fdecea', color: '#8f2d27' }}>1 high</em></div>
            <div className="public-preview__tile"><small>Sensor nodes</small><strong>2</strong><em style={{ background: '#fbf1dc', color: '#7a4e12' }}>Pending pairing</em></div>
          </div>
        </div>
      </div>
    </div>
    <p className="public-preview__caption">Illustrative preview of the Farmer Portal with sample records — not live data.</p>
  </div>
);
