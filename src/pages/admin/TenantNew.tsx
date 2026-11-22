import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleToggles, PresetPicker } from '../../components/ModuleMatrix';
import { Card, Field, PageHeader, Toggle } from '../../components/ui';
import { MODULES, PRESETS } from '../../lib/modules';
import type { PlanKey, Tenant, Vertical } from '../../lib/types';
import { cx } from '../../lib/utils';
import { useDB } from '../../store/db';

const STEPS = ['Business', 'Business model & modules', 'Channels', 'Review'];
const COLORS = ['#1f9880', '#e46a48', '#a855f7', '#d97706', '#0ea5e9', '#be185d'];

export default function TenantNew() {
  const { createTenant, meta } = useDB();
  const assigned = useDB((s) => new Set(s.tenants.map((t) => t.metaAdAccountId).filter(Boolean)));
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Omit<Tenant, 'id' | 'createdAt'>>({
    name: '',
    vertical: 'dental',
    country: 'Lebanon',
    city: 'Beirut',
    currency: 'USD',
    secondaryCurrency: 'LBP',
    exchangeRate: 89500,
    vatRate: 11,
    plan: 'growth',
    status: 'onboarding',
    modules: { ...PRESETS.growth.modules },
    businessModel: '',
    hasOwnAgency: false,
    ownerName: '',
    ownerEmail: '',
    phone: '',
    brandColor: COLORS[0],
    monthlyFeeUSD: PRESETS.growth.fee,
    limits: { users: 10, branches: 1 },
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const canNext = step !== 0 || (f.name.trim() && f.ownerName.trim());

  const submit = () => {
    const id = createTenant(f);
    nav(`/admin/tenants/${id}`);
  };

  return (
    <>
      <PageHeader title="New tenant" subtitle="Open a clinic or spa on Clinqo and switch on only what their business needs." />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium', i === step ? 'bg-ink-900 text-white' : i < step ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-500')}>
            {i < step ? <Check size={12} /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name *">
              <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Pearl Dental Center" />
            </Field>
            <Field label="Type">
              <select className="input" value={f.vertical} onChange={(e) => set('vertical', e.target.value as Vertical)}>
                <option value="dental">Dental clinic</option>
                <option value="aesthetic">Aesthetic clinic / medspa</option>
                <option value="spa">Spa / wellness</option>
                <option value="medical">Medical clinic</option>
              </select>
            </Field>
            <Field label="Owner name *">
              <input className="input" value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
            </Field>
            <Field label="Owner email">
              <input className="input" type="email" value={f.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+961" />
            </Field>
            <Field label="City / area">
              <input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Country">
              <select className="input" value={f.country} onChange={(e) => set('country', e.target.value)}>
                <option>Lebanon</option>
                <option disabled>UAE (coming)</option>
                <option disabled>Saudi Arabia (coming)</option>
              </select>
            </Field>
            <Field label="LBP exchange rate (per $1)">
              <input className="input" type="number" value={f.exchangeRate} onChange={(e) => set('exchangeRate', +e.target.value)} />
            </Field>
            <Field label="Brand colour">
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set('brandColor', c)} className={cx('h-8 w-8 rounded-full ring-offset-2', f.brandColor === c && 'ring-2 ring-ink-800')} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </Field>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Card title="Business model">
            <Field label="How does this client work? What do they need from Clinqo?">
              <textarea className="input min-h-[80px]" value={f.businessModel} onChange={(e) => set('businessModel', e.target.value)} placeholder="e.g. Has its own marketing agency, needs CRM + POS + packages only." />
            </Field>
            <div className="mt-4 flex items-center gap-3">
              <Toggle
                on={f.hasOwnAgency}
                onChange={() => {
                  const own = !f.hasOwnAgency;
                  setF((x) => ({ ...x, hasOwnAgency: own, ...(own ? { plan: 'operations', modules: { ...PRESETS.operations.modules }, monthlyFeeUSD: PRESETS.operations.fee } : {}) }));
                }}
              />
              <span className="text-sm text-ink-700">Client already has a marketing agency (Clinqo won't run their ads)</span>
            </div>
          </Card>
          <Card title="Plan preset">
            <PresetPicker value={f.plan} onPick={(p: PlanKey) => setF((x) => ({ ...x, plan: p, modules: { ...PRESETS[p].modules }, monthlyFeeUSD: PRESETS[p].fee || x.monthlyFeeUSD }))} />
            <div className="mt-4 max-w-xs">
              <Field label="Monthly fee (USD)">
                <input className="input" type="number" value={f.monthlyFeeUSD} onChange={(e) => set('monthlyFeeUSD', +e.target.value)} />
              </Field>
            </div>
          </Card>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-800">Fine-tune modules</h3>
            <ModuleToggles modules={f.modules} onToggle={(k) => setF((x) => ({ ...x, plan: 'custom', modules: { ...x.modules, [k]: !x.modules[k] } }))} />
          </div>
        </div>
      )}

      {step === 2 && (
        <Card title="Channels">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta ad account (from the Clinqo Business Manager)">
              <select className="input" value={f.metaAdAccountId ?? ''} onChange={(e) => set('metaAdAccountId', e.target.value || undefined)} disabled={!f.modules.marketing}>
                <option value="">— none —</option>
                {meta.adAccounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={assigned.has(a.id)}>
                    {a.name} ({a.id}){assigned.has(a.id) ? ' – in use' : ''}
                  </option>
                ))}
              </select>
              {!f.modules.marketing && <p className="mt-1 text-xs text-ink-400">Marketing module is off for this tenant.</p>}
            </Field>
            <Field label="WhatsApp Business number">
              <input className="input" value={f.whatsappNumber ?? ''} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="+961 7x xxx xxx" />
            </Field>
            <Field label="Instagram handle">
              <input className="input" value={f.instagramHandle ?? ''} onChange={(e) => set('instagramHandle', e.target.value)} placeholder="@clinic" />
            </Field>
            <Field label="Status">
              <select className="input" value={f.status} onChange={(e) => set('status', e.target.value as Tenant['status'])}>
                <option value="onboarding">Onboarding</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
              </select>
            </Field>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Review">
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['Name', f.name],
              ['Type', f.vertical],
              ['Owner', `${f.ownerName} ${f.ownerEmail && `· ${f.ownerEmail}`}`],
              ['City', `${f.city}, ${f.country}`],
              ['Plan', `${PRESETS[f.plan].label} · $${f.monthlyFeeUSD}/mo`],
              ['Meta ad account', f.metaAdAccountId ?? '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-400">{k}</dt>
                <dd className="font-medium text-ink-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {MODULES.filter((m) => f.modules[m.key]).map((m) => (
              <span key={m.key} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {m.label}
              </span>
            ))}
          </div>
          <p className="mt-5 text-xs text-ink-500">Creating the tenant adds a starter service catalog for a {f.vertical} business, an owner login and a front-desk login.</p>
        </Card>
      )}

      <div className="mt-6 flex justify-between">
        <button className="btn-secondary" onClick={() => (step ? setStep(step - 1) : nav('/admin/tenants'))}>
          <ArrowLeft size={15} className="rtl:rotate-180" /> {step ? 'Back' : 'Cancel'}
        </button>
        {step < 3 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Next <ArrowRight size={15} className="rtl:rotate-180" />
          </button>
        ) : (
          <button className="btn-primary" onClick={submit}>
            <Check size={15} /> Create tenant
          </button>
        )}
      </div>
    </>
  );
}
