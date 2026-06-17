import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, attemptApi } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/UI/Modal';
import { Badge, StatusBadge } from '../../components/UI/Badge';
import { Search, Edit, Users as UsersIcon, MapPin, User as UserIcon, ClipboardList, Trash2, CheckCircle, XCircle, Loader, Eye, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserFormData { name: string; role: 'admin' | 'supervisor' | 'user'; area: string; is_active: boolean; }
interface Attempt { id: string; exam_title: string; score: number; passed: boolean; status: string; submitted_at: string; created_at: string; }
interface AnswerOption { id: string; option_text: string; is_correct: boolean; }
interface Answer { id: string; question_text: string; question_type: string; is_correct: boolean; points_earned: number; max_points: number; feedback?: string; open_text_answer?: string; selected_option_ids?: string[]; options?: AnswerOption[]; }

const roleVariant = { admin: 'red', supervisor: 'blue', user: 'green' } as const;
const roleLabel = { admin: 'SuperAdministrador', supervisor: 'Administrador', user: 'Colaborador' };

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [historyTarget, setHistoryTarget] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewAttemptId, setViewAttemptId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: userApi.list });
  const users: (User & { total_attempts: number; avg_score: number; passed_count: number })[] = data?.data?.users || [];

  const { register, handleSubmit, reset } = useForm<UserFormData>();

  const openEdit = (u: User) => {
    setEditTarget(u);
    reset({ name: u.name, role: u.role, area: u.area || '', is_active: u.is_active });
  };

  const updateMutation = useMutation({
    mutationFn: (data: UserFormData) => userApi.update(editTarget!.id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado');
      setEditTarget(null);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const { data: attemptsData, isLoading: attemptsLoading } = useQuery({
    queryKey: ['user-attempts', historyTarget?.id],
    queryFn: () => attemptApi.userAttempts(historyTarget!.id),
    enabled: !!historyTarget,
  });
  const attempts: Attempt[] = attemptsData?.data?.attempts || [];

  const deleteMutation = useMutation({
    mutationFn: (attemptId: string) => attemptApi.delete(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-attempts', historyTarget?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
      toast.success('Registro eliminado');
    },
    onError: () => toast.error('Error al eliminar el registro'),
  });

  const { data: attemptDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['attempt-detail', viewAttemptId],
    queryFn: () => attemptApi.get(viewAttemptId!),
    enabled: !!viewAttemptId,
  });
  const detailAttempt = attemptDetail?.data?.attempt;
  const detailAnswers: Answer[] = attemptDetail?.data?.answers || [];

  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.area || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.cobertura || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.gerente || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuarios registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Buscar por nombre, correo o área..."
        />
      </div>

      {isLoading ? (
        <div className="card divide-y divide-gray-200 dark:divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cobertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gerente</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exámenes</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promedio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={roleVariant[u.role]}>{roleLabel[u.role]}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{u.area || '—'}</td>
                    <td className="px-4 py-3">
                      {u.cobertura ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                          <MapPin size={10} /> {u.cobertura}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[160px] truncate">
                      {u.gerente ? (
                        <span className="inline-flex items-center gap-1" title={u.gerente}>
                          <UserIcon size={10} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{u.gerente}</span>
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-900 dark:text-white font-medium">{u.total_attempts || 0}</span>
                        <span className="text-xs text-green-600">({u.passed_count || 0} ✓)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.avg_score != null ? (
                        <span className={`font-bold text-sm ${parseFloat(u.avg_score as unknown as string) >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                          {parseFloat(u.avg_score as unknown as string).toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? 'green' : 'red'} dot>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {format(new Date(u.created_at), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setHistoryTarget(u)} title="Ver registros de exámenes"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors">
                          <ClipboardList size={15} />
                        </button>
                        <button onClick={() => openEdit(u)} title="Editar usuario"
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors">
                          <Edit size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <UsersIcon size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => { setHistoryTarget(null); setDeleteConfirm(null); }}
        title={`Registros de exámenes — ${historyTarget?.name}`}
        size="2xl"
        footer={
          <button className="btn-secondary" onClick={() => { setHistoryTarget(null); setDeleteConfirm(null); }}>
            Cerrar
          </button>
        }
      >
        {attemptsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader size={28} className="animate-spin text-brand-500" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Este usuario no tiene registros de exámenes</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {attempts.map((a) => (
              <div key={a.id}>
                {/* Confirmación de borrado inline */}
                {deleteConfirm === a.id ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="flex-1 text-sm text-red-700 dark:text-red-300 font-medium">
                      ¿Eliminar este registro permanentemente?
                    </p>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-60"
                    >
                      {deleteMutation.isPending ? <Loader size={12} className="animate-spin inline mr-1" /> : null}
                      Sí, eliminar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      a.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {a.passed
                        ? <CheckCircle size={16} className="text-green-600" />
                        : <XCircle    size={16} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.exam_title}</p>
                      <p className="text-xs text-gray-400">
                        {a.submitted_at
                          ? format(new Date(a.submitted_at), "d MMM yyyy 'a las' HH:mm", { locale: es })
                          : format(new Date(a.created_at), "d MMM yyyy", { locale: es })
                        }
                        {' · '}
                        <span className={a.status === 'submitted' ? 'text-gray-500' : 'text-amber-500'}>
                          {a.status === 'submitted' ? 'Completado' : a.status === 'in_progress' ? 'En progreso' : a.status}
                        </span>
                      </p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${a.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {a.score != null ? `${parseFloat(String(a.score)).toFixed(1)}%` : '—'}
                    </span>
                    <button
                      onClick={() => setViewAttemptId(a.id)}
                      title="Ver respuestas"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(a.id)}
                      title="Eliminar registro"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Attempt Detail Modal */}
      <Modal
        isOpen={!!viewAttemptId}
        onClose={() => setViewAttemptId(null)}
        title={detailAttempt ? `Respuestas — ${detailAttempt.exam_title}` : 'Cargando...'}
        size="2xl"
        footer={
          <button className="btn-secondary" onClick={() => setViewAttemptId(null)}>
            <ArrowLeft size={15} /> Volver al historial
          </button>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader size={28} className="animate-spin text-brand-500" />
          </div>
        ) : detailAttempt ? (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Resumen */}
            {(() => {
              const totalEarned = detailAnswers.reduce((s, a) => s + (parseFloat(String(a.points_earned)) || 0), 0);
              const totalMax    = detailAnswers.reduce((s, a) => s + (parseFloat(String(a.max_points))    || 0), 0);
              const correctCount = detailAnswers.filter(a => a.is_correct).length;
              return (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Calificación',  value: `${parseFloat(String(detailAttempt.score || 0)).toFixed(1)}%`,  color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Puntos',        value: `${totalEarned % 1 === 0 ? totalEarned : totalEarned.toFixed(1)} / ${totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)}`, color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Resultado',     value: detailAttempt.passed ? 'Aprobado' : 'Reprobado',                color: detailAttempt.passed ? 'text-green-600' : 'text-red-500' },
                    { label: 'Correctas',     value: `${correctCount} / ${detailAnswers.length}`,                    color: 'text-gray-900 dark:text-white' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Preguntas y respuestas */}
            {detailAnswers.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin respuestas registradas</p>
            ) : (
              <div className="space-y-3">
                {detailAnswers.map((answer, i) => (
                  <div key={answer.id} className={`rounded-xl border p-4 ${
                    answer.is_correct
                      ? 'border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10'
                  }`}>
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold flex items-center justify-center text-gray-600 dark:text-gray-300">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">{answer.question_text}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {answer.is_correct
                          ? <CheckCircle size={16} className="text-green-600" />
                          : <XCircle    size={16} className="text-red-500" />
                        }
                        <span className={`text-xs font-bold ${answer.is_correct ? 'text-green-600' : 'text-red-500'}`}>
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

      {/* Edit Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar Usuario"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit((d) => updateMutation.mutate(d))} disabled={updateMutation.isPending}>
              Guardar
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input {...register('name', { required: true })} className="input" />
          </div>
          {isSuperAdmin ? (
            <div>
              <label className="label">Rol</label>
              <select {...register('role')} className="input">
                <option value="user">Colaborador</option>
                <option value="supervisor">Administrador</option>
                <option value="admin">SuperAdministrador</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Rol</label>
              <div className="input bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed flex items-center gap-2">
                <span>{roleLabel[editTarget?.role as keyof typeof roleLabel] || '—'}</span>
                <span className="ml-auto text-xs">(solo SuperAdministrador puede cambiar)</span>
              </div>
            </div>
          )}
          <div>
            <label className="label">Área</label>
            <input {...register('area')} className="input" placeholder="Ej: Recursos Humanos" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 text-brand-600 rounded" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuario activo</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};
