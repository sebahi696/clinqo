import { CalendarPlus, CheckCircle2, CreditCard, FileSignature, MessageCircle, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BookingModal from '../../components/BookingModal';
import ToothChart from '../../components/ToothChart';
import { Badge, Card, Field, Modal, Stat, Tabs } from '../../components/ui';
import { fullName, useCan, useLookup, useSourceLabel } from '../../lib/hooks';
import type { Patient } from '../../lib/types';
import { fmtDate, fmtDateTime, STATUS_LABEL, STATUS_STYLE, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

type TabKey = 'timeline' | 'appointments' | 'chart' | 'notes' | 'consents' | 'packages' | 'invoices';

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const tenant = useTenant()!;
  const can = useCan();
  const patient = useDB((s) => s.patients.find((p) => p.id === id && p.tenantId === s.session.tenantId));
  const appts = useT('appointments').filter((a) => a.patientId === id);
  const invoices = useT('invoices').filter((i) => i.patientId === id);
  const notes = useT('notes').filter((n) => n.patientId === id);
  const consents = useT('consents').filter((c) => c.patientId === id);
  const pkgs = useT('patientPackages').filter((p) => p.patientId === id);
  const defs = useT('packageDefs');
  const campaigns = useT('campaigns');
  const label = useSourceLabel();
  const showCamp = !!tenant.leadDisplay?.showCampaign;
  const lk = useLookup();
  const { patch, insert } = useDB.getState();
  const [tab, setTab] = useState<TabKey>('timeline');
  const [booking, setBooking] = useState(false);
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState({ title: '', body: '' });
  const [form, setForm] = useState('');

  const timeline = useMemo(() => {
    const items: { at: string; kind: string; text: string; sub?: string }[] = [];
    if (patient) items.push({ at: patient.createdAt, kind: 'Joined', text: `Profile created from ${label(patient.source)}`, sub: showCamp ? campaigns.find((c) => c.id === patient.campaignId)?.name : undefined });
    appts.forEach((a) => items.push({ at: a.start, kind: 'Appointment', text: `${lk.service.get(a.serviceId)?.name} with ${lk.staff.get(a.staffId)?.name}`, sub: STATUS_LABEL[a.status] }));
    invoices.forEach((i) => items.push({ at: i.createdAt, kind: 'Payment', text: `Invoice ${i.number} · ${usd(i.total)}`, sub: i.items.map((x) => x.name).join(', ') }));
    notes.forEach((n) => items.push({ at: n.date, kind: 'Clinical note', text: n.title, sub: n.body }));
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [patient, appts, invoices, notes, lk, campaigns, showCamp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!patient) return <p className="text-ink-500">Not found.</p>;
  const spent = invoices.reduce((s, i) => s + i.total, 0);
  const due = invoices.reduce((s, i) => s + Math.max(0, i.total - i.payments.reduce((a, p) => a + p.amountUSD, 0)), 0);
  const camp = showCamp ? campaigns.find((c) => c.id === patient.campaignId) : undefined;
  const upcoming = appts.filter((a) => new Date(a.start) > new Date() && !['cancelled'].includes(a.status));
  const isDental = tenant.vertical === 'dental';

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'appointments', label: `Appointments (${appts.length})` },
    ...(can('clinical') && isDental ? [{ key: 'chart' as const, label: 'Dental chart' }] : []),
    ...(can('clinical') ? [{ key: 'notes' as const, label: `Notes (${notes.length})` }, { key: 'consents' as const, label: 'Consent forms' }] : []),
    ...(can('packages') ? [{ key: 'packages' as const, label: `Packages (${pkgs.length})` }] : []),
    ...(can('pos') ? [{ key: 'invoices' as const, label: `Invoices (${invoices.length})` }] : []),
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/app/patients" className="text-xs text-ink-400 hover:text-ink-700">
            ← All {tenant.vertical === 'spa' ? 'clients' : 'patients'}
          </Link>
          <h1 className="mt-1 font-display text-[26px] font-semibold text-ink-900">{fullName(patient)}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span dir="ltr">{patient.phone}</span>
            {patient.email && <span>· {patient.email}</span>}
            {patient.dob && <span>· born {fmtDate(patient.dob)}</span>}
            <Badge className={patient.source === 'meta_ads' ? 'bg-[#0866ff]/10 text-[#0866ff] ring-[#0866ff]/20' : undefined}>{label(patient.source)}</Badge>
            {patient.tags.map((t) => (
              <Badge key={t} className="bg-amber-50 text-amber-700 ring-amber-200">
                {t}
              </Badge>
            ))}
            {patient.allergies && <Badge className="bg-rose-50 text-rose-700 ring-rose-200">Allergy: {patient.allergies}</Badge>}
          </div>
          {camp && <p className="mt-1 text-xs text-ink-400">Acquired via “{camp.name}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
            <MessageCircle size={15} /> WhatsApp
          </a>
          <button className="btn-secondary" onClick={() => setEdit(true)}>
            <Pencil size={15} /> Edit
          </button>
          {can('pos') && (
            <button className="btn-secondary" onClick={() => nav(`/app/pos?patient=${patient.id}`)}>
              <CreditCard size={15} /> Checkout
            </button>
          )}
          {can('appointments') && (
            <button className="btn-primary" onClick={() => setBooking(true)}>
              <CalendarPlus size={15} /> Book
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Completed visits" value={appts.filter((a) => a.status === 'completed').length} hint={upcoming.length ? `Next: ${fmtDateTime(upcoming.sort((a, b) => a.start.localeCompare(b.start))[0].start)}` : 'No upcoming visit'} />
        <Stat label="Lifetime spend" value={usd(spent)} tone="brand" />
        <Stat label="Balance due" value={usd(due)} tone={due > 0 ? 'bad' : 'default'} />
        <Stat label="No-shows" value={appts.filter((a) => a.status === 'no_show').length} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'timeline' && (
        <Card>
          <ol className="relative space-y-5 border-s border-ink-100 ps-5">
            {timeline.map((e, i) => (
              <li key={i}>
                <span className="absolute -start-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                <div className="text-xs text-ink-400">
                  {fmtDateTime(e.at)} · {e.kind}
                </div>
                <div className="text-sm font-medium text-ink-800">{e.text}</div>
                {e.sub && <div className="text-xs text-ink-500">{e.sub}</div>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {tab === 'appointments' && (
        <Card pad={false}>
          <table className="w-full">
            <tbody className="divide-y divide-ink-50">
              {appts
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((a) => (
                  <tr key={a.id}>
                    <td className="td whitespace-nowrap">{fmtDateTime(a.start)}</td>
                    <td className="td">{lk.service.get(a.serviceId)?.name}</td>
                    <td className="td text-ink-500">{lk.staff.get(a.staffId)?.name}</td>
                    <td className="td">
                      <Badge className={STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'chart' && (
        <Card title="Dental chart">
          <ToothChart teeth={patient.teeth ?? {}} onChange={(tooth, s) => patch('patients', patient.id, { teeth: { ...(patient.teeth ?? {}), [tooth]: s } })} />
        </Card>
      )}

      {tab === 'notes' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Card title="New note">
            <Field label="Title / procedure">
              <input className="input" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} />
            </Field>
            <Field label="Notes" className="mt-3">
              <textarea className="input min-h-[120px]" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder="Findings, products & lot numbers used, aftercare…" />
            </Field>
            <button
              className="btn-primary mt-3"
              disabled={!note.title}
              onClick={() => {
                insert('notes', { id: uid('cn'), tenantId: tenant.id, patientId: patient.id, staffId: lk.staff.keys().next().value ?? '', date: new Date().toISOString(), ...note });
                setNote({ title: '', body: '' });
              }}
            >
              <Plus size={15} /> Save note
            </button>
          </Card>
          <div className="space-y-3">
            {notes
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((n) => (
                <div key={n.id} className="card p-4">
                  <div className="flex justify-between text-xs text-ink-400">
                    <span>{lk.staff.get(n.staffId)?.name}</span>
                    <span>{fmtDate(n.date)}</span>
                  </div>
                  <div className="mt-1 font-medium text-ink-800">{n.title}</div>
                  <p className="mt-1 text-sm text-ink-600">{n.body}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'consents' && (
        <Card title="Consent forms" actions={
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (form) { insert('consents', { id: uid('cs'), tenantId: tenant.id, patientId: patient.id, form }); setForm(''); } }}>
            <input className="input py-1.5 text-xs" placeholder="Form name (e.g. Laser consent)" value={form} onChange={(e) => setForm(e.target.value)} />
            <button className="btn-secondary btn-sm"><FileSignature size={13} /> Send</button>
          </form>
        }>
          {consents.length === 0 && <p className="text-sm text-ink-400">No forms yet.</p>}
          <ul className="divide-y divide-ink-50">
            {consents.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                <FileSignature size={15} className="text-ink-400" />
                <span className="flex-1">{c.form}</span>
                {c.signedAt ? (
                  <span className="flex items-center gap-1 text-xs text-brand-700">
                    <CheckCircle2 size={14} /> Signed {fmtDate(c.signedAt)}
                  </span>
                ) : (
                  <button className="btn-secondary btn-sm" onClick={() => patch('consents', c.id, { signedAt: new Date().toISOString() })}>
                    Mark signed
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'packages' && (
        <Card pad={false}>
          {pkgs.length === 0 && <p className="p-5 text-sm text-ink-400">No packages or memberships.</p>}
          <table className="w-full">
            <tbody className="divide-y divide-ink-50">
              {pkgs.map((p) => {
                const d = defs.find((x) => x.id === p.packageId);
                return (
                  <tr key={p.id}>
                    <td className="td font-medium">{d?.name}</td>
                    <td className="td">
                      {p.remaining}/{d?.sessions} sessions left
                    </td>
                    <td className="td text-ink-500">expires {fmtDate(p.expires)}</td>
                    <td className="td text-end">
                      <button className="btn-secondary btn-sm" disabled={p.remaining < 1} onClick={() => patch('patientPackages', p.id, { remaining: p.remaining - 1 })}>
                        Redeem session
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card pad={false}>
          <table className="w-full">
            <tbody className="divide-y divide-ink-50">
              {invoices
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((i) => (
                  <tr key={i.id}>
                    <td className="td font-medium">{i.number}</td>
                    <td className="td text-ink-500">{fmtDate(i.createdAt)}</td>
                    <td className="td">{i.items.map((x) => x.name).join(', ')}</td>
                    <td className="td text-end font-medium">{usd(i.total)}</td>
                    <td className="td">
                      <Badge className={i.status === 'paid' ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>{i.status}</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}

      <BookingModal open={booking} onClose={() => setBooking(false)} prefill={{ patientId: patient.id }} />
      <EditPatient open={edit} onClose={() => setEdit(false)} patient={patient} />
    </>
  );
}

function EditPatient({ open, onClose, patient }: { open: boolean; onClose: () => void; patient: Patient }) {
  const [f, setF] = useState(patient);
  const patch = useDB((s) => s.patch);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <button
          className="btn-primary"
          onClick={() => {
            patch('patients', patient.id, f);
            onClose();
          }}
        >
          Save
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input className="input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
        </Field>
        <Field label="Last name">
          <input className="input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Allergies">
          <input className="input" value={f.allergies ?? ''} onChange={(e) => setF({ ...f, allergies: e.target.value || undefined })} />
        </Field>
        <Field label="Tags (comma separated)">
          <input className="input" value={f.tags.join(', ')} onChange={(e) => setF({ ...f, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} /> Consents to marketing messages
        </label>
      </div>
    </Modal>
  );
}
