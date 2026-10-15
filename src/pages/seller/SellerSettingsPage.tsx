import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, LogOut, RotateCcw, Save, Settings2, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react';
import type { SellerProfile } from '../../types';
import { Button, ConfirmDialog, Field, Notice, PageHeader, Panel, SourceTag } from '../../components/ui';
import { profileCompleteness, validateGstin, validateMobile, validatePincode } from '../../services/sellerService';
import { formatDate } from '../../utils/formatters';
import { useSellerData } from './sellerShared';

const BUSINESS_CATEGORIES = [
  'Seeds & Planting Material',
  'Fertilizers & Soil Nutrition',
  'Crop Protection & Bio-Pesticides',
  'Farm Machinery & Implements',
  'Micro-Irrigation & Hardware',
  'Organic Inputs & Bio-fertilizers',
  'General Agri Inputs & Safety Gear',
  'Seeds, Fertilizers & Crop Care',
];

type DraftKey = 'businessName' | 'tradeName' | 'contactPerson' | 'mobile' | 'category' | 'gstin' | 'licenseNumber' | 'address' | 'city' | 'district' | 'state' | 'pincode';
type Draft = Record<DraftKey, string>;
type Errors = Partial<Record<DraftKey, string>>;

const DRAFT_KEYS: DraftKey[] = ['businessName', 'tradeName', 'contactPerson', 'mobile', 'category', 'gstin', 'licenseNumber', 'address', 'city', 'district', 'state', 'pincode'];

function draftFrom(profile: SellerProfile): Draft {
  return {
    businessName: profile.businessName || '',
    tradeName: profile.tradeName || '',
    contactPerson: profile.contactPerson || '',
    mobile: profile.mobile || '',
    category: profile.category || '',
    gstin: profile.gstin || '',
    licenseNumber: profile.licenseNumber || '',
    address: profile.address || '',
    city: profile.city || '',
    district: profile.district || '',
    state: profile.state || '',
    pincode: profile.pincode || '',
  };
}

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.businessName.trim()) errors.businessName = 'Business name is required — it appears on every listing.';
  if (!draft.contactPerson.trim()) errors.contactPerson = 'Enter the person farmers should ask for.';
  const mobile = validateMobile(draft.mobile);
  if (mobile) errors.mobile = mobile;
  const gstin = validateGstin(draft.gstin);
  if (gstin) errors.gstin = gstin;
  const pincode = validatePincode(draft.pincode);
  if (pincode) errors.pincode = pincode;
  return errors;
}

export const SellerSettingsPage: React.FC = () => {
  const { sellerProfile, session, isDemo, updateSellerProfile, resetAllDemoData, logout, workspaceSyncStatus } = useSellerData();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(sellerProfile));
  const [submitted, setSubmitted] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Keep the draft in step with the saved profile when it changes elsewhere and nothing is being edited.
  const saved = useMemo(() => draftFrom(sellerProfile), [sellerProfile]);
  const dirty = DRAFT_KEYS.some((key) => draft[key] !== saved[key]);
  useEffect(() => {
    if (!dirty) setDraft(saved);
  }, [saved]); // `dirty` is read, not tracked: edits in progress must survive background profile updates

  const errors = useMemo(() => validate(draft), [draft]);
  const shownErrors = submitted ? errors : {};
  const completeness = profileCompleteness(sellerProfile);

  const set = (key: DraftKey, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    const next: Draft = {
      businessName: draft.businessName.trim(),
      tradeName: draft.tradeName.trim(),
      contactPerson: draft.contactPerson.trim(),
      mobile: draft.mobile.trim(),
      category: draft.category.trim(),
      gstin: draft.gstin.trim().toUpperCase(),
      licenseNumber: draft.licenseNumber.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      district: draft.district.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode.trim(),
    };
    updateSellerProfile(next);
    setDraft(next);
    setSubmitted(false);
    setSavedAt(new Date().toISOString());
    window.setTimeout(() => setSavedAt(null), 5000);
  };

  const discard = () => {
    setDraft(saved);
    setSubmitted(false);
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Store settings"
        icon={<Settings2 size={14} />}
        title="Store settings & profile"
        description="Business identity shown on your listings and order statements. Changes are saved to your workspace when you press Save."
        actions={
          <Button size="sm" variant="outline" onClick={signOut} leadingIcon={<LogOut size={14} />}>
            Sign out
          </Button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="saved_record" />
            <span>Profile {completeness.percent}% complete{completeness.missing.length > 0 ? ` · missing ${completeness.missing.join(', ')}` : ''}.</span>
          </div>
        }
      />

      {savedAt && (
        <Notice tone="success" role="status" title="Profile saved">
          {workspaceSyncStatus === 'saving' ? 'Syncing to the AGRIPULSE API…' : 'Your store profile has been updated.'}
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={save} noValidate className="space-y-6 xl:col-span-2">
          <Panel as="section" title="Business identity" subtitle="Shown to farmers on listings and order statements">
            {submitted && Object.keys(errors).length > 0 && (
              <Notice tone="danger" role="alert" title="Some fields need attention" className="mb-4">
                Fix the highlighted fields and save again.
              </Notice>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal business name" required error={shownErrors.businessName}>
                {({ id, describedBy, invalid }) => <input id={id} className="ap-input" value={draft.businessName} onChange={(event) => set('businessName', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="organization" />}
              </Field>
              <Field label="Trade / store name" hint="Optional short name shown in the header.">
                {({ id, describedBy }) => <input id={id} className="ap-input" value={draft.tradeName} onChange={(event) => set('tradeName', event.target.value)} aria-describedby={describedBy} />}
              </Field>
              <Field label="Authorised contact person" required error={shownErrors.contactPerson}>
                {({ id, describedBy, invalid }) => <input id={id} className="ap-input" value={draft.contactPerson} onChange={(event) => set('contactPerson', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="name" />}
              </Field>
              <Field label="Contact mobile" error={shownErrors.mobile} hint="10-digit Indian mobile number.">
                {({ id, describedBy, invalid }) => <input id={id} className="ap-input" inputMode="tel" value={draft.mobile} onChange={(event) => set('mobile', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="tel" />}
              </Field>
              <Field label="Login email" hint="Used to sign in. Contact support to change it.">
                {({ id, describedBy }) => <input id={id} className="ap-input" value={session?.email || sellerProfile.email} readOnly aria-describedby={describedBy} />}
              </Field>
              <Field label="Business category">
                {({ id }) => (
                  <select id={id} className="ap-select" value={draft.category} onChange={(event) => set('category', event.target.value)}>
                    {!BUSINESS_CATEGORIES.includes(draft.category) && draft.category && <option value={draft.category}>{draft.category}</option>}
                    {BUSINESS_CATEGORIES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </Panel>

          <Panel as="section" title="Tax & licence details" subtitle="Needed before invoices can be issued; verification is not automated here">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" error={shownErrors.gstin} hint="15 characters, e.g. 06ABCDE1234F1Z5. Format is checked; registration is not verified.">
                {({ id, describedBy, invalid }) => <input id={id} className="ap-input uppercase" value={draft.gstin} onChange={(event) => set('gstin', event.target.value.toUpperCase())} aria-describedby={describedBy} aria-invalid={invalid} maxLength={15} autoComplete="off" />}
              </Field>
              <Field label="Seed / fertiliser / pesticide licence number" hint="As issued by your state agriculture department.">
                {({ id, describedBy }) => <input id={id} className="ap-input" value={draft.licenseNumber} onChange={(event) => set('licenseNumber', event.target.value)} aria-describedby={describedBy} autoComplete="off" />}
              </Field>
            </div>
          </Panel>

          <Panel as="section" title="Dispatch address" subtitle="Where orders ship from">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" className="sm:col-span-2">
                {({ id }) => <textarea id={id} className="ap-textarea" rows={2} value={draft.address} onChange={(event) => set('address', event.target.value)} autoComplete="street-address" />}
              </Field>
              <Field label="City / town">
                {({ id }) => <input id={id} className="ap-input" value={draft.city} onChange={(event) => set('city', event.target.value)} autoComplete="address-level2" />}
              </Field>
              <Field label="District">
                {({ id }) => <input id={id} className="ap-input" value={draft.district} onChange={(event) => set('district', event.target.value)} />}
              </Field>
              <Field label="State">
                {({ id }) => <input id={id} className="ap-input" value={draft.state} onChange={(event) => set('state', event.target.value)} autoComplete="address-level1" />}
              </Field>
              <Field label="PIN code" error={shownErrors.pincode}>
                {({ id, describedBy, invalid }) => <input id={id} className="ap-input" inputMode="numeric" maxLength={6} value={draft.pincode} onChange={(event) => set('pincode', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="postal-code" />}
              </Field>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {dirty && <span className="mr-auto text-[11px] font-semibold text-amber-800">Unsaved changes</span>}
            <Button variant="outline" type="button" onClick={discard} disabled={!dirty} leadingIcon={<Undo2 size={14} />}>
              Discard changes
            </Button>
            <Button variant="primary" type="submit" disabled={!dirty} leadingIcon={<Save size={14} />}>
              Save profile
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Panel as="section" title="Account status">
            <dl className="ap-kv">
              <div>
                <dt>Verification</dt>
                <dd className="flex items-center gap-1.5">
                  {sellerProfile.isVerified ? <ShieldCheck size={14} className="text-forest-700" aria-hidden="true" /> : <ShieldAlert size={14} className="text-amber-700" aria-hidden="true" />}
                  {sellerProfile.isVerified ? 'Verified seller' : 'Not verified'}
                </dd>
              </div>
              <div>
                <dt>Account type</dt>
                <dd>{isDemo ? 'Development demo seller' : 'Registered seller'}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(sellerProfile.joinedDate)}</dd>
              </div>
              <div>
                <dt>Seller ID</dt>
                <dd className="font-mono text-[11px]">{sellerProfile.id}</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-600">
              <Building2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              Seller verification (document checks, GSTIN validation, bank account) is a manual process that is not available in this release.
            </p>
          </Panel>

          <Panel as="section" title="Data & privacy">
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />Your profile, listings and orders are stored in your AGRIPULSE workspace on the server and shown only to your account.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />Bank details and passwords are never requested in these forms.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />Farmers see your business name, contact person and dispatch district — not your mobile number or licence details.</li>
            </ul>
          </Panel>

          {isDemo && (
            <Panel as="section" title="Development demo workspace">
              <p className="text-xs text-slate-700">Restore the sample listings, orders and both demo profiles to their initial state. Device registrations are not affected.</p>
              <div className="mt-3">
                <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)} leadingIcon={<RotateCcw size={14} />}>
                  Reset demo data
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the development demo workspace?"
        description="Sample listings, orders, the farmer profile and this seller profile return to their initial values. Anything you added in either portal is removed. Device registrations are kept."
        confirmLabel="Reset demo data"
        destructive
        onConfirm={() => {
          resetAllDemoData();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};

export default SellerSettingsPage;
