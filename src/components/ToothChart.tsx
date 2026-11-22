import { useState } from 'react';
import type { ToothState } from '../lib/types';
import { cx } from '../lib/utils';

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const TOOTH: Record<ToothState, { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'bg-white border-ink-200 text-ink-500' },
  caries: { label: 'Caries', cls: 'bg-rose-100 border-rose-300 text-rose-700' },
  filled: { label: 'Filled', cls: 'bg-sky-100 border-sky-300 text-sky-700' },
  crown: { label: 'Crown', cls: 'bg-amber-100 border-amber-300 text-amber-800' },
  root_canal: { label: 'Root canal', cls: 'bg-violet-100 border-violet-300 text-violet-700' },
  implant: { label: 'Implant', cls: 'bg-brand-100 border-brand-300 text-brand-800' },
  missing: { label: 'Missing', cls: 'bg-ink-100 border-ink-200 text-ink-300 line-through' },
  planned: { label: 'Planned', cls: 'bg-white border-dashed border-coral-500 text-coral-600' },
};

export default function ToothChart({ teeth, onChange }: { teeth: Record<string, ToothState>; onChange: (tooth: string, s: ToothState) => void }) {
  const [brush, setBrush] = useState<ToothState>('caries');
  const Row = ({ nums, lower }: { nums: number[]; lower?: boolean }) => (
    <div className="flex justify-center gap-1" dir="ltr">
      {nums.map((n, i) => {
        const st = teeth[String(n)] ?? 'healthy';
        return (
          <button
            key={n}
            title={`${n} · ${TOOTH[st].label}`}
            onClick={() => onChange(String(n), st === brush ? 'healthy' : brush)}
            className={cx('flex h-12 w-8 flex-col items-center justify-between border py-1 text-[10px] font-semibold transition hover:scale-105 sm:w-9', lower ? 'rounded-b-xl rounded-t-md' : 'rounded-t-xl rounded-b-md', TOOTH[st].cls, i === 7 && 'me-3')}
          >
            {lower ? <span /> : <span>{n}</span>}
            {lower ? <span>{n}</span> : <span />}
          </button>
        );
      })}
    </div>
  );
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(TOOTH) as ToothState[]).map((k) => (
          <button key={k} onClick={() => setBrush(k)} className={cx('rounded-full border px-2.5 py-1 text-xs', TOOTH[k].cls, brush === k && 'ring-2 ring-ink-800 ring-offset-1')}>
            {TOOTH[k].label}
          </button>
        ))}
      </div>
      <div className="space-y-2 overflow-x-auto rounded-xl bg-sand-50 p-4">
        <Row nums={UPPER} />
        <div className="mx-auto h-px w-3/4 bg-ink-200" />
        <Row nums={LOWER} lower />
      </div>
      <p className="mt-2 text-xs text-ink-400">FDI numbering. Pick a condition, then click teeth. Click again to clear.</p>
    </div>
  );
}
