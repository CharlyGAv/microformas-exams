import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attemptApi, examApi } from '../../services/api';
import { Question } from '../../types';
import { QuestionCard } from '../../components/Exam/QuestionCard';
import { Timer } from '../../components/Exam/Timer';
import { AntiCheatWarning } from '../../components/Exam/AntiCheatWarning';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { getSocket } from '../../services/socket';
import { ChevronLeft, ChevronRight, Send, Loader, CheckCircle, XCircle, Home } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnswerState {
  selectedIds: string[];
  openText?: string;
  timeExpired?: boolean;
}

export const ExamRoom = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [examStarted, setExamStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attempt, setAttempt] = useState<{ id: string } | null>(null);
  const [warning, setWarning] = useState<{ message: string; severity: 'warning' | 'critical' } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [completed, setCompleted] = useState<{ score: number; passed: boolean } | null>(null);
  const [countdown, setCountdown] = useState(8);
  const socket = useRef(getSocket());

  const { data: examData } = useQuery({ queryKey: ['exam', examId], queryFn: () => examApi.get(examId!) });
  const exam = examData?.data?.exam;

  const startMutation = useMutation({
    mutationFn: () => attemptApi.start(examId!),
    onSuccess: (res) => {
      const { attempt, questions: qs, remaining_seconds } = res.data;
      setAttempt(attempt);
      setRemainingSeconds(remaining_seconds);
      setCurrentIdx(attempt.current_question_index || 0);
      setExamStarted(true);
      socket.current.emit('exam:start', { examId, attemptId: attempt.id });
      toast.success('¡Examen iniciado!');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error || 'Error al iniciar el examen');
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: Record<string, unknown> }) =>
      attemptApi.saveAnswer(attempt!.id, { question_id: questionId, ...data }),
  });

  const submitMutation = useMutation({
    mutationFn: () => attemptApi.submit(attempt!.id),
    onSuccess: (res) => {
      socket.current.emit('exam:finish', { attemptId: attempt!.id, score: res.data.score, passed: res.data.passed });
      queryClient.invalidateQueries({ queryKey: ['user-exams'] });
      queryClient.invalidateQueries({ queryKey: ['user-attempts'] });
      setCompleted({ score: res.data.score, passed: res.data.passed });
    },
    onError: (err: { response?: { status?: number } }) => {
      setSubmitting(false);
      // 404 = el backend ya lo marcó como auto_submitted pero el score no se calculó
      // En ese caso mostrar pantalla de completado con score 0 como fallback
      if (err?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['user-exams'] });
        setCompleted({ score: 0, passed: false });
      } else {
        toast.error('Error al enviar el examen. Intenta de nuevo.');
      }
    },
  });

  // Auto-cerrar warning y hacer countdown cuando el examen se completa
  useEffect(() => {
    if (!completed) return;
    setWarning(null);
    if (countdown <= 0) { navigate('/home'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [completed, countdown, navigate]);

  const handleAutoSubmit = useCallback(() => {
    if (attempt && !submitting) {
      setSubmitting(true);
      submitMutation.mutate();
    }
  }, [attempt, submitting, submitMutation]);

  const handleWarning = useCallback((message: string, severity: 'warning' | 'critical') => {
    setWarning({ message, severity });
  }, []);

  useAntiCheat({
    attemptId: attempt?.id || '',
    onWarning: handleWarning,
    onAutoSubmit: handleAutoSubmit,
    enabled: examStarted && !!attempt && !submitting && !completed,
  });

  // Query questions only when exam started
  const { data: questionsData } = useQuery({
    queryKey: ['exam-questions', examId],
    queryFn: () => examApi.getQuestions(examId!),
    enabled: examStarted,
  });
  const questions: Question[] = questionsData?.data?.questions || [];

  // Emit progress on question change
  useEffect(() => {
    if (attempt && questions.length > 0) {
      socket.current.emit('exam:progress', {
        attemptId: attempt.id,
        questionIndex: currentIdx,
        totalQuestions: questions.length,
        timeRemaining: remainingSeconds,
      });
    }
  }, [currentIdx, attempt, questions.length, remainingSeconds]);

  const handleAnswer = useCallback((questionId: string, selectedIds: string[], openText?: string, timeExpired?: boolean) => {
    const answerData = { selectedIds, openText, timeExpired };
    setAnswers((prev) => ({ ...prev, [questionId]: answerData }));

    if (attempt) {
      answerMutation.mutate({
        questionId,
        data: {
          selected_option_ids: selectedIds,
          open_text_answer: openText,
          time_spent_seconds: 0,
          time_expired: timeExpired ?? false,
        },
      });
    }

    // Auto-advance on time expired
    if (timeExpired && currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx((i) => i + 1), 1500);
    }
  }, [attempt, currentIdx, questions.length, answerMutation]);

  const doSubmit = useCallback(() => {
    if (submitting || !attempt) return;
    // Salir de fullscreen antes de enviar para evitar conflictos con el anti-cheat
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setSubmitting(true);
    setShowSubmitConfirm(false);
    submitMutation.mutate();
  }, [submitting, attempt, submitMutation]);

  const handleGlobalTimeUp = () => {
    toast.error('Se agotó el tiempo del examen');
    handleAutoSubmit();
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIdx];

  const isCurrentAnswered = (() => {
    if (!currentQuestion) return true;
    const a = answers[currentQuestion.id];
    if (!a) return false;
    if (currentQuestion.question_type === 'open_text') return !!(a.openText?.trim());
    return a.selectedIds.length > 0;
  })();

  const [showAnswerRequired, setShowAnswerRequired] = useState(false);

  const handleNext = () => {
    if (!isCurrentAnswered) { setShowAnswerRequired(true); return; }
    setShowAnswerRequired(false);
    setCurrentIdx((i) => i + 1);
  };

  // ── Pantalla de examen completado ──────────────────────────────────────────
  if (completed) {
    const passed = completed.passed;
    const score  = completed.score;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-md w-full text-center animate-fade-in">

          {/* Icono */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${
            passed
              ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
              : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
          }`}>
            {passed
              ? <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
              : <XCircle    size={48} className="text-red-500   dark:text-red-400"   />
            }
          </div>

          {/* Título */}
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {passed ? '¡Examen completado!' : 'Examen finalizado'}
          </h1>
          <p className={`text-lg font-semibold mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {passed ? 'Tu examen fue aprobado' : 'No alcanzaste la calificación mínima'}
          </p>

          {/* Calificación */}
          <div className={`text-6xl font-black my-5 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {score.toFixed(1)}%
          </div>

          {/* Mensaje de confirmación */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Tu información ha sido registrada correctamente.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {exam?.title}
            </p>
          </div>

          {/* Countdown + botón */}
          <p className="text-sm text-gray-500 mb-4">
            Redirigiendo al panel principal en <span className="font-bold text-brand-600">{countdown}</span> segundos...
          </p>
          <button
            onClick={() => navigate('/home')}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            <Home size={18} /> Ir al panel principal ahora
          </button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-lg w-full card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Send size={28} className="text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{exam?.title}</h2>
          {exam?.description && <p className="text-gray-500 mb-5">{exam.description}</p>}

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            {[
              ['Duración', `${exam?.duration_minutes} minutos`],
              ['Preguntas', exam?.question_count || '—'],
              ['Calificación mínima', `${exam?.passing_score}%`],
              ['Intentos permitidos', exam?.max_attempts],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="font-bold text-gray-900 dark:text-white">{val}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-left">
            <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm mb-2">⚠️ Instrucciones importantes</p>
            <ul className="text-amber-800 dark:text-amber-400 text-xs space-y-1">
              <li>• El examen se realizará en modo pantalla completa obligatorio</li>
              <li>• No podrás cambiar de pestaña o ventana durante el examen</li>
              <li>• Copiar y pegar está deshabilitado</li>
              <li>• Cada salida de la ventana será registrada (máx. 3 veces)</li>
              <li>• Al agotar el tiempo, el examen se enviará automáticamente</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer text-left mb-5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-brand-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              He leído y entiendo las instrucciones del examen. Confirmo que realizaré el examen de forma honesta.
            </span>
          </label>

          <button
            onClick={() => startMutation.mutate()}
            disabled={!confirmed || startMutation.isPending}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {startMutation.isPending ? (
              <><Loader size={18} className="animate-spin" /> Iniciando...</>
            ) : (
              'Comenzar Examen'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-fullscreen">
      {/* Anti-cheat warning */}
      {warning && (
        <AntiCheatWarning
          message={warning.message}
          severity={warning.severity}
          onDismiss={() => setWarning(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{exam?.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden max-w-xs">
                <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-500">
                {answeredCount}/{questions.length} respondidas ({progress}%)
              </span>
            </div>
          </div>

          <Timer totalSeconds={remainingSeconds} onTimeUp={handleGlobalTimeUp} />

          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="btn-primary flex-shrink-0"
          >
            {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Enviando...' : 'Enviar examen'}
          </button>
        </div>
      </div>

      {/* Modal de confirmación de envío (inline, sin window.confirm) */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-fade-in">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={26} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Enviar el examen?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Has respondido <strong className="text-gray-900 dark:text-white">{answeredCount}</strong> de <strong className="text-gray-900 dark:text-white">{questions.length}</strong> preguntas.
            </p>
            <p className="text-xs text-gray-400 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={doSubmit}
                className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700"
              >
                <Send size={15} /> Confirmar envío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-4 gap-6">
          {/* Question navigator */}
          <div className="col-span-1">
            <div className="card p-4 sticky top-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preguntas</p>
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                      i === currentIdx
                        ? 'bg-brand-600 text-white'
                        : answers[q.id]
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                  <span className="text-gray-500">Respondida ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
                  <span className="text-gray-500">Sin responder ({questions.length - answeredCount})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question content */}
          <div className="col-span-3">
            {currentQuestion ? (
              <div className="card p-7">
                <QuestionCard
                  question={currentQuestion}
                  index={currentIdx}
                  total={questions.length}
                  onAnswer={handleAnswer}
                  savedAnswer={answers[currentQuestion.id]}
                />

                {/* Navigation */}
                <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800">
                  {showAnswerRequired && (
                    <p className="text-red-500 text-sm text-center mb-3">Debes responder esta pregunta antes de continuar.</p>
                  )}
                  <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setShowAnswerRequired(false); setCurrentIdx((i) => Math.max(0, i - 1)); }}
                    disabled={currentIdx === 0}
                    className="btn-secondary disabled:opacity-40"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  {currentIdx < questions.length - 1 ? (
                    <button onClick={handleNext} className="btn-primary">
                      Siguiente <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      className="btn-primary bg-green-600 hover:bg-green-700"
                      disabled={submitting}
                    >
                      <Send size={16} /> Finalizar examen
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Loader size={32} className="animate-spin mx-auto text-brand-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
