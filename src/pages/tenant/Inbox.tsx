import { Bot, CalendarPlus, Megaphone, Search, Send, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BookingModal from '../../components/BookingModal';
import { Badge, Empty, PageHeader } from '../../components/ui';
import { useCan } from '../../lib/hooks';
import type { Channel, LeadStage } from '../../lib/types';
import { ago, CHANNEL_COLOR, CHANNEL_LABEL, cx, fmtTime, STAGE_LABEL, STAGES, uid } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const QUICK = ['Our prices start from $X, want me to book a free consultation?', 'Which day suits you this week?', 'We are located at {city}. Here is the map pin 📍', 'You are booked ✅ We will remind you the day before.'];

export default function Inbox() {
  const tenant = useTenant()!;
  const can = useCan();
  const convs = useT('conversations');
  const leads = useT('leads');
  const campaigns = useT('campaigns');
  const services = useT('services');
  const { sendMessage, patch, convertLead, moveLead, insert } = useDB.getState();
  const [sel, setSel] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | Channel>('all');
  const [booking, setBooking] = useState<string | undefined>();
  const threadRef = useRef<HTMLDivElement>(null);

  const list = convs
    .filter((c) => (filter === 'all' ? true : filter === 'unread' ? c.unread > 0 : c.channel === filter))
    .filter((c) => (c.contactName + c.phone).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.messages[b.messages.length - 1].at.localeCompare(a.messages[a.messages.length - 1].at));
  const conv = convs.find((c) => c.id === sel) ?? list[0];
  const lead = leads.find((l) => l.id === conv?.leadId);
  const camp = campaigns.find((c) => c.id === conv?.campaignId);

  useEffect(() => {
    if (conv?.unread) patch('conversations', conv.id, { unread: 0 });
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [conv?.id, conv?.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (t: string, from: 'staff' | 'bot' = 'staff') => {
    if (!conv || !t.trim()) return;
    sendMessage(conv.id, t.replace('{city}', tenant.city));
    if (from === 'staff' && lead?.stage === 'new') {
      moveLead(lead.id, 'contacted');
      patch('leads', lead.id, { firstResponseMins: Math.max(1, Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 60000)) });
    }
    setText('');
  };

  const aiReply = () => {
    if (!conv) return;
    const last = conv.messages[conv.messages.length - 1].text.toLowerCase();
    const svc = services.find((s) => last.includes(s.name.split(' ')[0].toLowerCase())) ?? services.find((s) => lead?.interest && s.name.toLowerCase().includes(lead.interest.toLowerCase().split(' ')[0]));
    const name = conv.contactName.split(' ')[0];
    setText(
      svc
        ? `Hi ${name}! ${svc.name} is $${svc.price} and takes about ${svc.duration} minutes. Would you like me to book you in this week? We have slots on Tuesday and Thursday.`
        : `Hi ${name}, thanks for contacting ${tenant.name}! How can we help you today? We can book you a consultation this week.`,
    );
  };

  const simulateLead = () => {
    const names = ['Nour Saad', 'Karim Fares', 'Lea Haddad', 'Ali Itani', 'Rita Khoury', 'Tala Aoun'];
    const name = names[Math.floor(Math.random() * names.length)];
    const c = campaigns.length ? campaigns[Math.floor(Math.random() * campaigns.length)] : undefined;
    const lid = uid('ld');
    const phone = `+961 7${Math.floor(Math.random() * 9)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    const interest = services[Math.floor(Math.random() * services.length)].name;
    insert('leads', { id: lid, tenantId: tenant.id, name, phone, source: c ? 'meta_ads' : 'instagram', campaignId: c?.id, interest, stage: 'new', value: services.find((s) => s.name === interest)?.price ?? 0, createdAt: new Date().toISOString() });
    const cid = uid('cv');
    insert('conversations', {
      id: cid,
      tenantId: tenant.id,
      channel: c ? 'whatsapp' : 'instagram',
      contactName: name,
      phone,
      leadId: lid,
      campaignId: c?.id,
      unread: 1,
      status: 'open',
      messages: [{ id: uid('m'), from: 'contact', text: `Hi, I saw your ad. How much is ${interest}?`, at: new Date().toISOString() }],
    });
    setSel(cid);
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="WhatsApp, Instagram and Messenger in one place. Ad leads arrive with their campaign attached."
        actions={
          <button className="btn-secondary" onClick={simulateLead}>
            <Megaphone size={15} /> Simulate new ad lead
          </button>
        }
      />
      <div className="card grid overflow-hidden md:h-[calc(100vh-210px)] md:min-h-[520px] md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)_280px]">
        {/* list */}
        <div className="flex max-h-64 min-h-0 min-w-0 flex-col border-b border-ink-100 md:max-h-none md:border-b-0 md:border-e">
          <div className="space-y-2 border-b border-ink-100 p-3">
            <div className="relative">
              <Search size={14} className="absolute start-2.5 top-2.5 text-ink-300" />
              <input className="input py-1.5 ps-8" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex gap-1 overflow-x-auto text-xs">
              {(['all', 'unread', 'whatsapp', 'instagram', 'messenger'] as const).map((k) => (
                <button key={k} onClick={() => setFilter(k)} className={cx('whitespace-nowrap rounded-full px-2.5 py-1', filter === k ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-600')}>
                  {k === 'all' ? 'All' : k === 'unread' ? 'Unread' : CHANNEL_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <ul className="scrollbar-thin flex-1 overflow-y-auto">
            {list.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.id}>
                  <button onClick={() => setSel(c.id)} className={cx('flex w-full gap-3 border-b border-ink-50 px-3 py-3 text-start hover:bg-sand-50', conv?.id === c.id && 'bg-brand-50/60')}>
                    <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', CHANNEL_COLOR[c.channel])} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cx('truncate text-sm', c.unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700')}>{c.contactName}</span>
                        <span className="shrink-0 text-[10px] text-ink-400">{ago(last.at)}</span>
                      </span>
                      <span className="block truncate text-xs text-ink-500">{last.text}</span>
                      {c.campaignId && <span className="mt-1 inline-block rounded bg-[#0866ff]/10 px-1.5 text-[10px] font-medium text-[#0866ff]">Meta ad</span>}
                    </span>
                    {c.unread > 0 && <span className="mt-1 h-2 w-2 rounded-full bg-coral-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* thread */}
        {conv ? (
          <div className="flex min-h-0 min-w-0 flex-col bg-sand-50/50">
            <div className="flex items-center gap-2 border-b border-ink-100 bg-white px-4 py-3">
              <span className={cx('h-2.5 w-2.5 rounded-full', CHANNEL_COLOR[conv.channel])} />
              <span className="font-semibold text-ink-900">{conv.contactName}</span>
              <span className="text-xs text-ink-400">
                {CHANNEL_LABEL[conv.channel]} · {conv.phone}
              </span>
            </div>
            <div ref={threadRef} className="scrollbar-thin h-[50vh] flex-1 space-y-2 overflow-y-auto p-4 md:h-auto">
              {conv.messages.map((m) => (
                <div key={m.id} className={cx('flex', m.from === 'contact' ? 'justify-start' : 'justify-end')}>
                  <div className={cx('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm', m.from === 'contact' ? 'rounded-es-sm bg-white text-ink-800' : m.from === 'bot' ? 'rounded-ee-sm bg-ink-800 text-white' : 'rounded-ee-sm bg-brand-700 text-white')}>
                    {m.from === 'bot' && (
                      <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-300">
                        <Bot size={11} /> AI agent
                      </div>
                    )}
                    {m.text}
                    <div className={cx('mt-0.5 text-[10px]', m.from === 'contact' ? 'text-ink-400' : 'text-white/60')}>{fmtTime(m.at)}</div>
                  </div>
                </div>
              ))}
                          </div>
            <div className="border-t border-ink-100 bg-white p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto">
                {QUICK.map((x) => (
                  <button key={x} onClick={() => setText(x.replace('{city}', tenant.city))} className="whitespace-nowrap rounded-full border border-ink-100 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50">
                    {x.slice(0, 32)}…
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
              >
                <button type="button" className="btn-secondary" onClick={aiReply} title="Suggest a reply">
                  <Sparkles size={15} />
                </button>
                <input className="input" placeholder={`Reply on ${CHANNEL_LABEL[conv.channel]}…`} value={text} onChange={(e) => setText(e.target.value)} />
                <button className="btn-primary" disabled={!text.trim()}>
                  <Send size={15} className="rtl:rotate-180" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <Empty title="No conversations" />
        )}

        {/* contact panel */}
        {conv && (
          <div className="scrollbar-thin hidden overflow-y-auto border-s border-ink-100 p-4 lg:block">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Lead</h3>
            {lead ? (
              <div className="mt-2 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-ink-400">Interested in</div>
                  <div className="font-medium">{lead.interest}</div>
                </div>
                {camp && (
                  <div className="rounded-lg bg-[#0866ff]/5 p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-[#0866ff]">From Meta campaign</div>
                    <div className="text-xs text-ink-700">{camp.name}</div>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs text-ink-400">Pipeline stage</div>
                  <select className="input py-1.5" value={lead.stage} onChange={(e) => moveLead(lead.id, e.target.value as LeadStage)}>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                {lead.firstResponseMins !== undefined && (
                  <div className="text-xs text-ink-500">
                    First reply in <b className={lead.firstResponseMins > 15 ? 'text-rose-600' : 'text-brand-700'}>{lead.firstResponseMins} min</b>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-400">Not linked to a lead.</p>
            )}
            <div className="mt-5 space-y-2">
              {conv.patientId ? (
                <Link to={`/app/patients/${conv.patientId}`} className="btn-secondary w-full">
                  Open profile
                </Link>
              ) : (
                lead && (
                  <button className="btn-secondary w-full" onClick={() => convertLead(lead.id)}>
                    <UserPlus size={15} /> Create {tenant.vertical === 'spa' ? 'client' : 'patient'}
                  </button>
                )
              )}
              {can('appointments') && (
                <button
                  className="btn-primary w-full"
                  onClick={() => {
                    const pid = conv.patientId ?? (lead ? convertLead(lead.id) : undefined);
                    setBooking(pid);
                  }}
                >
                  <CalendarPlus size={15} /> Book appointment
                </button>
              )}
            </div>
            {conv.status === 'closed' && <Badge className="mt-4">Closed</Badge>}
          </div>
        )}
      </div>
      <BookingModal open={booking !== undefined} onClose={() => setBooking(undefined)} prefill={{ patientId: booking }} />
    </>
  );
}
