import { Download, Plus, Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Field, Modal, PageHeader } from '../../components/ui';
import { fullName } from '../../lib/hooks';
import type { LeadSource, Patient } from '../../lib/types';
import { download, fmtDate, parseCSV, SOURCE_LABEL, toCSV, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

export default function Patients() {
  const tenant = useTenant()!;
  const patients = useT('patients');
  const appts = useT('appointments');
  const invoices = useT('invoices');
  const { insert, importPatients } = useDB.getState();
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<'all' | LeadSource>('all');
  const [open, setOpen] = useState(false);
  const [imp, setImp] = useState(false);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const word = tenant.vertical === 'spa' ? 'Clients' : 'Patients';
  const [f, setF] = useState({ firstName: '', lastName: '', phone: '', email: '', gender: 'female' as Patient['gender'], dob: '', source: 'walk_in' as LeadSource, notes: '' });

  const stats = useMemo(() => {
    const m = new Map<string, { visits: number; spent: number; last?: string }>();
    for (const a of appts) {
      if (a.status !== 'completed') continue;
      const s = m.get(a.patientId) ?? { visits: 0, spent: 0 };
      s.visits++;
      if (!s.last || a.start > s.last) s.last = a.start;
      m.set(a.patientId, s);
    }
    for (const i of invoices) if (i.patientId) {
      const s = m.get(i.patientId) ?? { visits: 0, spent: 0 };
      s.spent += i.total;
      m.set(i.patientId, s);
    }
    return m;
  }, [appts, invoices]);

  const list = patients
    .filter((p) => (src === 'all' || p.source === src) && (fullName(p) + p.phone + (p.email ?? '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (stats.get(b.id)?.last ?? b.createdAt).localeCompare(stats.get(a.id)?.last ?? a.createdAt));

  return (
    <>
      <PageHeader
        title={word}
        subtitle={`${patients.length} records · one profile per person, from first ad click to last invoice`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImp(true)}>
              <Upload size={15} /> Import
            </button>
            <button className="btn-secondary" onClick={() => download(`${word.toLowerCase()}.csv`, toCSV(list.map((p) => ({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email, gender: p.gender, dob: p.dob, source: p.source, visits: stats.get(p.id)?.visits ?? 0, spent: stats.get(p.id)?.spent ?? 0 }))))}>
              <Download size={15} /> Export
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Add
            </button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute start-3 top-2.5 text-ink-300" />
          <input className="input ps-9" placeholder="Name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={src} onChange={(e) => setSrc(e.target.value as LeadSource | 'all')}>
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Source</th>
              <th className="th text-end">Visits</th>
              <th className="th text-end">Spent</th>
              <th className="th">Last visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {list.slice(0, 200).map((p) => {
              const s = stats.get(p.id);
              return (
                <tr key={p.id} className="hover:bg-sand-50">
                  <td className="td">
                    <Link to={`/app/patients/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {fullName(p)}
                    </Link>
                    {p.tags.map((t) => (
                      <Badge key={t} className="ms-2 bg-amber-50 text-amber-700 ring-amber-200">
                        {t}
                      </Badge>
                    ))}
                  </td>
                  <td className="td text-ink-500" dir="ltr">
                    {p.phone}
                  </td>
                  <td className="td">
                    <span className={p.source === 'meta_ads' ? 'text-[#0866ff]' : 'text-ink-600'}>{SOURCE_LABEL[p.source]}</span>
                  </td>
                  <td className="td text-end">{s?.visits ?? 0}</td>
                  <td className="td text-end font-medium">{usd(s?.spent ?? 0)}</td>
                  <td className="td text-ink-500">{s?.last ? fmtDate(s.last) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Add ${word.toLowerCase().slice(0, -1)}`}
        footer={
          <button
            className="btn-primary"
            disabled={!f.firstName || !f.phone}
            onClick={() => {
              insert('patients', { id: uid('pt'), tenantId: tenant.id, ...f, email: f.email || undefined, dob: f.dob || undefined, tags: [], marketingConsent: true, createdAt: new Date().toISOString() });
              setOpen(false);
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
          <Field label="Phone (WhatsApp)">
            <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+961" />
          </Field>
          <Field label="Email">
            <input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Gender">
            <select className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value as Patient['gender'] })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input className="input" type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
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
          <Field label="Notes">
            <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={imp}
        onClose={() => {
          setImp(false);
          setResult(null);
          setCsv('');
        }}
        title="Import from Excel / CSV"
        wide
        footer={
          <button
            className="btn-primary"
            disabled={!csv}
            onClick={() => {
              const rows = parseCSV(csv).map((r) => ({
                firstName: r.firstname || r['first name'] || r.name?.split(' ')[0],
                lastName: r.lastname || r['last name'] || r.name?.split(' ').slice(1).join(' '),
                phone: r.phone || r.mobile,
                email: r.email || undefined,
                gender: (r.gender?.toLowerCase().startsWith('m') ? 'male' : 'female') as Patient['gender'],
                dob: r.dob || undefined,
                source: (r.source as LeadSource) || 'import',
                notes: r.notes,
              }));
              setResult(importPatients(rows));
            }}
          >
            Import
          </button>
        }
      >
        <p className="text-sm text-ink-600">
          Export from your old system or Excel as CSV with columns <code className="rounded bg-ink-50 px-1">firstName, lastName, phone, email, gender, dob, source, notes</code>. Use <code>loyal</code> as source for existing regulars.
        </p>
        <button
          className="btn-ghost btn-sm mt-2"
          onClick={() => download('clinqo-import-template.csv', 'firstName,lastName,phone,email,gender,dob,source,notes\nMaya,Khoury,+961 70 123 456,maya@gmail.com,female,1990-05-12,loyal,Prefers mornings\n')}
        >
          <Download size={13} /> Download template
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
        {result !== null && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Imported {result} records.</p>}
      </Modal>
    </>
  );
}
