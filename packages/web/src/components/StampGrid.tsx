import { useEffect, useRef } from 'react';

/** `stamps_required` circles; filled = earned. Newly earned stamps get a 300 ms pop. */
export function StampGrid({ total, filled, size = 'md' }: { total: number; filled: number; size?: 'sm' | 'md' }) {
  const prev = useRef(filled);
  const justEarned = filled > prev.current ? filled : -1;
  useEffect(() => {
    prev.current = filled;
  }, [filled]);
  const cols = total <= 6 ? total : total <= 10 ? 5 : total <= 16 ? Math.ceil(total / 3) : 5;
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  return (
    <div className="grid justify-items-center gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label={`${filled} / ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < filled;
        const pop = done && i === justEarned - 1;
        return (
          <div key={i} className={`${dim} flex items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-accent bg-accent' : 'border-line bg-white'} ${pop ? 'stamp-pop' : ''}`}>
            {done ? (
              <svg viewBox="0 0 24 24" className={size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} fill="none" stroke="#1F2348" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-semibold text-ink-soft/60`}>{i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
