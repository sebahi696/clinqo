import { useEffect, useMemo, useState } from 'react';
import { fullName } from '../lib/hooks';
import { usd } from '../lib/utils';
import { useDB, useT } from '../store/db';
import { Field, Modal } from './ui';

export interface BookingPrefill {
  patientId?: string;
  staffId?: string;
  start?: Date;
  serviceId?: string;
}

export default function BookingModal({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: BookingPrefill }) {
  const patients = useT('patients');
  const services = useT('services');
  const staff = useT('staff').filter((s) => s.active);
  const appts = useT('appointments');
  const book = useDB((s) => s.book);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ patientId: '', serviceId: '', staffId: '', date: '', time: '10:00', deposit: 0, notes: '' });

  useEffect(() => {
    if (!open) return;
    const d = prefill?.start ?? new Date(Date.now() + 864e5);
    setF({
      patientId: prefill?.patientId ?? '',
      serviceId: prefill?.serviceId ?? services[0]?.id ?? '',
      staffId: prefill?.staffId ?? staff[0]?.id ?? '',
      date: d.toLocaleDateString('en-CA'),
      time: prefill?.start ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '10:00',
      deposit: 0,
      notes: '',
    });
    setQ('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const svc = services.find((s) => s.id === f.serviceId);
  const start = new Date(`${f.date}T${f.time}:00`);
  const clash = useMemo(() => {
    if (!svc || isNaN(start.getTime())) return undefined;
    const end = start.getTime() + svc.duration * 60000;
    return appts.find((a) => a.staffId === f.staffId && !['cancelled', 'no_show'].includes(a.status) && new Date(a.start).getTime() < end && new Date(a.start).getTime() + a.duration * 60000 > start.getTime());
  }, [appts, f.staffId, f.date, f.time, svc]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = q ? patients.filter((p) => (fullName(p) + p.phone).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const chosen = patients.find((p) => p.id === f.patientId);

  const submit = () => {
    if (!f.patientId || !svc) return;
    book({ patientId: f.patientId, serviceId: svc.id, staffId: f.staffId, start: start.toISOString(), duration: svc.duration, status: 'booked', deposit: f.deposit || undefined, notes: f.notes || undefined });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New booking"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!f.patientId || !svc} onClick={submit}>
            Book appointment
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Patient / client">
          {chosen ? (
            <div className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm">
              <span>
                <b>{fullName(chosen)}</b> <span className="text-ink-400">{chosen.phone}</span>
              </span>
              <button className="text-xs text-brand-700" onClick={() => setF({ ...f, patientId: '' })}>
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input className="input" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              {matches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ink-100 bg-white shadow-lg">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button className="w-full px-3 py-2 text-start text-sm hover:bg-sand-50" onClick={() => setF({ ...f, patientId: p.id })}>
                        {fullName(p)} <span className="text-ink-400">{p.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service">
            <select className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration}′ · {usd(s.price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <select className="input" value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <input className="input" type="time" step={900} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </Field>
          <Field label="Deposit taken ($)">
            <input className="input" type="number" min={0} value={f.deposit} onChange={(e) => setF({ ...f, deposit: +e.target.value })} />
          </Field>
          <Field label="Notes">
            <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
        </div>
        {clash && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">This provider already has an appointment overlapping this time.</p>}
      </div>
    </Modal>
  );
}
