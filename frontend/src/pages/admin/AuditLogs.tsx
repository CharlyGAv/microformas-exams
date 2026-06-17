import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/api';
import { AuditLog } from '../../types';
import { Badge } from '../../components/UI/Badge';
import { Shield, AlertTriangle, Info, Users, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  total_events: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  last_event: string;
}

const severityIcon  = { info: Info, warning: AlertTriangle, critical: Shield };
const severityColor = { info: 'blue', warning: 'yellow', critical: 'red' } as const;

const eventTypeLabel: Record<string, string> = {
  TAB_SWITCH:      'Cambio de pestaña',
  WINDOW_BLUR:     'Ventana perdió foco',
  COPY_PASTE:      'Copia / Pegado',
  FULLSCREEN_EXIT: 'Salió de pantalla completa',
  AUTO_SUBMIT:     'Envío automático',
};

export const AuditLogs = () => {
  const [selectedUser, setSelectedUser] = useState<AuditUser | null>(null);
  const [severity, setSeverity]         = useState('');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['audit-users'],
    queryFn:  reportApi.auditUsers,
  });
  const auditUsers: AuditUser[] = usersData?.data?.users || [];

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs', selectedUser?.id, severity],
    queryFn:  () => reportApi.auditLogs({
      user_id: selectedUser!.id,
      ...(severity ? { severity } : {}),
    }),
    enabled: !!selectedUser,
  });
  const logs: AuditLog[] = logsData?.data?.logs || [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registro de Auditoría</h1>
          <p className="text-gray-500 text-sm mt-1">Eventos de seguridad por usuario</p>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-5 items-start">

        {/* ── Panel izquierdo: lista de usuarios ── */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Users size={15} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              Usuarios ({auditUsers.length})
            </span>
          </div>

          {usersLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditUsers.length === 0 ? (
            <div className="p-10 text-center">
              <Shield size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin registros de auditoría</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 max-h-[70vh] overflow-y-auto">
              {auditUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSeverity(''); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    selectedUser?.id === u.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/30 border-l-2 border-transparent'
                  }`}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {u.critical_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
                          <Shield size={9} /> {u.critical_count}
                        </span>
                      )}
                      {u.warning_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> {u.warning_count}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(u.last_event), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${selectedUser?.id === u.id ? 'text-brand-500' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Panel derecho: logs del usuario seleccionado ── */}
        <div className="space-y-3">
          {!selectedUser ? (
            <div className="card p-16 text-center">
              <Shield size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Selecciona un usuario para ver sus eventos</p>
            </div>
          ) : (
            <>
              {/* Header del usuario seleccionado */}
              <div className="card p-4 flex items-center gap-4">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {selectedUser.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h2>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
                <div className="flex gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedUser.total_events}</p>
                    <p className="text-[10px] text-gray-400">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{selectedUser.critical_count}</p>
                    <p className="text-[10px] text-gray-400">Críticos</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-600">{selectedUser.warning_count}</p>
                    <p className="text-[10px] text-gray-400">Alertas</p>
                  </div>
                </div>
              </div>

              {/* Filtro de severidad */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: '', label: 'Todos' },
                  { key: 'info', label: 'Información' },
                  { key: 'warning', label: 'Advertencias' },
                  { key: 'critical', label: 'Críticos' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSeverity(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      severity === key
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Lista de logs */}
              <div className="card overflow-hidden">
                {logsLoading ? (
                  <div className="p-8 flex justify-center">
                    <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-12 text-center">
                    <Shield size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Sin eventos con este filtro</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[58vh] overflow-y-auto">
                    {logs.map((log) => {
                      const SeverityIcon = severityIcon[log.severity];
                      return (
                        <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            log.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            log.severity === 'warning'  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                                                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            <SeverityIcon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                {eventTypeLabel[log.event_type] || log.event_type.replace(/_/g, ' ')}
                              </p>
                              <Badge variant={severityColor[log.severity]}>{log.severity}</Badge>
                              {log.exam_title && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                  {log.exam_title}
                                </span>
                              )}
                            </div>
                            {Object.keys(log.event_data || {}).length > 0 && (
                              <p className="text-xs text-gray-400 font-mono mt-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                                {JSON.stringify(log.event_data)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 flex-shrink-0 text-right whitespace-nowrap">
                            {format(new Date(log.occurred_at), "d MMM yyyy", { locale: es })}
                            <br />
                            {format(new Date(log.occurred_at), "HH:mm:ss")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
