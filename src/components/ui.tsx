import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cx } from '../lib/utils';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-800">{title}</h2>
          {actions}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default', icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'brand'; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
        {label}
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <div className={cx('mt-1.5 text-2xl font-semibold tracking-tight', tone === 'brand' ? 'text-brand-700' : 'text-ink-900')}>{value}</div>
      {hint && <div className={cx('mt-1 text-xs', tone === 'good' ? 'text-brand-600' : tone === 'bad' ? 'text-rose-600' : 'text-ink-400')}>{hint}</div>}
    </div>
  );
}

export function Badge({ children, className = 'bg-ink-50 text-ink-600 ring-ink-200' }: { children: ReactNode; className?: string }) {
  return <span className={cx('badge', className)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={cx('card w-full shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h3 className="font-semibold text-ink-900">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-40', on ? 'bg-brand-600' : 'bg-ink-200')}
    >
      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'start-[18px]' : 'start-0.5')} />
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-ink-100">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition', value === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 h-10 w-10 rounded-full bg-ink-50 ring-8 ring-ink-50/50" />
      <p className="font-medium text-ink-700">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-400">{children}</div>}
    </div>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .replace(/^Dr\.?\s*/, '')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: size, height: size, background: color ?? '#4e6767' }}
    >
      {initials}
    </span>
  );
}

export function Bar({ value, max, color = 'bg-brand-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={cx('h-full rounded-full', color)} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}
