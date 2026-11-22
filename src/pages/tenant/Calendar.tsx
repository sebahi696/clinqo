import { ChevronLeft, ChevronRight, CreditCard, MessageCircle, Phone, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookingModal, { type BookingPrefill } from '../../components/BookingModal';
import { Avatar, Badge, Modal, PageHeader } from '../../components/ui';
import { fullName, useCan, useLookup, usePatientMap } from '../../lib/hooks';
import type { AppointmentStatus } from '../../lib/types';
import { addDays, cx, fmtDay, fmtTime, sameDay, startOfDay, STATUS_LABEL, STATUS_STYLE, telLink, usd, waLink } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const START = 8;
const END = 20;
const HOUR = 64; // px per hour

export default function Calendar() {
  const [day, setDay] = useState(startOfDay());
  const [prefill, setPrefill] = useState<BookingPrefill | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const staff = useT('staff').filter((s) => s.active);
  const appts = useT('appointments');
  const patients = usePatientMap();
  const lk = useLookup();
  const can = useCan();
  const nav = useNavigate();
  const { setAppointmentStatus } = useDB.getState();
  const tenant = useTenant()!;

  const todays = appts.filter((a) => sameDay(new Date(a.start), day) && a.status !== 'cancelled');
  const sel = appts.find((a) => a.id === selId);
  const week = Array.from({ length: 7 }, (_, i) => addDays(day, i - ((day.getDay() + 6) % 7)));
  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START) * HOUR;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={`${todays.length} appointments · ${todays.filter((a) => a.status === 'confirmed').length} confirmed`}
        actions={
          <button className="btn-primary" onClick={() => setPrefill({ start: new Date(day.getTime() + 10 * 36e5) })}>
            <Plus size={15} /> New booking
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary btn-sm" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
          <ChevronLeft size={15} className="rtl:rotate-180" />
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setDay(startOfDay())}>
          Today
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
          <ChevronRight size={15} className="rtl:rotate-180" />
        </button>
        <div className="ms-2 flex gap-1 overflow-x-auto">
          {week.map((d) => {
            const n = appts.filter((a) => sameDay(new Date(a.start), d) && a.status !== 'cancelled').length;
            return (
              <button key={d.toISOString()} onClick={() => setDay(d)} className={cx('rounded-lg px-3 py-1.5 text-xs', sameDay(d, day) ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-ink-50')}>
                <div className="font-semibold">{fmtDay(d.toISOString())}</div>
                <div className={sameDay(d, day) ? 'text-ink-300' : 'text-ink-400'}>{n} appts</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${staff.length}, minmax(160px, 1fr))` }}>
          <div className="border-b border-ink-100" />
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border-b border-s border-ink-100 px-3 py-2.5">
              <Avatar name={s.name} color={s.color} size={26} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink-800">{s.name}</div>
                <div className="truncate text-[11px] text-ink-400">{s.title}</div>
              </div>
            </div>
          ))}
          <div className="relative" style={{ height: (END - START) * HOUR }}>
            {Array.from({ length: END - START }, (_, i) => (
              <div key={i} className="absolute end-2 text-[10px] text-ink-400" style={{ top: i * HOUR - 6 }}>
                {i ? `${START + i}:00` : ''}
              </div>
            ))}
          </div>
          {staff.map((s) => (
            <div key={s.id} className="relative border-s border-ink-100" style={{ height: (END - START) * HOUR }}>
              {Array.from({ length: (END - START) * 2 }, (_, i) => (
                <button
                  key={i}
                  className={cx('absolute inset-x-0 hover:bg-brand-50/60', i % 2 ? 'border-b border-ink-50' : 'border-b border-dashed border-ink-50')}
                  style={{ top: (i * HOUR) / 2, height: HOUR / 2 }}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(START + Math.floor(i / 2), (i % 2) * 30);
                    setPrefill({ staffId: s.id, start: d });
                  }}
                  aria-label="Book this slot"
                />
              ))}
              {todays
                .filter((a) => a.staffId === s.id)
                .map((a) => {
                  const d = new Date(a.start);
                  const top = (d.getHours() + d.getMinutes() / 60 - START) * HOUR;
                  const h = (a.duration / 60) * HOUR;
                  const p = patients.get(a.patientId);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelId(a.id)}
                      className={cx('absolute inset-x-1 overflow-hidden rounded-md border-s-[3px] px-2 py-1 text-start text-xs shadow-sm transition hover:shadow-md', a.status === 'no_show' ? 'bg-rose-50' : a.status === 'completed' ? 'bg-ink-50' : 'bg-white ring-1 ring-ink-100')}
                      style={{ top, height: Math.max(h - 2, 22), borderColor: s.color }}
                    >
                      <div className="truncate font-semibold text-ink-800">{fullName(p)}</div>
                      {h > 34 && <div className="truncate text-ink-500">{lk.service.get(a.serviceId)?.name}</div>}
                      {h > 52 && <div className="mt-0.5 text-[10px] text-ink-400">{fmtTime(a.start)} · {STATUS_LABEL[a.status]}</div>}
                    </button>
                  );
                })}
              {sameDay(day, now) && nowTop > 0 && nowTop < (END - START) * HOUR && <div className="pointer-events-none absolute inset-x-0 h-0.5 bg-coral-500" style={{ top: nowTop }} />}
            </div>
          ))}
        </div>
      </div>

      <BookingModal open={!!prefill} onClose={() => setPrefill(null)} prefill={prefill ?? undefined} />

      <Modal open={!!sel} onClose={() => setSelId(null)} title="Appointment">
        {sel && (
          <div className="space-y-4 text-sm">
            <div>
              <Link to={`/app/patients/${sel.patientId}`} className="text-lg font-semibold text-ink-900 hover:text-brand-700">
                {fullName(patients.get(sel.patientId))}
              </Link>
              <div className="text-ink-500">
                {lk.service.get(sel.serviceId)?.name} · {usd(lk.service.get(sel.serviceId)?.price ?? 0)} · with {lk.staff.get(sel.staffId)?.name}
              </div>
              <div className="text-ink-500">
                {fmtDay(sel.start)} at {fmtTime(sel.start)} · {sel.duration} min
              </div>
              {sel.deposit && <Badge className="mt-2 bg-brand-50 text-brand-700 ring-brand-200">Deposit {usd(sel.deposit)}</Badge>}
            </div>
            <div>
              <div className="label">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {(['booked', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'] as AppointmentStatus[]).map((s) => (
                  <button key={s} onClick={() => setAppointmentStatus(sel.id, s)} className={cx('badge cursor-pointer', STATUS_STYLE[s], sel.status === s ? 'ring-2' : 'opacity-60 hover:opacity-100')}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
              <a
                className="btn-secondary"
                target="_blank"
                rel="noreferrer"
                href={waLink(patients.get(sel.patientId)?.phone ?? '', `Hi ${patients.get(sel.patientId)?.firstName}, this is ${tenant.name}. Reminder of your ${lk.service.get(sel.serviceId)?.name} on ${fmtDay(sel.start)} at ${fmtTime(sel.start)}. Please confirm 🙏`)}
              >
                <MessageCircle size={15} /> WhatsApp reminder
              </a>
              <a className="btn-secondary" href={telLink(patients.get(sel.patientId)?.phone ?? '')}>
                <Phone size={15} /> Call
              </a>
              {can('pos') && !sel.invoiceId && sel.status !== 'cancelled' && (
                <button className="btn-primary" onClick={() => nav(`/app/pos?appointment=${sel.id}`)}>
                  <CreditCard size={15} /> Checkout
                </button>
              )}
              {sel.invoiceId && <Badge className="bg-brand-50 text-brand-700 ring-brand-200">Paid</Badge>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
