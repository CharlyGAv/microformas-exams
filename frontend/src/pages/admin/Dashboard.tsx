import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/api';
import { StatsCard } from '../../components/UI/StatsCard';
import {
  FileText, Users, Monitor, TrendingUp, CheckCircle, XCircle,
  Clock, Award, AlertTriangle, Activity, Filter, X, MapPin, User,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const COBERTURAS = [
  'NORTE','NORESTE','NOROESTE','BAJIO',
  'METRO SUCURSALES','METRO EDIFICIOS',
  'OCCIDENTE','SUR','CENTRO','PENINSULAR',
];

const GERENTES = [
  'CARLOS RAUL GARCIA AVILEZ',
  'RAMSES JESUS JACOBO MORALES JUAREZ',
  'CESAR GIL NOLASCO',
  'EMILIO MENDOZA HERNANDEZ',
];

const REFRESH = 30_000;

export const Dashboard = () => {
  const [selectedExam,      setSelectedExam]      = useState('');
  const [selectedCobertura, setSelectedCobertura] = useState('');
  const [selectedGerente,   setSelectedGerente]   = useState('');

  const filters = {
    examId:    selectedExam      || undefined,
    cobertura: selectedCobertura || undefined,
    gerente:   selectedGerente   || undefined,
  };

  const qKey = [selectedExam, selectedCobertura, selectedGerente];

  const { data: examsData } = useQuery({
    queryKey: ['exams-list'],
    queryFn: dashboardApi.examsList,
    staleTime: 60_000,
  });
  const examsList: { id: string; title: string }[] = examsData?.data?.exams || [];

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats', ...qKey],
    queryFn: () => dashboardApi.stats(filters),
    refetchInterval: REFRESH,
  });
  const { data: byExam } = useQuery({
    queryKey: ['results-by-exam', ...qKey],
    queryFn: () => dashboardApi.byExam(filters),
    refetchInterval: REFRESH,
  });
  const { data: byArea } = useQuery({
    queryKey: ['results-by-area', ...qKey],
    queryFn: () => dashboardApi.byArea(filters),
    refetchInterval: REFRESH,
  });
  const { data: byMonth } = useQuery({
    queryKey: ['results-by-month', ...qKey],
    queryFn: () => dashboardApi.byMonth(filters),
    refetchInterval: REFRESH,
  });
  const { data: topScores } = useQuery({
    queryKey: ['top-scores', ...qKey],
    queryFn: () => dashboardApi.topScores(filters),
    refetchInterval: REFRESH,
  });
  const { data: byCoberturaData } = useQuery({
    queryKey: ['results-by-cobertura', ...qKey],
    queryFn: () => dashboardApi.byCobertura(filters),
    refetchInterval: REFRESH,
  });
  const { data: byGerenteData } = useQuery({
    queryKey: ['results-by-gerente', ...qKey],
    queryFn: () => dashboardApi.byGerente(filters),
    refetchInterval: REFRESH,
  });

  const stats         = statsData?.data;
  const examData      = byExam?.data?.data || [];
  const areaData      = byArea?.data?.data || [];
  const monthData     = byMonth?.data?.data || [];
  const top           = topScores?.data?.top || [];
  const bottom        = topScores?.data?.bottom || [];
  const coberturaData: { cobertura: string; avg_score: number; total: number; passed: number; failed: number }[] =
    byCoberturaData?.data?.data || [];
  const gerenteData: { gerente: string; avg_score: number; total: number; passed: number; failed: number }[] =
    byGerenteData?.data?.data || [];

  const approvalData = stats ? [
    { name: 'Aprobados',  value: parseFloat(stats.approval_rate) || 0 },
    { name: 'Reprobados', value: parseFloat(stats.fail_rate)     || 0 },
  ] : [];

  const hasFilters = !!(selectedExam || selectedCobertura || selectedGerente);

  const clearAll = () => {
    setSelectedExam('');
    setSelectedCobertura('');
    setSelectedGerente('');
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Barra de filtros ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter size={16} className="text-brand-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros de análisis</span>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <X size={12} /> Limpiar todo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Examen */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
              <FileText size={11} /> Examen
            </label>
            <div className="relative">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="input text-sm pr-7"
              >
                <option value="">— Todos —</option>
                {examsList.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              {selectedExam && (
                <button
                  onClick={() => setSelectedExam('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Cobertura */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
              <MapPin size={11} /> Cobertura
            </label>
            <div className="relative">
              <select
                value={selectedCobertura}
                onChange={(e) => setSelectedCobertura(e.target.value)}
                className="input text-sm pr-7"
              >
                <option value="">— Todas —</option>
                {COBERTURAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {selectedCobertura && (
                <button
                  onClick={() => setSelectedCobertura('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Gerente */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
              <User size={11} /> Gerente
            </label>
            <div className="relative">
              <select
                value={selectedGerente}
                onChange={(e) => setSelectedGerente(e.target.value)}
                className="input text-sm pr-7"
              >
                <option value="">— Todos —</option>
                {GERENTES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {selectedGerente && (
                <button
                  onClick={() => setSelectedGerente('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chips activos */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedExam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium">
                <FileText size={10} /> {examsList.find((e) => e.id === selectedExam)?.title}
                <button onClick={() => setSelectedExam('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {selectedCobertura && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                <MapPin size={10} /> {selectedCobertura}
                <button onClick={() => setSelectedCobertura('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {selectedGerente && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium">
                <User size={10} /> {selectedGerente}
                <button onClick={() => setSelectedGerente('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            <span className="text-xs text-gray-400 self-center ml-auto">
              Actualización automática cada 30 s
            </span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard title="Exámenes Activos"     value={stats?.exams?.active ?? '-'}          icon={<FileText size={20} />} color="blue" />
        <StatsCard title="Usuarios"              value={stats?.users?.total ?? '-'}            icon={<Users size={20} />}    color="indigo" />
        <StatsCard title="Conectados Ahora"      value={stats?.active_users ?? '-'}            subtitle="en tiempo real" icon={<Activity size={20} />} color="green" />
        <StatsCard title="En Examen"             value={stats?.attempts?.in_progress ?? '-'}  subtitle="activos" icon={<Monitor size={20} />} color="purple" />
        <StatsCard title="Promedio General"      value={stats?.avg_score ? `${stats.avg_score}%` : '-'} icon={<Award size={20} />} color="yellow" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Exáms. Programados"   value={stats?.exams?.scheduled ?? '-'}       icon={<Clock size={20} />}        color="blue" />
        <StatsCard title="Exáms. Finalizados"   value={stats?.exams?.finished ?? '-'}        icon={<FileText size={20} />}     color="gray" />
        <StatsCard title="Tasa de Aprobación"   value={stats?.approval_rate ? `${stats.approval_rate}%` : '-'} icon={<CheckCircle size={20} />} color="green" />
        <StatsCard title="Tasa de Reprobación"  value={stats?.fail_rate     ? `${stats.fail_rate}%`     : '-'} icon={<XCircle size={20} />}    color="red" />
      </div>

      {/* ── Gráficas Row 1 ── */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resultados por Mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Promedio']} />
              <Area type="monotone" dataKey="avg_score" stroke="#3b82f6" fill="url(#colorScore)" strokeWidth={2} name="Promedio" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Aprobación Global</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={approvalData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {approvalData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Gráficas Row 2 ── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Promedio por Examen</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={examData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="exam" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Promedio']} />
              <Bar dataKey="avg_score" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Promedio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Desempeño por Área</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="area" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Promedio']} />
              <Bar dataKey="avg_score" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Promedio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Cobertura y Gerente ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Cobertura */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" /> Desempeño por Cobertura
          </h3>
          {coberturaData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={coberturaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="cobertura" tick={{ fontSize: 9 }} width={110} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Promedio']} />
                  <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 4, 4, 0]} name="Promedio" />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-1.5 font-medium">Cobertura</th>
                    <th className="text-center py-1.5 font-medium">Total</th>
                    <th className="text-center py-1.5 font-medium text-green-600">Aprobados</th>
                    <th className="text-center py-1.5 font-medium text-red-500">Reprobados</th>
                    <th className="text-right py-1.5 font-medium">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {coberturaData.map((row) => (
                    <tr key={row.cobertura} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-1.5 font-medium text-gray-700 dark:text-gray-300">{row.cobertura}</td>
                      <td className="py-1.5 text-center text-gray-600 dark:text-gray-400">{row.total}</td>
                      <td className="py-1.5 text-center text-green-600">{row.passed}</td>
                      <td className="py-1.5 text-center text-red-500">{row.failed}</td>
                      <td className="py-1.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{row.avg_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
              <MapPin size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin datos de cobertura aún</p>
            </div>
          )}
        </div>

        {/* Gerente */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-teal-500" /> Desempeño por Gerente
          </h3>
          {gerenteData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gerenteData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="gerente" tick={{ fontSize: 8 }} width={130} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Promedio']} />
                  <Bar dataKey="avg_score" fill="#14b8a6" radius={[0, 4, 4, 0]} name="Promedio" />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-1.5 font-medium">Gerente</th>
                    <th className="text-center py-1.5 font-medium">Total</th>
                    <th className="text-center py-1.5 font-medium text-green-600">Aprobados</th>
                    <th className="text-center py-1.5 font-medium text-red-500">Reprobados</th>
                    <th className="text-right py-1.5 font-medium">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {gerenteData.map((row) => (
                    <tr key={row.gerente} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-1.5 font-medium text-gray-700 dark:text-gray-300 max-w-[160px] truncate" title={row.gerente}>{row.gerente}</td>
                      <td className="py-1.5 text-center text-gray-600 dark:text-gray-400">{row.total}</td>
                      <td className="py-1.5 text-center text-green-600">{row.passed}</td>
                      <td className="py-1.5 text-center text-red-500">{row.failed}</td>
                      <td className="py-1.5 text-right font-bold text-teal-600 dark:text-teal-400">{row.avg_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
              <User size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin datos de gerente aún</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Rankings ── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" /> Top Mejores Calificaciones
          </h3>
          <div className="space-y-2">
            {top.slice(0, 5).map((row: { name: string; cobertura?: string; score: number; exam: string }, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.name}</p>
                  <p className="text-xs text-gray-500 truncate">{row.cobertura ? `${row.cobertura} · ` : ''}{row.exam}</p>
                </div>
                <span className="text-green-600 dark:text-green-400 font-bold text-sm">{row.score}%</span>
              </div>
            ))}
            {top.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos aún</p>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Necesitan Atención
          </h3>
          <div className="space-y-2">
            {bottom.slice(0, 5).map((row: { name: string; cobertura?: string; score: number; exam: string }, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.name}</p>
                  <p className="text-xs text-gray-500 truncate">{row.cobertura ? `${row.cobertura} · ` : ''}{row.exam}</p>
                </div>
                <span className="text-red-600 dark:text-red-400 font-bold text-sm">{row.score}%</span>
              </div>
            ))}
            {bottom.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos aún</p>}
          </div>
        </div>
      </div>

    </div>
  );
};
