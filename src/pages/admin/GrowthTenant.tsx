import { CheckCircle2, Circle, ExternalLink, Eye, Pause, Play, Plus, RefreshCw, Search, Unplug, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Bar, Card, Field, Modal, PageHeader, Stat, Tabs, Toggle } from '../../components/ui';
import { campaignFunnels, growthInsights, sumFunnels } from '../../lib/metrics';
import type { MarketingPlan, OptimizationLog, Tenant } from '../../lib/types';
import { ago, cx, fmtDate, fmtDateTime, num, pct, usd } from '../../lib/utils';
import { useDB } from '../../store/db';

type TabKey = 'overview' | 'campaigns' | 'forms' | 'plan' | 'log' | 'clinic' | 'setup';
const PHASES: MarketingPlan['phase'][] = ['plan', 'configuration', 'ad_spend', 'optimizing'];
const PHASE_LABEL = { plan: '1 · Marketing plan', configuration: '2 · Configuration', ad_spend: '3 · Ad spend', optimizing: '4 · Optimizing' };
const KIND_LABEL: Record<OptimizationLog['kind'], string> = { launch: 'Launch', budget: 'Budget', creative: 'Creative', audience: 'Audience', offer: 'Offer', pause: 'Pause / resume', note: 'Note' };
const LEVEL_STYLE = { good: 'border-brand-200 bg-brand-50/60', warn: 'border-amber-200 bg-amber-50/70', bad: 'border-rose-200 bg-rose-50/70' };

/** Ads Manager deep links: the marketer can always jump to Meta and work there */
export const adsManagerUrl = (act?: string, campaignId?: string) =>
  act ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${act.replace('act_', '')}${campaignId ? `&selected_campaign_ids=${campaignId}` : ''}` : 'https://adsmanager.facebook.com/';

export default function GrowthTenant() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabKey) ?? 'overview';
  const db = useDB();
  const nav = useNavigate();
  const t = db.tenants.find((x) => x.id === id);
  const funnels = useMemo(() => (t ? campaignFunnels(db, t.id) : []), [db, t]);
  const insights = useMemo(() => (t ? growthInsights(db, t.id) : []), [db, t]);
  if (!t) return <p className="text-ink-500">Tenant not found.</p>;
  const total = sumFunnels(funnels);
  const plan = db.plans.find((p) => p.tenantId === t.id);
  const since30 = Date.now() - 30 * 864e5;
  const adLeads30 = db.leads.filter((l) => l.tenantId === t.id && l.source === 'meta_ads' && new Date(l.createdAt).getTime() > since30);
  const campaigns = db.campaigns.filter((c) => c.tenantId === t.id);
  const pacing = {
    monthly: campaigns.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c.dailyBudget * 30, 0),
    cpl: total.cpl,
    bookings30: adLeads30.filter((l) => ['consult_booked', 'attended', 'won'].includes(l.stage)).length,
  };
  const problems = insights.filter((i) => i.level !== 'good').length;

  return (
    <>
      <Link to="/admin/growth" className="text-xs text-ink-400 hover:text-ink-700">
        ← All growth clients
      </Link>
      <PageHeader
        title={t.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {plan && <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{PHASE_LABEL[plan.phase]}</Badge>}
            {t.metaAdAccountId ? <span>Ad account {t.metaAdAccountId}</span> : <span className="text-rose-600">No ad account connected</span>}
          </span>
        }
        actions={
          <>
            <a className="btn-secondary" href={adsManagerUrl(t.metaAdAccountId)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Open in Ads Manager
            </a>
            <button className="btn-secondary" onClick={db.syncMeta}>
              <RefreshCw size={15} /> Sync
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                db.openTenant(t.id);
                nav('/app/leads');
              }}
            >
              <Eye size={15} /> See clinic's leads
            </button>
          </>
        }
      />
      <Tabs<TabKey>
        value={tab}
        onChange={(k) => setParams({ tab: k })}
        tabs={[
          { key: 'overview', label: <span>Overview {problems > 0 && <span className="ms-1 rounded-full bg-coral-500 px-1.5 text-[10px] text-white">{problems}</span>}</span> },
          { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
          { key: 'forms', label: 'Lead forms' },
          { key: 'plan', label: 'Plan & pacing' },
          { key: 'log', label: 'Optimization log' },
          { key: 'clinic', label: 'What the clinic sees' },
          { key: 'setup', label: 'Setup' },
        ]}
      />
      {tab === 'overview' && <OverviewTab t={t} total={total} insights={insights} />}
      {tab === 'campaigns' && <CampaignsTab t={t} funnels={funnels} />}
      {tab === 'forms' && <FormsTab t={t} />}
      {tab === 'plan' && <PlanTab t={t} pacing={pacing} />}
      {tab === 'log' && <LogTab t={t} />}
      {tab === 'clinic' && <ClinicViewTab t={t} />}
      {tab === 'setup' && <SetupTab t={t} />}
    </>
  );
}

function OverviewTab({ t, total, insights }: { t: Tenant; total: ReturnType<typeof sumFunnels>; insights: ReturnType<typeof growthInsights> }) {
  const logs = useDB((s) => s.optLogs.filter((l) => l.tenantId === t.id).slice(0, 4));
  const steps = [
    { label: 'Leads', n: total.leads },
    { label: 'Consults booked', n: total.booked },
    { label: 'Attended', n: total.attended },
    { label: 'Paying patients', n: total.patients },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ad spend (to date)" value={usd(total.spend)} hint={`${num(total.leads)} leads`} />
        <Stat label="Cost per lead" value={usd(total.cpl, 2)} />
        <Stat label="Cost per paying patient" value={usd(total.costPerPatient)} hint={`${total.patients} paying patients`} />
        <Stat label="Return on ad spend" value={`${total.roas.toFixed(1)}×`} hint={`${usd(total.revenue)} paid at the clinic`} tone="brand" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card title="What to do next">
          <ul className="space-y-2.5">
            {insights.map((i, k) => (
              <li key={k} className={cx('rounded-lg border p-3', LEVEL_STYLE[i.level])}>
                <div className="text-sm font-medium text-ink-900">{i.title}</div>
                <div className="mt-0.5 text-xs text-ink-600">{i.detail}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Funnel: ad lead to paying patient">
          <div className="space-y-2.5">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm text-ink-600">{s.label}</div>
                <div className="h-7 flex-1 rounded bg-ink-50">
                  <div className="flex h-full items-center rounded bg-brand-600 px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(8, (s.n / Math.max(1, steps[0].n)) * 100)}%`, opacity: 1 - i * 0.15 }}>
                    {num(s.n)}
                  </div>
                </div>
                <div className="w-12 shrink-0 text-end text-xs text-ink-400">{i ? pct(s.n / Math.max(1, steps[i - 1].n)) : ''}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-500">Bookings and payments come from the clinic's own CRM and POS, so this is real revenue, not Meta's estimate.</p>
          <div className="mt-5 border-t border-ink-100 pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Latest optimizations</div>
            <ul className="space-y-2 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex gap-2">
                  <Badge>{KIND_LABEL[l.kind]}</Badge>
                  <span className="flex-1 text-ink-700">{l.text}</span>
                  <span className="shrink-0 text-xs text-ink-400">{ago(l.at)}</span>
                </li>
              ))}
              {!logs.length && <li className="text-ink-400">Nothing logged yet.</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CampaignsTab({ t, funnels }: { t: Tenant; funnels: ReturnType<typeof campaignFunnels> }) {
  const { patch, logOpt, importCampaigns, syncMeta } = useDB.getState();
  const [budget, setBudget] = useState<Record<string, string>>({});
  return (
    <Card
      pad={false}
      title="Campaigns in this ad account"
      actions={
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={syncMeta}>
            <RefreshCw size={13} /> Sync spend & leads
          </button>
          <button className="btn-secondary btn-sm" disabled={!t.metaAdAccountId} onClick={() => importCampaigns(t.id)}>
            <Search size={13} /> Find new campaigns
          </button>
          <a className="btn-primary btn-sm" href={adsManagerUrl(t.metaAdAccountId)} target="_blank" rel="noreferrer">
            <Plus size={13} /> Create in Ads Manager
          </a>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Campaign</th>
              <th className="th text-end">Daily budget</th>
              <th className="th text-end">Spend</th>
              <th className="th text-end">Leads</th>
              <th className="th text-end">CPL</th>
              <th className="th text-end">Booked</th>
              <th className="th text-end">Patients</th>
              <th className="th text-end">Revenue</th>
              <th className="th text-end">ROAS</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {funnels.map((f) => {
              const c = f.campaign;
              const draft = budget[c.id] ?? String(c.dailyBudget);
              return (
                <tr key={c.id}>
                  <td className="td">
                    <div className="font-medium text-ink-800">{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
                      <Badge className={c.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700 ring-brand-200' : undefined}>{c.status}</Badge>
                      since {fmtDate(c.startDate)}
                    </div>
                  </td>
                  <td className="td text-end">
                    <div className="inline-flex items-center gap-1">
                      $
                      <input
                        type="number"
                        className="w-16 rounded border border-ink-200 px-1.5 py-0.5 text-end text-sm"
                        value={draft}
                        onChange={(e) => setBudget({ ...budget, [c.id]: e.target.value })}
                        onBlur={() => {
                          const v = +draft;
                          if (v > 0 && v !== c.dailyBudget) {
                            patch('campaigns', c.id, { dailyBudget: v });
                            logOpt({ tenantId: t.id, kind: 'budget', campaignId: c.id, text: `${c.name}: daily budget $${c.dailyBudget} → $${v}` });
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="td text-end">{usd(f.spend)}</td>
                  <td className="td text-end">{f.leads}</td>
                  <td className="td text-end">{usd(f.cpl, 2)}</td>
                  <td className="td text-end">{f.booked}</td>
                  <td className="td text-end">{f.patients}</td>
                  <td className="td text-end">{usd(f.revenue)}</td>
                  <td className={cx('td text-end font-semibold', f.roas >= 3 ? 'text-brand-700' : f.roas < 1 ? 'text-rose-600' : '')}>{f.roas.toFixed(1)}×</td>
                  <td className="td whitespace-nowrap text-end">
                    <button
                      className="btn-ghost btn-sm"
                      title={c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      onClick={() => {
                        const next = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                        patch('campaigns', c.id, { status: next });
                        logOpt({ tenantId: t.id, kind: 'pause', campaignId: c.id, text: `${next === 'PAUSED' ? 'Paused' : 'Resumed'} ${c.name}` });
                      }}
                    >
                      {c.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <a className="btn-ghost btn-sm" href={adsManagerUrl(t.metaAdAccountId, c.metaCampaignId)} target="_blank" rel="noreferrer" title="Open in Ads Manager">
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              );
            })}
            {!funnels.length && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-sm text-ink-400">
                  No campaigns yet. Create one in Ads Manager with a lead form, then press “Find new campaigns”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-400">
        Budget and pause changes here are written to Meta in the live build and logged automatically. Anything changed directly in Ads Manager shows up on the next sync. Test build: simulated.
      </p>
    </Card>
  );
}

function FormsTab({ t }: { t: Tenant }) {
  const forms = useDB((s) => s.leadForms.filter((f) => f.tenantId === t.id));
  const campaigns = useDB((s) => s.campaigns.filter((c) => c.tenantId === t.id));
  const leads = useDB((s) => s.leads.filter((l) => l.tenantId === t.id && l.formId));
  const { patch, syncForms } = useDB.getState();
  const [msg, setMsg] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-600">
          Forms are built in Meta (Instant Forms on <b>{t.metaPageName || 'the clinic page'}</b>). Here you choose which answer becomes the lead's interest and which answers the clinic sees.
        </p>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-brand-700">{msg}</span>}
          <button className="btn-secondary btn-sm" disabled={!t.metaAdAccountId} onClick={() => setMsg(`${syncForms(t.id)} new form(s) found`)}>
            <RefreshCw size={13} /> Sync forms
          </button>
        </div>
      </div>
      {forms.map((f) => (
        <Card
          key={f.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {f.name}
              <Badge className={f.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700 ring-brand-200' : undefined}>{f.status}</Badge>
            </span>
          }
          actions={
            <span className="flex items-center gap-2 text-xs text-ink-500">
              Receiving leads <Toggle on={f.status === 'ACTIVE'} onChange={() => patch('leadForms', f.id, { status: f.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })} />
            </span>
          }
        >
          <div className="mb-3 text-xs text-ink-400">
            Form ID {f.metaFormId} · campaign {campaigns.find((c) => c.id === f.campaignId)?.name ?? '—'} · {leads.filter((l) => l.formId === f.id).length} leads
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th ps-0">Question</th>
                <th className="th text-center">Use as “interested in”</th>
                <th className="th text-center">Clinic sees answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {f.questions.map((q) => {
                const contact = q === 'Full name' || q === 'Phone number';
                return (
                  <tr key={q}>
                    <td className="py-2">{q}</td>
                    <td className="td text-center">
                      {!contact && <input type="radio" name={`int-${f.id}`} checked={f.interestQuestion === q} onChange={() => patch('leadForms', f.id, { interestQuestion: q })} />}
                    </td>
                    <td className="td text-center">
                      {contact ? (
                        <span className="text-xs text-ink-400">always (needed to call)</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={f.visibleQuestions.includes(q)}
                          onChange={(e) => patch('leadForms', f.id, { visibleQuestions: e.target.checked ? [...f.visibleQuestions, q] : f.visibleQuestions.filter((x) => x !== q) })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}
      {!forms.length && <div className="card p-8 text-center text-sm text-ink-400">No lead forms yet. Connect the ad account, then sync.</div>}
    </div>
  );
}

function LogTab({ t }: { t: Tenant }) {
  const logs = useDB((s) => s.optLogs.filter((l) => l.tenantId === t.id));
  const campaigns = useDB((s) => s.campaigns.filter((c) => c.tenantId === t.id));
  const logOpt = useDB((s) => s.logOpt);
  const [f, setF] = useState<{ kind: OptimizationLog['kind']; campaignId: string; text: string }>({ kind: 'creative', campaignId: '', text: '' });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card title="Log a change">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as OptimizationLog['kind'] })}>
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Campaign">
              <select className="input" value={f.campaignId} onChange={(e) => setF({ ...f, campaignId: e.target.value })}>
                <option value="">— whole account —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="What changed and why">
            <textarea className="input min-h-[90px]" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="e.g. New reel creative with Dr. Khoury explaining implants; old image ad CTR fell to 0.7%" />
          </Field>
          <button
            className="btn-primary"
            disabled={!f.text.trim()}
            onClick={() => {
              logOpt({ tenantId: t.id, kind: f.kind, campaignId: f.campaignId || undefined, text: f.text.trim() });
              setF({ ...f, text: '' });
            }}
          >
            <Plus size={14} /> Add to log
          </button>
        </div>
      </Card>
      <Card title="History">
        <ol className="relative space-y-4 border-s border-ink-100 ps-5">
          {logs.map((l) => (
            <li key={l.id}>
              <span className="absolute -start-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                <Badge>{KIND_LABEL[l.kind]}</Badge>
                {fmtDateTime(l.at)} · {l.author}
              </div>
              <div className="mt-1 text-sm text-ink-800">{l.text}</div>
              {l.campaignId && <div className="text-xs text-ink-400">{campaigns.find((c) => c.id === l.campaignId)?.name}</div>}
            </li>
          ))}
          {!logs.length && <li className="text-sm text-ink-400">No changes logged yet.</li>}
        </ol>
      </Card>
    </div>
  );
}

function ClinicViewTab({ t }: { t: Tenant }) {
  const update = useDB((s) => s.updateTenant);
  const sample = useDB((s) => s.leads.find((l) => l.tenantId === t.id && l.source === 'meta_ads' && l.answers));
  const forms = useDB((s) => s.leadForms.filter((f) => f.tenantId === t.id));
  const campaigns = useDB((s) => s.campaigns.filter((c) => c.tenantId === t.id));
  const d = t.leadDisplay;
  const set = (x: Partial<Tenant['leadDisplay']>) => update(t.id, { leadDisplay: { ...d, ...x } });
  const form = forms.find((f) => f.id === sample?.formId);
  const answers = d.showAnswers && sample?.answers ? Object.entries(sample.answers).filter(([q]) => !form || form.visibleQuestions.includes(q)) : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card title="Clinic's view of ad leads">
        <p className="mb-4 text-sm text-ink-600">The clinic never sees ad spend, campaign results or the plan. Choose how much they see about where each lead came from.</p>
        <div className="space-y-4">
          <Field label="Label for ad leads">
            <input className="input" value={d.sourceLabel} onChange={(e) => set({ sourceLabel: e.target.value })} placeholder="e.g. Online ad, Facebook / Instagram" />
          </Field>
          <label className="flex items-start gap-3">
            <Toggle on={d.showAnswers} onChange={() => set({ showAnswers: !d.showAnswers })} />
            <span className="text-sm">
              <span className="font-medium text-ink-800">Show lead form answers</span>
              <span className="block text-xs text-ink-500">Only the questions ticked “Clinic sees answer” in Lead forms.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Toggle on={d.showCampaign} onChange={() => set({ showCampaign: !d.showCampaign })} />
            <span className="text-sm">
              <span className="font-medium text-ink-800">Show campaign and form names</span>
              <span className="block text-xs text-ink-500">Off by default. Turn on if the clinic wants to know which offer a lead answered.</span>
            </span>
          </label>
        </div>
      </Card>
      <Card title="Preview: a lead as the clinic sees it">
        {sample ? (
          <div className="rounded-xl border border-ink-100 p-4 text-sm">
            <div className="font-semibold text-ink-900">{sample.name}</div>
            <div className="mt-1 flex items-center gap-2 text-ink-500">
              <span dir="ltr">{sample.phone}</span>
              <Badge className="bg-[#0866ff]/10 text-[#0866ff] ring-[#0866ff]/20">{d.sourceLabel}</Badge>
            </div>
            {(d.showCampaign || answers.length > 0) && (
              <div className="mt-3 rounded-lg bg-[#0866ff]/5 p-3">
                {d.showCampaign && (
                  <>
                    <div className="text-ink-700">Campaign: {campaigns.find((c) => c.id === sample.campaignId)?.name}</div>
                    <div className="text-ink-700">Form: {sample.formName}</div>
                  </>
                )}
                {answers.map(([q, a]) => (
                  <div key={q} className="flex justify-between text-xs">
                    <span className="text-ink-500">{q}</span>
                    <span className="font-medium">{a}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <span className="btn-primary pointer-events-none">Call</span>
              <span className="btn-secondary pointer-events-none">WhatsApp</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-400">No ad leads yet to preview.</p>
        )}
      </Card>
    </div>
  );
}

function SetupTab({ t }: { t: Tenant }) {
  const db = useDB();
  const plan = db.plans.find((p) => p.tenantId === t.id);
  const forms = db.leadForms.filter((f) => f.tenantId === t.id);
  const firstLead = db.leads.some((l) => l.tenantId === t.id && l.source === 'meta_ads');
  const used = new Map(db.tenants.filter((x) => x.metaAdAccountId && x.id !== t.id).map((x) => [x.metaAdAccountId!, x.name]));
  const [add, setAdd] = useState(false);
  const [a, setA] = useState({ id: '', name: '', currency: 'USD' });
  const [err, setErr] = useState('');
  const steps = [
    { done: db.meta.connected, label: 'Clinqo Business Manager connected', link: '/admin/meta' },
    { done: !!t.metaAdAccountId, label: 'Ad account connected to this clinic' },
    { done: !!t.metaPageName, label: 'Facebook page for lead forms set' },
    { done: !!plan?.approvedByClient, label: 'Marketing plan approved by the clinic', tab: 'plan' },
    { done: forms.length > 0, label: 'Lead forms synced', tab: 'forms' },
    { done: firstLead, label: 'First lead received in the clinic CRM' },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card title="Go-live checklist">
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-sm">
              {s.done ? <CheckCircle2 size={17} className="text-brand-600" /> : <Circle size={17} className="text-ink-200" />}
              <span className={s.done ? 'text-ink-700' : 'font-medium text-ink-900'}>{s.label}</span>
              {!s.done && s.link && (
                <Link to={s.link} className="ms-auto text-xs text-brand-700 underline">
                  Fix
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Card>
      <Card title="Ad account">
        {t.metaAdAccountId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0866ff] font-bold text-white">f</span>
            <div className="flex-1">
              <div className="font-medium text-ink-900">{db.meta.adAccounts.find((x) => x.id === t.metaAdAccountId)?.name ?? 'Ad account'}</div>
              <div className="text-xs text-ink-500">{t.metaAdAccountId}</div>
            </div>
            <a className="btn-secondary btn-sm" href={adsManagerUrl(t.metaAdAccountId)} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> Ads Manager
            </a>
            <button className="btn-danger btn-sm" onClick={() => db.assignAdAccount(t.id, undefined)}>
              <Unplug size={13} /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Connect an ad account from the Clinqo Business Manager">
              <select className="input" value="" onChange={(e) => e.target.value && db.assignAdAccount(t.id, e.target.value)} disabled={!db.meta.connected}>
                <option value="">— choose —</option>
                {db.meta.adAccounts.map((x) => (
                  <option key={x.id} value={x.id} disabled={used.has(x.id)}>
                    {x.name} · {x.id}
                    {used.has(x.id) ? ` (used by ${used.get(x.id)})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <button className="btn-secondary btn-sm" onClick={() => setAdd(true)} disabled={!db.meta.connected}>
              <Plus size={13} /> Add a new ad account ID
            </button>
          </div>
        )}
        <div className="mt-5 border-t border-ink-100 pt-4">
          <Field label="Facebook page running the lead forms">
            <input className="input" value={t.metaPageName ?? ''} onChange={(e) => db.updateTenant(t.id, { metaPageName: e.target.value })} placeholder="e.g. Smile Studio Dental Beirut" />
          </Field>
          <p className="mt-3 text-xs text-ink-500">
            The clinic gives Clinqo's Business Manager access to its page and ad account (partner access) in Meta Business Settings. Leads from the page's forms then arrive in this clinic's CRM. No WhatsApp or Instagram API and no
            verification per clinic.
          </p>
        </div>
      </Card>
      <Modal
        open={add}
        onClose={() => {
          setAdd(false);
          setErr('');
        }}
        title="Add and connect ad account"
        footer={
          <button
            className="btn-primary"
            onClick={() => {
              const e = db.addAdAccount({ ...a, tenantId: t.id });
              if (e) setErr(e);
              else {
                setAdd(false);
                setA({ id: '', name: '', currency: 'USD' });
              }
            }}
          >
            Add and connect
          </button>
        }
      >
        <div className="space-y-4">
          <Field label="Ad account ID *">
            <input className="input" autoFocus placeholder="act_1234567890" value={a.id} onChange={(e) => { setA({ ...a, id: e.target.value }); setErr(''); }} />
          </Field>
          <Field label="Name">
            <input className="input" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder={`${t.name} – Ads`} />
          </Field>
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState('');
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-700">
            {x}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim()) onChange([...items, v.trim()]);
          setV('');
        }}
      >
        <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="Add…" />
        <button className="btn-secondary">
          <Plus size={14} />
        </button>
      </form>
    </div>
  );
}

function PlanTab({ t, pacing }: { t: Tenant; pacing: { monthly: number; cpl: number; bookings30: number } }) {
  const plan = useDB((s) => s.plans.find((p) => p.tenantId === t.id));
  const { log } = useDB.getState();
  const save = (data: Partial<MarketingPlan>) =>
    useDB.setState((s) => ({
      plans: s.plans.some((p) => p.tenantId === t.id)
        ? s.plans.map((p) => (p.tenantId === t.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
        : [...s.plans, { tenantId: t.id, goal: '', monthlyBudget: 300, targetCPL: 6, targetBookings: 20, offers: [], audiences: [], channels: [], approvedByClient: false, phase: 'plan', updatedAt: new Date().toISOString(), ...data }],
    }));
  if (!t.modules.marketing)
    return <div className="card p-6 text-sm text-ink-500">Marketing is off for this tenant. Turn it on under Features to build a growth plan.</div>;
  if (!plan)
    return (
      <div className="card p-6">
        <button className="btn-primary" onClick={() => save({})}>
          Start marketing plan
        </button>
      </div>
    );
  const idx = PHASES.indexOf(plan.phase);
  return (
    <div className="space-y-6">
      <Card title="Growth phase">
        <div className="grid gap-2 sm:grid-cols-4">
          {PHASES.map((ph, i) => (
            <button
              key={ph}
              onClick={() => {
                save({ phase: ph });
                log(`${t.name} moved to phase: ${PHASE_LABEL[ph]}`, t.id);
              }}
              className={cx('rounded-lg border px-3 py-2.5 text-start text-sm', i === idx ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : i < idx ? 'border-brand-200 text-brand-700' : 'border-ink-100 text-ink-500')}
            >
              {PHASE_LABEL[ph]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <Toggle on={plan.approvedByClient} onChange={() => save({ approvedByClient: !plan.approvedByClient })} />
          <span className="text-ink-700">Client approved the plan</span>
          {!plan.approvedByClient && plan.phase !== 'plan' && <Badge className="bg-rose-50 text-rose-700 ring-rose-200">Not approved yet</Badge>}
        </div>
      </Card>
      <Card title="Pacing">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { label: 'Planned monthly spend', value: pacing.monthly, target: plan.monthlyBudget, fmt: (n: number) => usd(n), good: (v: number, t: number) => v <= t * 1.1 },
            { label: 'Cost per lead', value: pacing.cpl, target: plan.targetCPL, fmt: (n: number) => usd(n, 2), good: (v: number, t: number) => v <= t },
            { label: 'Consults booked', value: pacing.bookings30, target: plan.targetBookings, fmt: (n: number) => String(n), good: (v: number, t: number) => v >= t * 0.8 },
          ].map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs">
                <span className="text-ink-500">{m.label}</span>
                <span className={m.good(m.value, m.target) ? 'font-semibold text-brand-700' : 'font-semibold text-rose-600'}>
                  {m.fmt(m.value)} / {m.fmt(m.target)}
                </span>
              </div>
              <div className="mt-1.5">
                <Bar value={m.value} max={Math.max(m.value, m.target) || 1} color={m.good(m.value, m.target) ? 'bg-brand-500' : 'bg-rose-400'} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Plan">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Goal" className="sm:col-span-4">
            <input className="input" value={plan.goal} onChange={(e) => save({ goal: e.target.value })} placeholder="e.g. 40 new implant consultations per month" />
          </Field>
          <Field label="Monthly ad budget ($)">
            <input className="input" type="number" value={plan.monthlyBudget} onChange={(e) => save({ monthlyBudget: +e.target.value })} />
          </Field>
          <Field label="Target cost per lead ($)">
            <input className="input" type="number" value={plan.targetCPL} onChange={(e) => save({ targetCPL: +e.target.value })} />
          </Field>
          <Field label="Target bookings / month">
            <input className="input" type="number" value={plan.targetBookings} onChange={(e) => save({ targetBookings: +e.target.value })} />
          </Field>
          <div className="text-xs text-ink-500 sm:pt-6">
            Implied max cost per booking: <b className="text-ink-800">{plan.targetBookings ? usd(plan.monthlyBudget / plan.targetBookings) : '—'}</b>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <ListEditor label="Offers" items={plan.offers} onChange={(offers) => save({ offers })} />
          <ListEditor label="Audiences" items={plan.audiences} onChange={(audiences) => save({ audiences })} />
          <ListEditor label="Channels" items={plan.channels} onChange={(channels) => save({ channels })} />
        </div>
        <p className="mt-5 text-xs text-ink-400">Internal to Clinqo. The clinic does not see ad spend, campaigns or this plan.</p>
      </Card>
    </div>
  );
}

