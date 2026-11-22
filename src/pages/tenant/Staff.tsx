import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Field, Modal, PageHeader, Toggle } from '../../components/ui';
import { sameDay, uid } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const COLORS = ['#1f9880', '#e46a48', '#6366f1', '#d97706', '#0ea5e9', '#a855f7', '#be185d'];

export default function StaffPage() {
  const tenant = useTenant()!;
  const staff = useT('staff');
  const appts = useT('appointments');
  const { patch, insert } = useDB.getState();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', title: '', commissionRate: 10, color: COLORS[2] });
  const today = new Date();

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Doctors, therapists and front desk. Each provider gets a calendar column and a commission rate."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add staff
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => {
          const todayN = appts.filter((a) => a.staffId === s.id && sameDay(new Date(a.start), today) && a.status !== 'cancelled').length;
          return (
            <div key={s.id} className={`card p-5 ${s.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <Avatar name={s.name} color={s.color} size={40} />
                <div className="flex-1">
                  <div className="font-semibold text-ink-900">{s.name}</div>
                  <div className="text-xs text-ink-500">{s.title}</div>
                </div>
                <Toggle on={s.active} onChange={() => patch('staff', s.id, { active: !s.active })} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Commission %">
                  <input className="input py-1.5" type="number" value={s.commissionRate} onChange={(e) => patch('staff', s.id, { commissionRate: +e.target.value })} />
                </Field>
                <div>
                  <span className="label">Today</span>
                  <div className="py-1.5 font-medium">{todayN} appointments</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add staff member"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name}
            onClick={() => {
              insert('staff', { id: uid('st'), tenantId: tenant.id, ...f, active: true });
              setOpen(false);
            }}
          >
            Save
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Title">
            <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Hygienist" />
          </Field>
          <Field label="Commission %">
            <input className="input" type="number" value={f.commissionRate} onChange={(e) => setF({ ...f, commissionRate: +e.target.value })} />
          </Field>
          <Field label="Calendar colour">
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setF({ ...f, color: c })} className={`h-7 w-7 rounded-full ${f.color === c ? 'ring-2 ring-ink-800 ring-offset-2' : ''}`} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </>
  );
}
