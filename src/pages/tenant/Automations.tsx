import { Check, MessageCircle, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Field, Modal, PageHeader, Tabs, Toggle } from '../../components/ui';
import { fullName, useLookup, usePatientMap } from '../../lib/hooks';
import type { Automation, Patient } from '../../lib/types';
import { addDays, fillTemplate, fmtDate, fmtDay, fmtTime, num, sameDay, uid, waLink } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const TRIGGERS = ['24h before appointment', 'Lead with no booking after 2h', 'Appointment marked no-show', '2h after completed visit', 'Service recall date reached', 'Patient birthday', 'No visit in 90 days'];

type Row = { key: string; patient: Patient; detail: string; vars: Record<string, string> };
type TabKey = 'reminders' | 'recalls' | 'noshows' | 'reviews' | 'templates';

// Messages open in WhatsApp (wa.me click-to-chat) prefilled from the template.
// No WhatsApp API, no business verification: staff press send on their own phone or WhatsApp Web.
export default function Automations() {
  const tenant = useTenant()!;
  const autos = useT('automations');
  const appts = useT('appointments');
  const services = useT('services');
  const patients = usePatientMap();
  const lk = useLookup();
  const { patch, insert } = useDB.getState();
  const [tab, setTab] = useState<TabKey>('reminders');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', trigger: TRIGGERS[0], message: '' });
  const [done, setDone] = useState<Set<string>>(new Set());
  const tpl = (trigger: string) => autos.find((a) => a.trigger === trigger);

  const lists = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    const base = (pid: string) => ({ first_name: patients.get(pid)?.firstName ?? '', clinic: tenant.name });
    const reminders: Row[] = appts
      .filter((a) => sameDay(new Date(a.start), tomorrow) && ['booked', 'confirmed'].includes(a.status) && patients.get(a.patientId))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((a) => ({ key: a.id, patient: patients.get(a.patientId)!, detail: `${lk.service.get(a.serviceId)?.name} · ${fmtDay(a.start)} ${fmtTime(a.start)}`, vars: { ...base(a.patientId), service: lk.service.get(a.serviceId)?.name ?? '', time: fmtTime(a.start) } }));
    const noshows: Row[] = appts
      .filter((a) => a.status === 'no_show' && Date.now() - new Date(a.start).getTime() < 14 * 864e5 && patients.get(a.patientId))
      .map((a) => ({ key: a.id, patient: patients.get(a.patientId)!, detail: `Missed ${lk.service.get(a.serviceId)?.name} on ${fmtDate(a.start)}`, vars: { ...base(a.patientId), service: lk.service.get(a.serviceId)?.name ?? '' } }));
    const reviews: Row[] = appts
      .filter((a) => a.status === 'completed' && Date.now() - new Date(a.start).getTime() < 2 * 864e5 && patients.get(a.patientId))
      .map((a) => ({ key: a.id, patient: patients.get(a.patientId)!, detail: `${lk.service.get(a.serviceId)?.name} on ${fmtDate(a.start)}`, vars: { ...base(a.patientId), review_link: 'https://g.page/r/your-review-link' } }));
    const last = new Map<string, { at: string; serviceId: string }>();
    for (const a of appts)
      if (a.status === 'completed') {
        const cur = last.get(a.patientId);
        if (!cur || a.start > cur.at) last.set(a.patientId, { at: a.start, serviceId: a.serviceId });
      }
    const future = new Set(appts.filter((a) => new Date(a.start) > new Date() && a.status !== 'cancelled').map((a) => a.patientId));
    const recalls: Row[] = [];
    last.forEach((v, pid) => {
      const s = services.find((x) => x.id === v.serviceId);
      const p = patients.get(pid);
      if (!s?.recallDays || future.has(pid) || !p) return;
      const due = new Date(new Date(v.at).getTime() + s.recallDays * 864e5);
      if (due.getTime() < Date.now() + 7 * 864e5) recalls.push({ key: pid, patient: p, detail: `${s.name} · due ${fmtDate(due.toISOString())}`, vars: { ...base(pid), service: s.name, booking_link: '' } });
    });
    return { reminders, noshows, reviews, recalls };
  }, [appts, services, patients, lk, tenant.name]);

  const renderList = (rows: Row[], a?: Automation) => (
    <Card pad={false}>
      {a && !a.enabled && <p className="border-b border-ink-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">This follow-up is switched off in Templates.</p>}
      <ul className="divide-y divide-ink-50">
        {rows.length === 0 && <li className="p-6 text-sm text-ink-400">Nothing to send right now.</li>}
        {rows.map((r) => {
          const msg = fillTemplate(a?.message ?? '', r.vars);
          const k = r.key + (a?.id ?? '');
          return (
            <li key={r.key} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Link to={`/app/patients/${r.patient.id}`} className="text-sm font-medium text-ink-800 hover:text-brand-700">
                  {fullName(r.patient)}
                </Link>
                <div className="text-xs text-ink-400">{r.detail}</div>
              </div>
              {done.has(k) ? (
                <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
                  <Check size={14} /> Sent
                </span>
              ) : (
                <a
                  className="btn-secondary btn-sm"
                  target="_blank"
                  rel="noreferrer"
                  href={waLink(r.patient.phone, msg)}
                  onClick={() => {
                    setDone(new Set(done).add(k));
                    if (a) patch('automations', a.id, { sent: a.sent + 1 });
                  }}
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="Daily lists of who to remind, recall and thank. One click opens WhatsApp with the message ready, no messaging API needed."
        actions={
          tab === 'templates' && (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> New template
            </button>
          )
        }
      />
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'reminders', label: `Tomorrow's reminders (${lists.reminders.length})` },
          { key: 'recalls', label: `Recalls due (${lists.recalls.length})` },
          { key: 'noshows', label: `No-shows (${lists.noshows.length})` },
          { key: 'reviews', label: `Review requests (${lists.reviews.length})` },
          { key: 'templates', label: 'Templates' },
        ]}
      />
      {tab === 'reminders' && renderList(lists.reminders, tpl('24h before appointment'))}
      {tab === 'recalls' && renderList(lists.recalls, tpl('Service recall date reached'))}
      {tab === 'noshows' && renderList(lists.noshows, tpl('Appointment marked no-show'))}
      {tab === 'reviews' && renderList(lists.reviews, tpl('2h after completed visit'))}
      {tab === 'templates' && (
        <div className="space-y-3">
          {autos.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-ink-900">{a.name}</span>
                  <div className="text-xs text-ink-400">
                    When: {a.trigger} · {num(a.sent)} sent
                  </div>
                </div>
                <Toggle on={a.enabled} onChange={() => patch('automations', a.id, { enabled: !a.enabled })} />
              </div>
              <textarea className="input mt-2 min-h-[60px] text-xs" value={a.message} onChange={(e) => patch('automations', a.id, { message: e.target.value })} />
            </div>
          ))}
          <p className="text-xs text-ink-400">Variables: {'{first_name} {service} {time} {clinic} {review_link} {booking_link}'}</p>
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New template"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name || !f.message}
            onClick={() => {
              insert('automations', { id: uid('au'), tenantId: tenant.id, ...f, enabled: true, sent: 0 });
              setOpen(false);
              setF({ name: '', trigger: TRIGGERS[0], message: '' });
            }}
          >
            Create
          </button>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="When">
            <select className="input" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })}>
              {TRIGGERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Message">
            <textarea className="input min-h-[100px]" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Hi {first_name}, …" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
