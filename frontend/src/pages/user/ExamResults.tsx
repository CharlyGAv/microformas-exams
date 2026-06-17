import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attemptApi } from '../../services/api';
import { UserAnswer } from '../../types';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../../components/UI/Badge';
import { useState } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ExamResults = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => attemptApi.get(attemptId!),
  });

  const attempt = data?.data?.attempt;
  const answers: UserAnswer[] = data?.data?.answers || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) return null;

  const passed = attempt.passed;
  const score = parseFloat(attempt.score) || 0;
  const correct = answers.filter((a) => a.is_correct).length;
  const incorrect = answers.filter((a) => a.is_correct === false).length;
  const totalTimeSeconds = attempt.submitted_at && attempt.started_at
    ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
    : 0;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in py-6">
      {/* Result hero */}
      <div className={clsx(
        'card p-8 text-center mb-6 relative overflow-hidden',
        passed ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
      )}>
        <div className={clsx(
          'absolute inset-0 opacity-5',
          passed ? 'bg-green-500' : 'bg-red-500'
        )} />

        <div className="relative z-10">
          <div className={clsx(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border-4',
            passed
              ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
              : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
          )}>
            {passed
              ? <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
              : <XCircle size={40} className="text-red-600 dark:text-red-400" />
            }
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
            {passed ? '¡Felicitaciones!' : 'Examen Finalizado'}
          </h1>
          <p className={clsx('text-lg font-semibold mb-4', passed ? 'text-green-600' : 'text-red-500')}>
            {passed ? 'Aprobaste el examen' : 'No alcanzaste la calificación mínima'}
          </p>

          <div className="text-7xl font-black mb-3" style={{ color: passed ? '#16a34a' : '#dc2626' }}>
            {score.toFixed(1)}%
          </div>

          <p className="text-sm text-gray-500">{attempt.exam_title}</p>
          <p className="text-xs text-gray-400 mt-1">
            {attempt.submitted_at && format(new Date(attempt.submitted_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: CheckCircle, label: 'Correctas', value: correct, color: 'text-green-600' },
          { icon: XCircle, label: 'Incorrectas', value: incorrect, color: 'text-red-500' },
          { icon: Clock, label: 'Tiempo usado', value: `${Math.floor(totalTimeSeconds / 60)}m ${totalTimeSeconds % 60}s`, color: 'text-blue-600' },
          { icon: Award, label: 'Estado', value: passed ? 'Aprobado' : 'Reprobado', color: passed ? 'text-green-600' : 'text-red-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={22} className={clsx('mx-auto mb-2', color)} />
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Security summary */}
      {(attempt.tab_switch_count > 0 || attempt.copy_paste_count > 0 || attempt.fullscreen_exit_count > 0) && (
        <div className="card p-4 mb-6 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Actividad registrada durante el examen</p>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
            {attempt.tab_switch_count > 0 && <span>Cambios de pestaña: <strong>{attempt.tab_switch_count}</strong></span>}
            {attempt.copy_paste_count > 0 && <span>Intentos de copiar: <strong>{attempt.copy_paste_count}</strong></span>}
            {attempt.fullscreen_exit_count > 0 && <span>Salidas de pantalla: <strong>{attempt.fullscreen_exit_count}</strong></span>}
          </div>
          {attempt.is_suspicious && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
              🚨 Este intento fue marcado como sospechoso y ha sido reportado al administrador.
            </p>
          )}
        </div>
      )}

      {/* Answer review */}
      {answers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Revisión de Respuestas</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {answers.map((answer, i) => {
              const isExpanded = expandedIdx === i;
              return (
                <div key={answer.id}>
                  <button
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  >
                    <div className={clsx('flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                      answer.is_correct ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    )}>
                      {answer.is_correct
                        ? <CheckCircle size={15} className="text-green-600" />
                        : <XCircle size={15} className="text-red-500" />
                      }
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 w-6">{i + 1}.</span>
                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left line-clamp-1">{answer.question_text}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={clsx('text-xs font-bold', answer.is_correct ? 'text-green-600' : 'text-red-500')}>
                        +{answer.points_earned}pts
                      </span>
                      {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/20">
                      {answer.open_text_answer ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Tu respuesta:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                            {answer.open_text_answer}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {answer.options?.map((opt) => (
                            <div key={opt.id} className={clsx(
                              'text-sm px-3 py-2 rounded-lg border flex items-center gap-2',
                              opt.is_correct
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                                : answer.selected_option_ids?.includes(opt.id)
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            )}>
                              {opt.is_correct ? <CheckCircle size={13} /> : answer.selected_option_ids?.includes(opt.id) ? <XCircle size={13} /> : null}
                              {opt.option_text}
                            </div>
                          ))}
                        </div>
                      )}
                      {answer.feedback && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Retroalimentación</p>
                          <p className="text-xs text-blue-700 dark:text-blue-400">{answer.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center mt-6">
        <button onClick={() => navigate('/home')} className="btn-secondary">
          <ArrowLeft size={16} /> Volver a mis exámenes
        </button>
      </div>
    </div>
  );
};
