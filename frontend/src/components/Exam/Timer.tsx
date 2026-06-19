import { useEffect, useState, useCallback, useRef } from 'react';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  label?: string;
  size?: 'sm' | 'lg';
  warning?: number;
}

export const Timer = ({ totalSeconds, onTimeUp, label = 'Tiempo restante', size = 'lg', warning = 300 }: TimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);

  // Keep callback ref fresh without re-running interval
  useEffect(() => { onTimeUpRef.current = onTimeUp; });

  // Reset when totalSeconds changes (new question via key remount)
  useEffect(() => {
    setRemaining(totalSeconds);
    firedRef.current = false;
  }, [totalSeconds]);

  // Single stable interval — only restarts when totalSeconds changes
  useEffect(() => {
    firedRef.current = false;
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            // Defer to avoid calling setState during render
            setTimeout(() => onTimeUpRef.current(), 0);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds]);

  const format = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const isCritical = remaining <= 60;
  const isWarning = remaining <= warning;

  return (
    <div className={clsx(
      'flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold transition-colors',
      isCritical
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse'
        : isWarning
        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    )}>
      <Clock size={size === 'lg' ? 18 : 14} />
      <div>
        {label && <p className={clsx('font-sans font-normal leading-none', size === 'lg' ? 'text-xs mb-0.5 opacity-70' : 'hidden')}>{label}</p>}
        <p className={size === 'lg' ? 'text-2xl' : 'text-base'}>{format(remaining)}</p>
      </div>
    </div>
  );
};
