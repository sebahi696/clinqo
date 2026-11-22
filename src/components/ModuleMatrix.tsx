import { Check } from 'lucide-react';
import { MODULES, PRESETS } from '../lib/modules';
import type { ModuleKey, PlanKey } from '../lib/types';
import { cx, usd } from '../lib/utils';
import { Toggle } from './ui';

export function PresetPicker({ value, onPick }: { value: PlanKey; onPick: (p: PlanKey) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(PRESETS) as PlanKey[]).map((k) => {
        const p = PRESETS[k];
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            className={cx('rounded-xl border p-4 text-start transition', active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-ink-100 bg-white hover:border-ink-300')}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">{p.label}</span>
              {active && <Check size={15} className="text-brand-600" />}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{p.description}</p>
            {p.fee > 0 && <p className="mt-2 text-xs font-medium text-ink-700">{usd(p.fee)}/month</p>}
          </button>
        );
      })}
    </div>
  );
}

export function ModuleToggles({ modules, onToggle }: { modules: Record<ModuleKey, boolean>; onToggle: (k: ModuleKey) => void }) {
  const groups = [...new Set(MODULES.map((m) => m.group))];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g} className="rounded-xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{g}</div>
          <div className="divide-y divide-ink-50">
            {MODULES.filter((m) => m.group === g).map((m) => (
              <div key={m.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className={cx('text-sm font-medium', modules[m.key] ? 'text-ink-900' : 'text-ink-400')}>{m.label}</div>
                  <div className="text-xs text-ink-400">{m.description}</div>
                </div>
                <Toggle on={modules[m.key]} onChange={() => onToggle(m.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
