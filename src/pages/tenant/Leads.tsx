import { CalendarPlus, Clock, Download, Megaphone, MessageCircle, Phone, Plus, Upload, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import BookingModal from '../../components/BookingModal';
import { Badge, Field, Modal, PageHeader, Stat } from '../../components/ui';
import { useCan } from '../../lib/hooks';
import type { Lead, LeadSource, LeadStage } from '../../lib/types';
import { ago, cx, download, fmtDateTime, parseCSV, pct, SOURCE_LABEL, STAGE_LABEL, STAGES, telLink, toCSV, uid, usd, waLink } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const STAGE_COLOR: Record<LeadStage, string> = {
  new: 'bg-coral-500',
  contacted: 'bg-sky-500',
  consult_booked: 'bg-indigo-500',
  attended: 'bg-amber-500',
  won: 'bg-brand-600',
  lost: 'bg-ink-300',
};

// Columns Meta's Leads Center / Ads Manager export uses
const META_COLS = new Set(['id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name', 'form_id', 'form_name', 'is_organic', 'platform', 'full_name', 'phone_number', 'email', 'lead_status', 'first_name', 'last_name', 'phone', 'name']);

export default function Leads() {
  const tenant = useTenant()!;
  const can = useCan();
  const leads = useT('leads');
  const campaigns = useT('campaigns');
  const services = useT('services');
  const { moveLead, insert, importLeads } = useDB.getState();
  const [src, setSrc] = useState<'all' | LeadSource>('all');
  const [camp, setCamp] = useState('all');
  const [drag, setDrag] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [imp, setImp] = useState(false);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | undefined>();
  const [f, setF] = useState({ name: '', phone: '', interest: '', source: 'walk_in' as LeadSource, value: 0 });

  const list = leads.filter((l) => (src === 'all' || l.source === src) && (camp === 'all' || l.campaignId === camp));
  const responded = list.filter((l) => l.firstResponseMins !== undefined);
  const avgResp = responded.length ? responded.reduce((s, l) => s + l.firstResponseMins!, 0) / responded.length : 0;
  const won = list.filter((l) => l.stage === 'won').length;
  const closed = list.filter((l) => l.stage === 'won' || l.stage === 'lost').length;
  const sel = leads.find((l) => l.id === selId);

  // Test-build stand-in for Meta's leadgen webhook
  const simulateMetaLead = () => {
    const names = ['Nour Saad', 'Karim Fares', 'Lea Haddad', 'Ali Itani', 'Rita Khoury', 'Tala Aoun', 'Jad Bitar'];
    const c = campaigns.length ? campaigns[Math.floor(Math.random() * campaigns.length)] : undefined;
    const svc = services[Math.floor(Math.random() * services.length)];
    const id = uid('ld');
    insert('leads', {
      id,
      tenantId: tenant.id,
      name: names[Math.floor(Math.random() * names.length)],
      phone: `+961 7${Math.floor(Math.random() * 9)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
      source: 'meta_ads',
      campaignId: c?.id,
      interest: svc.name,
      stage: 'new',
      value: svc.price,
      createdAt: new Date().toISOString(),
      formName: c ? `${c.name} – form` : `${svc.name} – lead form`,
      answers: { 'What are you interested in?': svc.name, 'Best time to call?': 'After 5pm', Area: 'Beirut' },
    });
    setSelId(id);
  };

  const runImport = () => {
    const rows = parseCSV(csv);
    const mapped = rows
      .map((r) => {
        const name = r.full_name || r.name || [r.first_name, r.last_name].filter(Boolean).join(' ');
        const phone = (r.phone_number || r.phone || '').replace(/^p:/, '');
        const campaign = campaigns.find((c) => r.campaign_name && c.name.toLowerCase() === r.campaign_name.toLowerCase());
        const answers = Object.fromEntries(Object.entries(r).filter(([k, v]) => !META_COLS.has(k) && v));
        const fromMeta = !!(r.form_name || r.campaign_name || r.ad_name);
        const interest = r.interest || Object.values(answers)[0] || r.form_name || '';
        const t = r.created_time ? new Date(r.created_time) : null;
        return {
          name,
          phone,
          source: (fromMeta ? 'meta_ads' : (r.source as LeadSource) || 'import') as LeadSource,
          campaignId: campaign?.id,
          interest,
          value: services.find((s) => interest && s.name.toLowerCase().includes(interest.toLowerCase().split(' ')[0]))?.price ?? 0,
          formName: r.form_name || undefined,
          answers: Object.keys(answers).length ? answers : undefined,
          createdAt: t && !isNaN(t.getTime()) ? t.toISOString() : undefined,
        };
      })
      .filter((x) => x.name && x.phone);
    setResult(importLeads(mapped));
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Leads from Meta lead form ads arrive here automatically. Call or WhatsApp them, then drag them through the pipeline."
        actions={
          <>
            <button className="btn-secondary" onClick={simulateMetaLead} title="Test build: simulates a lead form submission from a Meta ad">
              <Megaphone size={15} /> Simulate Meta lead
            </button>
            <button className="btn-secondary" onClick={() => setImp(true)}>
              <Upload size={15} /> Import
            </button>
            <button className="btn-secondary" onClick={() => download(`leads-${tenant.name}.csv`, toCSV(list.map((l) => ({ name: l.name, phone: l.phone, source: SOURCE_LABEL[l.source], campaign: campaigns.find((c) => c.id === l.campaignId)?.name ?? '', form: l.formName ?? '', interest: l.interest, stage: STAGE_LABEL[l.stage], created: l.createdAt }))))}>
              <Download size={15} /> Export
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Add lead
            </button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads in view" value={list.length} hint={`${list.filter((l) => l.source === 'meta_ads').length} from Meta lead ads`} />
        <Stat label="Waiting for a call" value={list.filter((l) => l.stage === 'new').length} tone={list.some((l) => l.stage === 'new') ? 'bad' : 'default'} hint="Call within 15 minutes" />
        <Stat label="Avg. time to first contact" value={`${Math.round(avgResp)} min`} icon={<Clock size={16} />} hint={avgResp > 15 ? 'Slower than 15 min target' : 'On target'} tone={avgResp > 15 ? 'bad' : 'good'} />
        <Stat label="Win rate (closed leads)" value={pct(won / Math.max(1, closed))} tone="brand" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="input w-auto py-1.5" value={src} onChange={(e) => setSrc(e.target.value as LeadSource | 'all')}>
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {campaigns.length > 0 && (
          <select className="input w-auto py-1.5" value={camp} onChange={(e) => setCamp(e.target.value)}>
            <option value="all">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const col = list.filter((l) => l.stage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag) moveLead(drag, stage);
                setDrag(null);
              }}
              className="flex w-64 shrink-0 flex-col rounded-xl bg-ink-50/70 p-2"
            >
              <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                <span className={cx('h-2 w-2 rounded-full', STAGE_COLOR[stage])} />
                <span className="text-xs font-semibold text-ink-700">{STAGE_LABEL[stage]}</span>
                <span className="ms-auto text-xs text-ink-400">{col.length}</span>
              </div>
              <div className="scrollbar-thin max-h-[60vh] space-y-2 overflow-y-auto">
                {col.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={() => setDrag(l.id)}
                    onClick={() => setSelId(l.id)}
                    className={cx('cursor-pointer rounded-lg border border-ink-100 bg-white p-3 shadow-sm hover:border-brand-300', drag === l.id && 'opacity-50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-ink-900">{l.name}</span>
                      <span className="shrink-0 text-[10px] text-ink-400">{ago(l.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-500">{l.interest}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-medium', l.source === 'meta_ads' ? 'bg-[#0866ff]/10 text-[#0866ff]' : 'bg-ink-50 text-ink-500')}>{SOURCE_LABEL[l.source]}</span>
                      <span className="text-xs font-medium text-ink-600">{usd(l.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead detail */}
      <Modal open={!!sel} onClose={() => setSelId(null)} title={sel?.name ?? ''}>
        {sel && <LeadDetail lead={sel} onBook={(pid) => { setSelId(null); setBooking(pid); }} canBook={can('appointments')} />}
      </Modal>
      <BookingModal open={booking !== undefined} onClose={() => setBooking(undefined)} prefill={{ patientId: booking }} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add lead"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name || !f.phone}
            onClick={() => {
              insert('leads', { id: uid('ld'), tenantId: tenant.id, ...f, stage: 'new', createdAt: new Date().toISOString() });
              setOpen(false);
              setF({ name: '', phone: '', interest: '', source: 'walk_in', value: 0 });
            }}
          >
            Add lead
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+961" />
          </Field>
          <Field label="Interested in">
            <input className="input" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })} />
          </Field>
          <Field label="Source">
            <select className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as LeadSource })}>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated value ($)">
            <input className="input" type="number" value={f.value} onChange={(e) => setF({ ...f, value: +e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={imp}
        onClose={() => {
          setImp(false);
          setCsv('');
          setResult(null);
        }}
        title="Import leads"
        wide
        footer={
          <button className="btn-primary" disabled={!csv} onClick={runImport}>
            Import
          </button>
        }
      >
        <p className="text-sm text-ink-600">
          Upload the CSV you download from Meta's <b>Leads Center</b> or Ads Manager, or any sheet with <code className="rounded bg-ink-50 px-1">full_name, phone_number</code> (or <code className="rounded bg-ink-50 px-1">name, phone</code>). Campaign and form names are matched automatically; extra columns are kept as form answers. Duplicate phone numbers are skipped.
        </p>
        <button
          className="btn-ghost btn-sm mt-2"
          onClick={() => download('clinqo-leads-template.csv', 'created_time,campaign_name,form_name,full_name,phone_number,email,what_are_you_interested_in?\n2026-11-20T10:15:00+0200,' + (campaigns[0]?.name ?? 'My campaign') + ',Implant consult form,Maya Khoury,+961 70 123 456,maya@gmail.com,Implants\n')}
        >
          <Download size={13} /> Download example file
        </button>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-3 block text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setCsv(await file.text());
          }}
        />
        <textarea className="input mt-3 min-h-[120px] font-mono text-xs" placeholder="…or paste CSV here" value={csv} onChange={(e) => setCsv(e.target.value)} />
        {result !== null && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Imported {result} new leads.</p>}
      </Modal>
    </>
  );
}

function LeadDetail({ lead, onBook, canBook }: { lead: Lead; onBook: (patientId: string) => void; canBook: boolean }) {
  const tenant = useTenant()!;
  const campaigns = useT('campaigns');
  const { moveLead, patch, convertLead } = useDB.getState();
  const camp = campaigns.find((c) => c.id === lead.campaignId);
  const first = lead.name.split(' ')[0];
  const contacted = () => lead.stage === 'new' && moveLead(lead.id, 'contacted');
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-ink-500">
        <span dir="ltr">{lead.phone}</span>·<span>{fmtDateTime(lead.createdAt)}</span>
        <Badge className={lead.source === 'meta_ads' ? 'bg-[#0866ff]/10 text-[#0866ff] ring-[#0866ff]/20' : undefined}>{SOURCE_LABEL[lead.source]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn-primary" href={telLink(lead.phone)} onClick={contacted}>
          <Phone size={15} /> Call
        </a>
        <a className="btn-secondary" target="_blank" rel="noreferrer" href={waLink(lead.phone, `Hi ${first}, this is ${tenant.name}. Thanks for your interest in ${lead.interest}! When would suit you for a visit?`)} onClick={contacted}>
          <MessageCircle size={15} /> WhatsApp
        </a>
      </div>
      {(camp || lead.formName) && (
        <div className="rounded-lg bg-[#0866ff]/5 p-3">
          <div className="text-[10px] font-semibold uppercase text-[#0866ff]">Meta lead ad</div>
          {camp && <div className="text-ink-700">Campaign: {camp.name}</div>}
          {lead.formName && <div className="text-ink-700">Form: {lead.formName}</div>}
          {lead.answers && (
            <dl className="mt-2 space-y-1 border-t border-[#0866ff]/10 pt-2">
              {Object.entries(lead.answers).map(([q, a]) => (
                <div key={q} className="flex justify-between gap-3 text-xs">
                  <dt className="text-ink-500">{q}</dt>
                  <dd className="font-medium text-ink-800">{a}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pipeline stage">
          <select className="input" value={lead.stage} onChange={(e) => moveLead(lead.id, e.target.value as LeadStage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interested in">
          <input className="input" value={lead.interest} onChange={(e) => patch('leads', lead.id, { interest: e.target.value })} />
        </Field>
      </div>
      <Field label="Call notes">
        <textarea className="input min-h-[70px]" value={lead.note ?? ''} onChange={(e) => patch('leads', lead.id, { note: e.target.value })} placeholder="e.g. Wants a quote for 2 implants, call back Thursday" />
      </Field>
      {lead.firstResponseMins !== undefined && (
        <p className="text-xs text-ink-500">
          First contact after <b className={lead.firstResponseMins > 15 ? 'text-rose-600' : 'text-brand-700'}>{lead.firstResponseMins} min</b>
        </p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        {lead.patientId ? (
          <Link to={`/app/patients/${lead.patientId}`} className="btn-secondary">
            Open profile
          </Link>
        ) : (
          <button className="btn-secondary" onClick={() => convertLead(lead.id)}>
            <UserPlus size={15} /> Create {tenant.vertical === 'spa' ? 'client' : 'patient'}
          </button>
        )}
        {canBook && (
          <button className="btn-primary" onClick={() => onBook(convertLead(lead.id))}>
            <CalendarPlus size={15} /> Book appointment
          </button>
        )}
      </div>
    </div>
  );
}
