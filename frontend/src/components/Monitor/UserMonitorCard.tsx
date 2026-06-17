import { ActiveSession } from '../../types';
import { StatusBadge, Badge } from '../UI/Badge';
import { AlertTriangle, Monitor, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserMonitorCardProps {
  session: ActiveSession;
}

export const UserMonitorCard = ({ session }: UserMonitorCardProps) => {
  const isSuspicious = session.is_suspicious;
  const inExam = session.status === 'in_exam';

  return (
    <div className={clsx(
      'card p-4 transition-all hover:shadow-md',
      isSuspicious && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {session.avatar_url ? (
            <img src={session.avatar_url} alt={session.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold">
              {session.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
            session.status === 'in_exam' ? 'bg-blue-500' :
            session.status === 'connected' ? 'bg-green-500' :
            session.status === 'finished' ? 'bg-purple-500' : 'bg-gray-400'
          )} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{session.name}</p>
            {isSuspicious && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle size={13} />
                <span className="text-xs font-bold">Sospechoso</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.email}</p>
          {session.area && <p className="text-xs text-gray-400">{session.area}</p>}
        </div>

        {/* Status */}
        <StatusBadge status={session.status} />
      </div>

      {/* Exam progress */}
      {inExam && (
        <div className="mt-3 space-y-2">
          {session.exam_title && (
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Monitor size={12} />
              {session.exam_title}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(session.progress_percent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 w-9 text-right">
              {Math.round(session.progress_percent)}%
            </span>
          </div>

          {/* Anti-cheat counters */}
          {((session.tab_switch_count || 0) > 0 || (session.copy_paste_count || 0) > 0 || (session.fullscreen_exit_count || 0) > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(session.tab_switch_count || 0) > 0 && (
                <Badge variant="yellow">Pestañas: {session.tab_switch_count}</Badge>
              )}
              {(session.copy_paste_count || 0) > 0 && (
                <Badge variant="red">Copiar: {session.copy_paste_count}</Badge>
              )}
              {(session.fullscreen_exit_count || 0) > 0 && (
                <Badge variant="red">Pantalla: {session.fullscreen_exit_count}</Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Last seen */}
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
        <Clock size={11} />
        <span>
          {formatDistanceToNow(new Date(session.last_seen), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  );
};
