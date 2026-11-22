export default function Logo({ light = false, size = 28 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#1f9880' : '#136255'} />
        <path d="M21.5 11.5a7 7 0 1 0 0 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="22.5" cy="16" r="2" fill="#f08a6c" />
      </svg>
      <span className={`font-display text-[19px] font-semibold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>Clinqo</span>
    </span>
  );
}
