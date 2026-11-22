import { Plus, Send, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Field, Modal, PageHeader, Toggle } from '../../components/ui';
import { fullName, usePatientMap } from '../../lib/hooks';
import { fmtDate, num, uid } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const TRIGGERS = ['24h before appointment', '2h before appointment', 'Lead with no booking after 2h', 'Appointment marked no-show', '2h after completed visit', 'Service recall date reached', 'Patient birthday', 'Package expiring in 14 days', 'No visit in 90 days'];

export default function Automations() {
  const tenant = useTenant()!;
  const autos = useT('automations');
  const appts = useT('appointments');
  const services = useT('services');
  const patients = usePatientMap();
  const { patch, insert, log } = useDB.getState();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', trigger: TRIGGERS[0], message: '' });
  const [sent, setSent] = useState<Set<string>>(new Set());

  const recalls = useMemo(() => {
    const last = new Map<string, { at: string; serviceId: string }>();
    for (const a of appts) if (a.status === 'completed') {
      const cur = last.get(a.patientId);
      if (!cur || a.start > cur.at) last.set(a.patientId, { at: a.start, serviceId: a.serviceId });
    }
    const future = new Set(appts.filter((a) => new Date(a.start) > new Date() && a.status !== 'cancelled').map((a) => a.patientId));
    const out: { patientId: string; service: string; due: Date }[] = [];
    last.forEach((v, pid) => {
      const s = services.find((x) => x.id === v.serviceId);
      if (!s?.recallDays || future.has(pid)) return;
      const due = new Date(new Date(v.at).getTime() + s.recallDays * 864e5);
      if (due.getTime() < Date.now() + 7 * 864e5) out.push({ patientId: pid, service: s.name, due });
    });
    return out.sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [appts, services]);

  return (
    <>
      <PageHeader
        title="Automations"
        subtitle="WhatsApp flows triggered by real clinic events. Templates are pre-approved WhatsApp message templates in the live build."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> New flow
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {autos.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${a.enabled ? 'bg-brand-50 text-brand-700' : 'bg-ink-50 text-ink-300'}`}>
                  <Zap size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink-900">{a.name}</span>
                    <Toggle on={a.enabled} onChange={() => patch('automations', a.id, { enabled: !a.enabled })} />
                  </div>
                  <div className="text-xs text-ink-400">
                    When: {a.trigger} · via WhatsApp · {num(a.sent)} sent
                  </div>
                  <textarea className="input mt-2 min-h-[60px] text-xs" value={a.message} onChange={(e) => patch('automations', a.id, { message: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-ink-400">Variables: {'{first_name} {service} {time} {clinic} {interest} {booking_link} {review_link}'}</p>
        </div>
        <Card title={`Recalls due (${recalls.length})`} pad={false}>
          <ul className="scrollbar-thin max-h-[560px] divide-y divide-ink-50 overflow-y-auto">
            {recalls.length === 0 && <li className="p-5 text-sm text-ink-400">Nobody is due for a recall this week.</li>}
            {recalls.map((r) => (
              <li key={r.patientId} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/app/patients/${r.patientId}`} className="text-sm font-medium text-ink-800 hover:text-brand-700">
                    {fullName(patients.get(r.patientId))}
                  </Link>
                  <div className="text-xs text-ink-400">
                    {r.service} · due {fmtDate(r.due.toISOString())}
                  </div>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  disabled={sent.has(r.patientId)}
                  onClick={() => {
                    setSent(new Set(sent).add(r.patientId));
                    const flow = autos.find((x) => x.trigger === 'Service recall date reached');
                    if (flow) patch('automations', flow.id, { sent: flow.sent + 1 });
                    log(`Recall sent to ${fullName(patients.get(r.patientId))}`, tenant.id);
                  }}
                >
                  <Send size={12} /> {sent.has(r.patientId) ? 'Sent' : 'Send'}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New automation"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name || !f.message}
            onClick={() => {
              insert('automations', { id: uid('au'), tenantId: tenant.id, ...f, channel: 'whatsapp', enabled: true, sent: 0 });
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
          <Field label="Trigger">
            <select className="input" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })}>
              {TRIGGERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="WhatsApp message">
            <textarea className="input min-h-[100px]" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Hi {first_name}, …" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
