import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../services/api';
import { Exam } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, BookOpen, Award, PlayCircle, CheckCircle, XCircle, Lock } from 'lucide-react';
import { Badge } from '../../components/UI/Badge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const DONE_STATUSES = ['submitted', 'auto_submitted', 'timed_out'];

const getExamStatus = (exam: Exam): { label: string; variant: 'green' | 'blue' | 'red' | 'gray' | 'yellow'; canStart: boolean } => {
  if (DONE_STATUSES.includes(exam.last_status || '')) {
    const canRetry = (exam.attempts_used || 0) < exam.max_attempts;
    return canRetry
      ? { label: 'Reintentar', variant: 'yellow', canStart: true }
      : { label: 'Completado', variant: 'green', canStart: false };
  }
  if (exam.last_status === 'in_progress') return { label: 'Continuar', variant: 'blue', canStart: true };
  return { label: 'Disponible', variant: 'green', canStart: true };
};

export const UserHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['user-exams'],
    queryFn: examApi.list,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  const now = new Date();

  // Filtro doble: servidor ya filtra por fecha, pero filtramos también en cliente
  // para que exámenes vencidos nunca aparezcan aunque la caché esté desactualizada
  const exams: Exam[] = (data?.data?.exams || []).filter(
    (e: Exam) => new Date(e.end_datetime) > now
  );

  const available = exams.filter((e) => !e.last_status || e.last_status === 'in_progress');
  const completed = exams.filter((e) => DONE_STATUSES.includes(e.last_status || ''));

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {user?.name?.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bienvenido de vuelta,</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {user?.area && (
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full">
                  {user.area}
                </span>
              )}
              {user?.cobertura && (
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                  {user.cobertura}
                </span>
              )}
              {user?.gerente && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Gerente: {user.gerente}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{exams.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Exámenes disponibles</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{available.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Por realizar</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Available exams */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exámenes Disponibles</h2>
            {available.length === 0 ? (
              <div className="card p-10 text-center">
                <BookOpen size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No tienes exámenes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {available.map((exam) => {
                  const { label, variant, canStart } = getExamStatus(exam);
                  return (
                    <div key={exam.id} className="card p-4 sm:p-5 flex items-start sm:items-center gap-4 sm:gap-5 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen size={22} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        {exam.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{exam.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration_minutes} minutos</span>
                          <span className="flex items-center gap-1"><Award size={12} /> Mínimo: {exam.passing_score}%</span>
                          <span className="flex items-center gap-1"><BookOpen size={12} /> {exam.question_count || 0} preguntas</span>
                          <span>
                            Intento {exam.attempts_used || 0} de {exam.max_attempts}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Vence: {formatDistanceToNow(new Date(exam.end_datetime), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {canStart ? (
                        <button
                          onClick={() => navigate(`/exam/${exam.id}`)}
                          className="btn-primary flex-shrink-0"
                        >
                          <PlayCircle size={18} />
                          {exam.last_status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 text-sm flex-shrink-0">
                          <Lock size={16} />
                          Sin intentos
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed exams */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exámenes Completados</h2>
              <div className="space-y-3">
                {completed.map((exam) => {
                  const passed = exam.best_score != null && parseFloat(String(exam.best_score)) >= parseFloat(String(exam.passing_score));
                  const canRetry = (exam.attempts_used || 0) < exam.max_attempts;
                  return (
                    <div key={exam.id} className="card p-4 sm:p-5 flex items-start sm:items-center gap-4 sm:gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {passed ? <CheckCircle size={22} className="text-green-600" /> : <XCircle size={22} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>Intento {exam.attempts_used} de {exam.max_attempts}</span>
                          {exam.best_score != null && (
                            <span className={`font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>
                              Mejor: {parseFloat(String(exam.best_score)).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {canRetry ? (
                        <button onClick={() => navigate(`/exam/${exam.id}`)} className="btn-secondary flex-shrink-0 text-sm">
                          <PlayCircle size={16} /> Reintentar
                        </button>
                      ) : (
                        <Badge variant={passed ? 'green' : 'red'} dot>
                          {passed ? 'Aprobado' : 'Reprobado'}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
