import React, { useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, Github } from 'lucide-react';
import { Button, Field, Notice } from '../../components/ui';
import { FeatureCard, PageHero, Section } from '../../components/public/PublicSections';
import { GITHUB_REPO_URL } from '../../data/publicContent';

const TOPICS = ['Pilot enquiry', 'Device or firmware integration', 'Bug report', 'Accessibility issue', 'Partnership', 'Other'];

export const ContactPage: React.FC = () => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [organisation, setOrganisation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const body = `**Topic:** ${topic}\n**Organisation:** ${organisation.trim() || '—'}\n\n${message.trim()}`;
  const issueUrl = `${GITHUB_REPO_URL}/issues/new?title=${encodeURIComponent(`[${topic}] `)}&body=${encodeURIComponent(body)}`;

  const validate = () => {
    if (message.trim().length < 20) {
      setError('Please write at least a couple of sentences (20+ characters) so we can respond usefully.');
      return false;
    }
    setError(null);
    return true;
  };

  const openIssue = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
  };

  const copy = async () => {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copying is not available in this browser. Select the text manually.');
    }
  };

  return (
    <>
      <PageHero
        compact
        eyebrow="Contact"
        title="Talk to the AgriPulse team"
        lead="Pilot enquiries, device integration questions, bug reports and accessibility feedback all reach the maintainers through the public GitHub repository. Email and phone support are not yet set up, and this page does not pretend otherwise."
        actions={<Button href={`${GITHUB_REPO_URL}/issues`} target="_blank" rel="noreferrer" variant="on-dark" leadingIcon={<Github size={16} />}>Open GitHub issues</Button>}
      />

      <Section eyebrow="Write to us" title="Compose a message" intro="The form prepares a GitHub issue with your message. Issues are public — do not include phone numbers, exact farm locations or other personal data.">
        <div className="public-contact-grid">
          <form className="public-card" onSubmit={openIssue} noValidate>
            {error && <Notice tone="danger" role="alert">{error}</Notice>}
            <Field label="Topic" required>
              {({ id }) => (
                <select id={id} className="ap-select" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {TOPICS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Organisation or farm type" hint="Optional — e.g. FPO, KVK, individual farmer, hardware maker.">
              {({ id }) => <input id={id} className="ap-input" value={organisation} onChange={(event) => setOrganisation(event.target.value)} />}
            </Field>
            <Field label="Message" required hint="What are you trying to do, and what would help?">
              {({ id, invalid }) => <textarea id={id} className="ap-textarea" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} aria-invalid={invalid} required />}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" trailingIcon={<ExternalLink size={14} />}>Send via GitHub issue</Button>
              <Button type="button" variant="secondary" onClick={() => void copy()} leadingIcon={copied ? <Check size={14} /> : <Copy size={14} />}>{copied ? 'Copied' : 'Copy message'}</Button>
            </div>
            <p className="text-[12px] text-slate-500">You will need a GitHub account to post the issue. If you prefer, copy the message and send it through any channel you already have with the team.</p>
          </form>

          <div className="grid gap-4">
            <FeatureCard icon={<Github size={20} />} title="Bug reports" text="Include the page, what you expected and what happened. Screenshots help; never paste device secrets or pairing tokens." />
            <FeatureCard title="Pilot enquiries" text="Tell us the crops, number of zones, whether you already have sensors, and whether you can record outcomes (irrigation events, inspections) during the season." iconTone="amber" />
            <FeatureCard title="Security disclosures" text="Please follow the responsible-disclosure steps in SECURITY.md rather than opening a public issue." iconTone="water" />
            <Button href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer" variant="ghost" trailingIcon={<ArrowRight size={14} />}>Read the security policy</Button>
          </div>
        </div>
      </Section>
    </>
  );
};

export default ContactPage;
