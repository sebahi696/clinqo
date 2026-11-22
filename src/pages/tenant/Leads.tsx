import { Clock, Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, Modal, PageHeader, Stat } from '../../components/ui';
import type { LeadSource, LeadStage } from '../../lib/types';
import { ago, cx, download, pct, SOURCE_LABEL, STAGE_LABEL, STAGES, toCSV, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const STAGE_COLOR: Record<LeadStage, string> = {
  new: 'bg-coral-500',
  contacted: 'bg-sky-500',
  consult_booked: 'bg-indigo-500',
  attended: 'bg-amber-500',
  won: 'bg-brand-600',
  lost: 'bg-ink-300',
};

export default function Leads() {
  const tenant = useTenant()!;
  const leads = useT('leads');
  const campaigns = useT('campaigns');
  const { moveLead, insert } = useDB.getState();
  const [src, setSrc] = useState<'all' | LeadSource>('all');
  const [camp, setCamp] = useState('all');
  const [drag, setDrag] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', interest: '', source: 'walk_in' as LeadSource, value: 0 });

  const list = leads.filter((l) => (src === 'all' || l.source === src) && (camp === 'all' || l.campaignId === camp));
  const responded = list.filter((l) => l.firstResponseMins !== undefined);
  const avgResp = responded.length ? responded.reduce((s, l) => s + l.firstResponseMins!, 0) / responded.length : 0;
  const won = list.filter((l) => l.stage === 'won').length;
  const closed = list.filter((l) => l.stage === 'won' || l.stage === 'lost').length;

  return (
    <>
      <PageHeader
        title="Leads pipeline"
        subtitle="Drag cards between stages. Bookings and payments move leads forward automatically."
        actions={
          <>
            <button className="btn-secondary" onClick={() => download(`leads-${tenant.name}.csv`, toCSV(list.map((l) => ({ name: l.name, phone: l.phone, source: SOURCE_LABEL[l.source], interest: l.interest, stage: STAGE_LABEL[l.stage], created: l.createdAt }))))}>
              <Download size={15} /> Export
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Add lead
            </button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads in view" value={list.length} />
        <Stat label="Waiting for first reply" value={list.filter((l) => l.stage === 'new').length} tone={list.some((l) => l.stage === 'new') ? 'bad' : 'default'} hint="Reply within 5 minutes" />
        <Stat label="Avg. first response" value={`${Math.round(avgResp)} min`} icon={<Clock size={16} />} hint={avgResp > 15 ? 'Slower than 15 min target' : 'On target'} tone={avgResp > 15 ? 'bad' : 'good'} />
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
                  <div key={l.id} draggable onDragStart={() => setDrag(l.id)} className={cx('cursor-grab rounded-lg border border-ink-100 bg-white p-3 shadow-sm active:cursor-grabbing', drag === l.id && 'opacity-50')}>
                    <div className="flex items-start justify-between gap-2">
                      {l.patientId ? (
                        <Link to={`/app/patients/${l.patientId}`} className="text-sm font-medium text-ink-900 hover:text-brand-700">
                          {l.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-ink-900">{l.name}</span>
                      )}
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
    </>
  );
}
