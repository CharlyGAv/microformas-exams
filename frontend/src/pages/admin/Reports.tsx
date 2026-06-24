import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, attemptApi, dashboardApi } from '../../services/api';
import { Modal } from '../../components/UI/Modal';
import { Download, FileText, FileSpreadsheet, Table, Users, BarChart3, Shield, AlertTriangle, Eye, CheckCircle, XCircle, Loader, ArrowLeft, Filter, X, MapPin, User, Clock } from 'lucide-react';
import { Badge } from '../../components/UI/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const reports = [
  { key: 'general', label: 'Resultados Generales', icon: BarChart3, desc: 'Todos los intentos de exámenes con detalles', color: 'blue' },
  { key: 'user',    label: 'Resultados por Usuario', icon: Users,    desc: 'Historial completo por colaborador',         color: 'indigo' },
  { key: 'area',    label: 'Resultados por Área',    icon: FileText,  desc: 'Comparativo de desempeño por área',         color: 'purple' },
  { key: 'security',label: 'Incidencias de Seguridad', icon: Shield, desc: 'Eventos sospechosos y alertas antitrampa',   color: 'red' },
] as const;

type ReportKey = typeof reports[number]['key'];
type ColorKey  = 'blue' | 'indigo' | 'purple' | 'red';

const colorStyles: Record<ColorKey, string> = {
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

interface AnswerOption { id: string; option_text: string; is_correct: boolean; }
interface Answer {
  id: string; question_text: string; question_type: string;
  is_correct: boolean; points_earned: number; max_points: number;
  feedback?: string; open_text_answer?: string;
  selected_option_ids?: string[]; options?: AnswerOption[];
  time_expired?: boolean;
}
interface AttemptDetail {
  exam_title: string; score: number; passed: boolean;
  user_name?: string; email?: string;
}

const REPORTS_WITH_ANSWERS: ReportKey[] = ['general', 'user'];
const REPORTS_WITH_FILTERS: ReportKey[] = ['general'];

const COBERTURAS = [
  'NORTE','NORESTE','NOROESTE','BAJIO',
  'METRO SUCURSALES','METRO EDIFICIOS',
  'OCCIDENTE','SUR','CENTRO','PENINSULAR',
  'ASSET','PROYECTOS',
];
const GERENTES = [
  'CARLOS RAUL GARCIA AVILEZ',
  'RAMSES JESUS JACOBO MORALES JUAREZ',
  'CESAR GIL NOLASCO',
  'EMILIO MENDOZA HERNANDEZ',
  'NORMA GUERRERO RODRÍGUEZ',
  'JONATHAN MENDOZA ESCALANTE',
];

const COL_LABELS: Record<string, string> = {
  nombre:              'Nombre',
  email:               'Correo',
  area:                'Área',
  cobertura:           'Cobertura',
  gerente:             'Gerente',
  examen:              'Examen',
  exam:                'Examen',
  score:               'Calificación',
  aprobado:            'Aprobado',
  passed:              'Aprobado',
  inicio:              'Inicio',
  envio:               'Envío',
  started_at:          'Inicio',
  submitted_at:        'Envío',
  cambios_pestana:     'Cambios de pestaña',
  copias:              'Copias/Pegados',
  salidas_pantalla:    'Salidas pantalla',
  tab_switch_count:    'Cambios de pestaña',
  copy_paste_count:    'Copias/Pegados',
  fullscreen_exit_count: 'Salidas pantalla',
  sospechoso:          'Sospechoso',
  is_suspicious:       'Sospechoso',
  estado:              'Estado',
  status:              'Estado',
  name:                'Nombre',
  event_type:          'Evento',
  severity:            'Severidad',
  occurred_at:         'Fecha',
  event_data:          'Datos',
  avg_score:           'Promedio',
  total:               'Total',
  passed_count:        'Aprobados',
  failed_count:        'Reprobados',
  tab_switch:          'Cambios pestaña',
};

const BOOLEAN_COLS  = new Set(['aprobado', 'passed', 'sospechoso', 'is_suspicious']);
const DATE_COLS     = new Set(['inicio', 'envio', 'started_at', 'submitted_at', 'occurred_at']);
const SCORE_COLS    = new Set(['score', 'avg_score']);

export const Reports = () => {
  const [activeReport,      setActiveReport]      = useState<ReportKey>('general');
  const [viewAttemptId,     setViewAttemptId]     = useState<string | null>(null);
  const [selectedExam,      setSelectedExam]      = useState('');
  const [selectedCobertura, setSelectedCobertura] = useState('');
  const [selectedGerente,   setSelectedGerente]   = useState('');

  const showFilters = REPORTS_WITH_FILTERS.includes(activeReport);
  const activeFilters = showFilters ? {
    exam_id:   selectedExam      || undefined,
    cobertura: selectedCobertura || undefined,
    gerente:   selectedGerente   || undefined,
  } : {};
  const hasFilters = !!(selectedExam || selectedCobertura || selectedGerente);

  const clearAll = () => { setSelectedExam(''); setSelectedCobertura(''); setSelectedGerente(''); };

  const { data: examsData } = useQuery({
    queryKey: ['exams-list'],
    queryFn:  dashboardApi.examsList,
    staleTime: 60_000,
  });
  const examsList: { id: string; title: string }[] = examsData?.data?.exams || [];

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeReport, selectedExam, selectedCobertura, selectedGerente],
    queryFn:  () => reportApi.get(activeReport, undefined, undefined, activeFilters),
  });
  const rows: Record<string, unknown>[] = data?.data?.data || [];

  const { data: attemptDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['attempt-detail', viewAttemptId],
    queryFn:  () => attemptApi.get(viewAttemptId!),
    enabled:  !!viewAttemptId,
  });
  const detailAttempt: AttemptDetail | undefined = attemptDetail?.data?.attempt;
  const detailAnswers: Answer[]                  = attemptDetail?.data?.answers || [];

  const handleExport = async (fmt: 'csv' | 'json' | 'xlsx') => {
    try {
      const res  = await reportApi.get(activeReport, undefined, fmt, activeFilters);
      const mime = fmt === 'csv'  ? 'text/csv'
                 : fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                 :                  'application/json';
      const ext  = fmt;
      const blob = new Blob([res.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Microformas_reporte_${activeReport}_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Reporte exportado como ${ext.toUpperCase()}`);
    } catch {
      toast.error('Error al exportar el reporte');
    }
  };

  const activeRpt        = reports.find((r) => r.key === activeReport)!;
  const showAnswersBtn   = REPORTS_WITH_ANSWERS.includes(activeReport);
  const visibleCols      = rows[0] ? Object.keys(rows[0]).filter((c) => c !== 'id') : [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Reportes y Análisis</h1>
          <p className="text-gray-500 text-sm mt-1">Exporta datos en múltiples formatos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleExport('xlsx')} className="btn-primary">
            <Table size={16} /> Exportar Excel
          </button>
          <button onClick={() => handleExport('csv')}  className="btn-secondary"><FileSpreadsheet size={16} /> CSV</button>
          <button onClick={() => handleExport('json')} className="btn-secondary"><Download size={16} /> JSON</button>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reports.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`card p-4 text-left transition-all hover:shadow-md ${activeReport === r.key ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorStyles[r.color as ColorKey]}`}>
              <r.icon size={18} />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{r.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Barra de filtros (solo Resultados Generales) ── */}
      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros</span>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <X size={12} /> Limpiar todo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Examen */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <FileText size={11} /> Examen
              </label>
              <div className="relative">
                <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="input text-sm pr-7">
                  <option value="">— Todos —</option>
                  {examsList.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                {selectedExam && (
                  <button onClick={() => setSelectedExam('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Cobertura */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <MapPin size={11} /> Cobertura
              </label>
              <div className="relative">
                <select value={selectedCobertura} onChange={(e) => setSelectedCobertura(e.target.value)} className="input text-sm pr-7">
                  <option value="">— Todas —</option>
                  {COBERTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {selectedCobertura && (
                  <button onClick={() => setSelectedCobertura('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Gerente */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <User size={11} /> Gerente
              </label>
              <div className="relative">
                <select value={selectedGerente} onChange={(e) => setSelectedGerente(e.target.value)} className="input text-sm pr-7">
                  <option value="">— Todos —</option>
                  {GERENTES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {selectedGerente && (
                  <button onClick={() => setSelectedGerente('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chips de filtros activos */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedExam && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <FileText size={10} />
                  {examsList.find((e) => e.id === selectedExam)?.title || 'Examen'}
                  <button onClick={() => setSelectedExam('')}><X size={10} /></button>
                </span>
              )}
              {selectedCobertura && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <MapPin size={10} /> {selectedCobertura}
                  <button onClick={() => setSelectedCobertura('')}><X size={10} /></button>
                </span>
              )}
              {selectedGerente && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                  <User size={10} /> {selectedGerente}
                  <button onClick={() => setSelectedGerente('')}><X size={10} /></button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <activeRpt.icon size={18} />
            {activeRpt.label}
          </h3>
          <Badge variant="gray">{rows.length} registros</Badge>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Sin datos para este reporte</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {visibleCols.map((col) => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {COL_LABELS[col] ?? col.replace(/_/g, ' ')}
                    </th>
                  ))}
                  {showAnswersBtn && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center whitespace-nowrap">
                      Respuestas
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {visibleCols.map((col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {BOOLEAN_COLS.has(col) ? (
                            col === 'sospechoso' || col === 'is_suspicious'
                              ? (val ? <Badge variant="red"><AlertTriangle size={11} /> Sospechoso</Badge> : <span className="text-gray-400">—</span>)
                              : <Badge variant={val ? 'green' : 'red'}>{val ? 'Sí' : 'No'}</Badge>
                          ) : DATE_COLS.has(col) && val ? (
                            format(new Date(val as string), "d MMM yyyy HH:mm", { locale: es })
                          ) : SCORE_COLS.has(col) && val != null ? (
                            <span className={`font-bold ${parseFloat(val as string) >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                              {parseFloat(val as string).toFixed(1)}%
                            </span>
                          ) : col === 'estado' || col === 'status' ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              val === 'submitted'      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              val === 'in_progress'    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              val === 'auto_submitted' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                         'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              {val === 'submitted'      ? 'Enviado' :
                               val === 'in_progress'    ? 'En progreso' :
                               val === 'auto_submitted' ? 'Auto-enviado' :
                               val === 'timed_out'      ? 'Tiempo agotado' : String(val ?? '—')}
                            </span>
                          ) : (
                            String(val ?? '—')
                          )}
                        </td>
                      );
                    })}
                    {showAnswersBtn && (
                      <td className="px-4 py-3 text-center">
                        {row.id ? (
                          <button
                            onClick={() => setViewAttemptId(row.id as string)}
                            title="Ver respuestas"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                          >
                            <Eye size={13} /> Ver
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/30">
                Mostrando 100 de {rows.length} registros. Exporta para ver todos.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de respuestas ── */}
      <Modal
        isOpen={!!viewAttemptId}
        onClose={() => setViewAttemptId(null)}
        title={detailAttempt ? `Respuestas — ${detailAttempt.exam_title}` : 'Cargando...'}
        size="2xl"
        footer={
          <button className="btn-secondary" onClick={() => setViewAttemptId(null)}>
            <ArrowLeft size={15} /> Cerrar
          </button>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={28} className="animate-spin text-brand-500" />
          </div>
        ) : detailAttempt ? (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

            {/* Info del usuario si está disponible */}
            {(detailAttempt.user_name || detailAttempt.email) && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Users size={14} className="text-brand-500 flex-shrink-0" />
                <span className="font-medium text-gray-800 dark:text-white">{detailAttempt.user_name}</span>
                {detailAttempt.email && <span className="text-gray-400">·</span>}
                <span>{detailAttempt.email}</span>
              </div>
            )}

            {/* Resumen */}
            {(() => {
              const totalEarned  = detailAnswers.reduce((s, a) => s + (parseFloat(String(a.points_earned)) || 0), 0);
              const totalMax     = detailAnswers.reduce((s, a) => s + (parseFloat(String(a.max_points))    || 0), 0);
              const correctCount = detailAnswers.filter((a) => a.is_correct).length;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Calificación', value: `${parseFloat(String(detailAttempt.score || 0)).toFixed(1)}%`,  color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Puntos',       value: `${totalEarned % 1 === 0 ? totalEarned : totalEarned.toFixed(1)} / ${totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)}`, color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Resultado',    value: detailAttempt.passed ? 'Aprobado' : 'Reprobado',                color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Correctas',    value: `${correctCount} / ${detailAnswers.length}`,                    color: 'text-gray-900 dark:text-white' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Preguntas */}
            {detailAnswers.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin respuestas registradas</p>
            ) : (
              <div className="space-y-3">
                {detailAnswers.map((answer, i) => (
                  <div key={answer.id} className={`rounded-xl border p-4 ${
                    answer.time_expired
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
                      : answer.is_correct
                      ? 'border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10'
                  }`}>
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold flex items-center justify-center text-gray-600 dark:text-gray-300">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{answer.question_text}</p>
                        {answer.time_expired && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                            <Clock size={10} /> Tiempo expirado — sin respuesta
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {answer.is_correct
                          ? <CheckCircle size={16} className="text-green-600" />
                          : <XCircle    size={16} className={answer.time_expired ? 'text-amber-500' : 'text-red-500'} />}
                        <span className={`text-xs font-bold ${answer.is_correct ? 'text-green-600' : answer.time_expired ? 'text-amber-600' : 'text-red-500'}`}>
                          {answer.points_earned}/{answer.max_points}pts
                        </span>
                      </div>
                    </div>

                    {answer.open_text_answer ? (
                      <div className="ml-8 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {answer.open_text_answer}
                      </div>
                    ) : (
                      <div className="ml-8 space-y-1.5">
                        {(answer.options || []).map((opt) => {
                          const selected = answer.selected_option_ids?.includes(opt.id);
                          return (
                            <div key={opt.id} className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                              opt.is_correct
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 font-medium'
                                : selected
                                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                              {opt.is_correct ? <CheckCircle size={11} /> : selected ? <XCircle size={11} /> : <span className="w-[11px]" />}
                              {opt.option_text}
                              {opt.is_correct && <span className="ml-auto text-green-600 dark:text-green-400 text-[10px]">✓ Correcta</span>}
                              {selected && !opt.is_correct && <span className="ml-auto text-red-500 text-[10px]">✗ Elegida</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {answer.feedback && (
                      <div className="ml-8 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Retroalimentación</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{answer.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
