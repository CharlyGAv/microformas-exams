import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' | 'indigo';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variants = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const dotColors = {
  green: 'bg-green-500', red: 'bg-red-500', yellow: 'bg-yellow-500',
  blue: 'bg-blue-500', purple: 'bg-purple-500', gray: 'bg-gray-400', indigo: 'bg-indigo-500',
};

export const Badge = ({ children, variant = 'gray', size = 'sm', dot }: BadgeProps) => (
  <span className={clsx('badge font-medium', variants[variant], size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs')}>
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    connected: { label: 'Conectado', variant: 'green' },
    idle: { label: 'Inactivo', variant: 'gray' },
    starting_exam: { label: 'Iniciando', variant: 'blue' },
    in_exam: { label: 'En examen', variant: 'indigo' },
    finished: { label: 'Finalizado', variant: 'purple' },
    disconnected: { label: 'Desconectado', variant: 'red' },
    submitted: { label: 'Enviado', variant: 'green' },
    in_progress: { label: 'En progreso', variant: 'blue' },
    timed_out: { label: 'Tiempo agotado', variant: 'yellow' },
    flagged: { label: 'Marcado', variant: 'red' },
    auto_submitted: { label: 'Auto-enviado', variant: 'red' },
    available: { label: 'Disponible', variant: 'green' },
    expired: { label: 'Expirado', variant: 'red' },
  };
  const cfg = map[status] || { label: status, variant: 'gray' as BadgeProps['variant'] };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
};
