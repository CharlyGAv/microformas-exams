import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { ActiveSession } from '../../types';
import { UserMonitorCard } from '../../components/Monitor/UserMonitorCard';
import { Activity, Users, Monitor, AlertTriangle, RefreshCw } from 'lucide-react';
import { StatsCard } from '../../components/UI/StatsCard';
import toast from 'react-hot-toast';

export const LiveMonitor = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [alerts, setAlerts] = useState<{ id: string; message: string; timestamp: Date }[]>([]);

  const { data, refetch } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: dashboardApi.liveMonitor,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (data?.data?.sessions) setSessions(data.data.sessions);
  }, [data]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('sessions:update', ({ sessions: updated }: { sessions: ActiveSession[] }) => {
      setSessions(updated);
    });

    socket.on('anti_cheat:alert', ({ userName, eventType, timestamp }: { userName: string; eventType: string; timestamp: Date }) => {
      const msg = `${userName}: ${eventType.replace(/_/g, ' ')}`;
      toast.error(msg, { duration: 5000 });
      setAlerts((prev) => [{ id: Math.random().toString(), message: msg, timestamp: new Date(timestamp) }, ...prev.slice(0, 19)]);
    });

    socket.on('user:exam_finished', ({ userName, score, passed }: { userName: string; score: number; passed: boolean }) => {
      toast(
        `${userName} finalizó - ${score}% - ${passed ? '✓ Aprobado' : '✗ Reprobado'}`,
        { icon: passed ? '🎉' : '📋', duration: 6000 }
      );
    });

    return () => {
      socket.off('sessions:update');
      socket.off('anti_cheat:alert');
      socket.off('user:exam_finished');
    };
  }, []);

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.status === filter);
  const inExam = sessions.filter((s) => s.status === 'in_exam').length;
  const suspicious = sessions.filter((s) => s.is_suspicious).length;
  const connected = sessions.filter((s) => ['connected', 'idle', 'in_exam', 'starting_exam'].includes(s.status)).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Monitor en Tiempo Real</h1>
          <p className="text-gray-500 text-sm mt-1">Actualización automática cada 15 segundos</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Conectados" value={connected} icon={<Users size={20} />} color="green" />
        <StatsCard title="En Examen" value={inExam} icon={<Monitor size={20} />} color="blue" />
        <StatsCard title="Sospechosos" value={suspicious} icon={<AlertTriangle size={20} />} color="red" />
        <StatsCard title="Total Sesiones" value={sessions.length} icon={<Activity size={20} />} color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Sessions grid */}
        <div className="col-span-2">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'in_exam', label: 'En Examen' },
              { key: 'connected', label: 'Conectados' },
              { key: 'finished', label: 'Finalizados' },
              { key: 'disconnected', label: 'Desconectados' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {label}
                {key !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    ({sessions.filter((s) => s.status === key).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Monitor size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No hay sesiones activas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((session) => (
                <UserMonitorCard key={session.user_id} session={session} />
              ))}
            </div>
          )}
        </div>

        {/* Alert feed */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Alertas Antitrampa
          </h3>
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin alertas recientes</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">{alert.message}</p>
                  <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
                    {alert.timestamp.toLocaleTimeString('es-MX')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
