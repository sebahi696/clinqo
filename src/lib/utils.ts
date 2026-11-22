import type { AppointmentStatus, Channel, LeadSource, LeadStage, PaymentMethod } from './types';

export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const usd = (n: number, digits = 0) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const lbp = (n: number) => Math.round(n).toLocaleString('en-US') + ' LBP';

export const num = (n: number) => n.toLocaleString('en-US');

export const pct = (n: number, digits = 0) => (isFinite(n) ? (n * 100).toFixed(digits) + '%' : '—');

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`;

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const monthKey = (iso: string) => iso.slice(0, 7);

export const SOURCE_LABEL: Record<LeadSource, string> = {
  meta_ads: 'Meta Ads',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  walk_in: 'Walk-in',
  import: 'Imported',
  loyal: 'Loyal patient',
  website: 'Website',
};

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: 'New lead',
  contacted: 'Contacted',
  consult_booked: 'Consult booked',
  attended: 'Attended',
  won: 'Won (paid)',
  lost: 'Lost',
};

export const STAGES: LeadStage[] = ['new', 'contacted', 'consult_booked', 'attended', 'won', 'lost'];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  arrived: 'Arrived',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  booked: 'bg-sky-50 text-sky-700 ring-sky-200',
  confirmed: 'bg-brand-50 text-brand-700 ring-brand-200',
  arrived: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-ink-100 text-ink-700 ring-ink-200',
  no_show: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-ink-50 text-ink-400 ring-ink-100 line-through',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash_usd: 'Cash USD',
  cash_lbp: 'Cash LBP',
  card: 'Card',
  whish: 'Whish Money',
  omt: 'OMT Pay',
  bank: 'Bank transfer',
  gift_card: 'Gift card',
  package: 'Package session',
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  sms: 'SMS',
};

export const CHANNEL_COLOR: Record<Channel, string> = {
  whatsapp: 'bg-emerald-500',
  instagram: 'bg-gradient-to-br from-fuchsia-500 to-amber-400',
  messenger: 'bg-blue-500',
  sms: 'bg-ink-500',
};

export function download(filename: string, text: string, type = 'text/csv') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') {
        if (q && l[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (c === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}
