import { Card, PageHeader } from '../../components/ui';
import { fmtDateTime } from '../../lib/utils';
import { useDB } from '../../store/db';

export default function AdminActivity() {
  const activity = useDB((s) => s.activity);
  const tenants = useDB((s) => s.tenants);
  return (
    <>
      <PageHeader title="Activity log" subtitle="Every platform-level change: tenants, modules, ad accounts, plans." />
      <Card pad={false}>
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">When</th>
              <th className="th">Tenant</th>
              <th className="th">What</th>
              <th className="th">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {activity.map((a) => (
              <tr key={a.id}>
                <td className="td whitespace-nowrap text-ink-500">{fmtDateTime(a.at)}</td>
                <td className="td">{tenants.find((t) => t.id === a.tenantId)?.name ?? '—'}</td>
                <td className="td">{a.text}</td>
                <td className="td text-ink-500">{a.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
