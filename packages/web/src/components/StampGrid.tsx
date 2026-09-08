import { useEffect, useRef } from 'react';

/**
 * Punch panels. Unpunched: a dotted die-cut with its number. Punched: the paper is gone and
 * the ultramarine panel shows through; a newly punched hole animates in once.
 */
export function StampGrid({ total, filled, size = 'md' }: { total: number; filled: number; size?: 'sm' | 'md' }) {
  const prev = useRef(filled);
  const justEarned = filled > prev.current ? filled : -1;
  useEffect(() => {
    prev.current = filled;
  }, [filled]);
  const cols = total <= 5 ? total : total <= 10 ? 5 : total <= 12 ? 6 : 5;
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-13 w-13';
  return (
    <div className="grid justify-items-center gap-y-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label={`${filled} / ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < filled;
        const pop = done && i === justEarned - 1;
        return (
          <div key={i} className={`${dim} flex items-center justify-center rounded-full ${done ? `bg-panel shadow-[inset_0_2px_4px_oklch(0%_0_0/0.35)] ${pop ? 'punch' : ''}` : 'border-2 border-dotted border-silver-deep bg-paper-deep'}`}>
            {done ? (
              <span className="block h-[38%] w-[38%] rounded-full bg-paper-deep/25" aria-hidden="true" />
            ) : (
              <span className={`t-num ${size === 'sm' ? 'text-[11px]' : 'text-sm'} font-bold text-ink-faint`}>{i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
