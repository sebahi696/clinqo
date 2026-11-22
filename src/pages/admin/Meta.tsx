import { CheckCircle2, Link2, Plus, RefreshCw, Unplug } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Field, Modal, PageHeader } from '../../components/ui';
import { fmtDateTime, usd } from '../../lib/utils';
import { useDB } from '../../store/db';

export default function AdminMeta() {
  const { meta, tenants, campaigns, connectMeta, disconnectMeta, syncMeta } = useDB();
  const [open, setOpen] = useState(false);
  const [bm, setBm] = useState('Clinqo Agency (Business Manager)');
  const [addOpen, setAddOpen] = useState(false);
  const [acct, setAcct] = useState({ id: '', name: '', currency: 'USD', tenantId: '' });
  const [err, setErr] = useState('');
  const closeAdd = () => {
    setAddOpen(false);
    setErr('');
    setAcct({ id: '', name: '', currency: 'USD', tenantId: '' });
  };
  const addAccount = () => {
    const e = useDB.getState().addAdAccount({ ...acct, tenantId: acct.tenantId || undefined });
    if (e) return setErr(e);
    closeAdd();
  };
  const owner = (id: string) => tenants.find((t) => t.metaAdAccountId === id);

  return (
    <>
      <PageHeader
        title="Meta ad accounts"
        subtitle="Clinqo connects one Business Manager. Each growth tenant gets an ad account; its lead form leads go straight into that tenant's CRM."
        actions={
          meta.connected ? (
            <>
              <button className="btn-secondary" onClick={syncMeta}>
                <RefreshCw size={15} /> Sync insights now
              </button>
              <button className="btn-danger" onClick={disconnectMeta}>
                <Unplug size={15} /> Disconnect
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Link2 size={15} /> Connect Meta Business
            </button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0866ff] text-lg font-bold text-white">f</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-ink-900">
              {meta.connected ? meta.businessName : 'Not connected'}
              {meta.connected && <CheckCircle2 size={16} className="text-brand-600" />}
            </div>
            <div className="text-sm text-ink-500">
              {meta.connected ? `Business ID ${meta.businessId} · connected ${meta.connectedAt ? fmtDateTime(meta.connectedAt) : ''}` : 'Connect to pull ad accounts, campaigns and daily spend.'}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-sand-100 p-3 text-xs leading-relaxed text-ink-600">
          <b>Test build:</b> the connection and insights are simulated so you can test every flow on GitHub Pages. Your marketer keeps running campaigns in Meta Ads Manager as usual. The live build
          only needs one Meta app for Clinqo with ads_read (spend and results) and leads_retrieval (lead form leads into each tenant's CRM). No WhatsApp, Instagram or
          Messenger APIs, and no verification per clinic.
        </div>
      </Card>

      <Card
        title="Ad accounts"
        className="mt-6"
        pad={false}
        actions={
          meta.connected && (
            <button className="btn-secondary btn-sm" onClick={() => setAddOpen(true)}>
              <Plus size={13} /> Add ad account
            </button>
          )
        }
      >
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Account</th>
              <th className="th">Assigned tenant</th>
              <th className="th text-end">Campaigns</th>
              <th className="th text-end">Spend to date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {meta.adAccounts.map((a) => {
              const t = owner(a.id);
              const cs = t ? campaigns.filter((c) => c.tenantId === t.id) : [];
              return (
                <tr key={a.id}>
                  <td className="td">
                    <div className="font-medium text-ink-800">{a.name}</div>
                    <div className="text-xs text-ink-400">
                      {a.id} · {a.currency}
                    </div>
                  </td>
                  <td className="td">
                    {t ? (
                      <Link to={`/admin/growth/${t.id}?tab=setup`} className="text-brand-700 hover:underline">
                        {t.name}
                      </Link>
                    ) : (
                      <Badge>Unassigned</Badge>
                    )}
                  </td>
                  <td className="td text-end">{cs.length}</td>
                  <td className="td text-end font-medium">{usd(cs.reduce((s, c) => s + c.spend, 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Add ad account"
        footer={
          <>
            <button className="btn-secondary" onClick={closeAdd}>
              Cancel
            </button>
            <button className="btn-primary" onClick={addAccount}>
              Add ad account
            </button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            addAccount();
          }}
        >
          <Field label="Ad account ID *">
            <input className="input" autoFocus placeholder="act_1234567890 or 1234567890" value={acct.id} onChange={(e) => { setAcct({ ...acct, id: e.target.value }); setErr(''); }} />
          </Field>
          <Field label="Name">
            <input className="input" placeholder="e.g. Pearl Dental – Ads" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <select className="input" value={acct.currency} onChange={(e) => setAcct({ ...acct, currency: e.target.value })}>
                <option>USD</option>
                <option>EUR</option>
                <option>AED</option>
                <option>SAR</option>
              </select>
            </Field>
            <Field label="Assign to tenant (optional)">
              <select className="input" value={acct.tenantId} onChange={(e) => setAcct({ ...acct, tenantId: e.target.value })}>
                <option value="">— later —</option>
                {tenants
                  .filter((t) => t.modules.marketing && !t.metaAdAccountId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          <p className="text-xs text-ink-400">Find the ID in Meta Ads Manager, in the account dropdown at the top left, or in Business Settings → Ad accounts. Only tenants with Marketing on and no ad account yet are listed.</p>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect Meta Business Manager"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                connectMeta(bm);
                setOpen(false);
              }}
            >
              Continue with Facebook
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-600">In the live build this opens Facebook Login for Business and asks for ad account and leads permissions. Here it simulates the connection.</p>
        <Field label="Business Manager name">
          <input className="input" value={bm} onChange={(e) => setBm(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
