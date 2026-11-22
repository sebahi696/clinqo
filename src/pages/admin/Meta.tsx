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
  const [acct, setAcct] = useState({ id: '', name: '' });
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
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!acct.id) return;
                useDB.setState((s) => ({ meta: { ...s.meta, adAccounts: [...s.meta.adAccounts, { id: acct.id.startsWith('act_') ? acct.id : 'act_' + acct.id, name: acct.name || 'Ad account', currency: 'USD' }] } }));
                setAcct({ id: '', name: '' });
              }}
            >
              <input className="input w-36 py-1.5 text-xs" placeholder="act_ ID" value={acct.id} onChange={(e) => setAcct({ ...acct, id: e.target.value })} />
              <input className="input w-36 py-1.5 text-xs" placeholder="Name" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
              <button className="btn-secondary btn-sm">
                <Plus size={13} /> Add
              </button>
            </form>
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
                      <Link to={`/admin/tenants/${t.id}?tab=channels`} className="text-brand-700 hover:underline">
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
