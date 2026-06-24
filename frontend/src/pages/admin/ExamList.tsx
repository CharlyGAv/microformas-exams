import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../services/api';
import { Exam } from '../../types';
import { Plus, Edit, Trash2, Eye, BookOpen, Clock, Users, CheckCircle } from 'lucide-react';
import { Badge, StatusBadge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import toast from 'react-hot-toast';
import { format, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';

const examStatus = (exam: Exam): string => {
  if (!exam.is_active) return 'inactive';
  if (isFuture(new Date(exam.start_datetime))) return 'scheduled';
  if (isPast(new Date(exam.end_datetime))) return 'expired';
  return 'available';
};

const statusLabel: Record<string, string> = {
  inactive: 'Inactivo', scheduled: 'Programado', expired: 'Expirado', available: 'Activo',
};
const statusVariant: Record<string, 'gray' | 'blue' | 'red' | 'green'> = {
  inactive: 'gray', scheduled: 'blue', expired: 'red', available: 'green',
};

export const ExamList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: examApi.list });
  const exams: Exam[] = data?.data?.exams || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Examen eliminado');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Error al eliminar el examen'),
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Exámenes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{exams.length} exámenes en total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/admin/exams/new')}>
          <Plus size={18} /> Nuevo Examen
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded mb-2 w-full" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const status = examStatus(exam);
            return (
              <div key={exam.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 line-clamp-2">{exam.description}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} />
                    <span>{exam.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={13} />
                    <span>{exam.question_count || 0} preguntas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} />
                    <span>{exam.total_attempts || 0} intentos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    <span>Min: {exam.passing_score}%</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4 space-y-0.5">
                  <p>Inicio: {format(new Date(exam.start_datetime), "d 'de' MMM yyyy HH:mm", { locale: es })}</p>
                  <p>Fin: {format(new Date(exam.end_datetime), "d 'de' MMM yyyy HH:mm", { locale: es })}</p>
                </div>

                {exam.avg_score !== undefined && exam.avg_score !== null && (
                  <div className="mb-4 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Promedio: <strong className="text-gray-900 dark:text-white">{exam.avg_score}%</strong></span>
                      <span>Aprobados: <strong className="text-green-600">{exam.passed_count || 0}</strong></span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                    className="flex-1 btn-secondary text-xs justify-center"
                  >
                    <BookOpen size={14} /> Preguntas
                  </button>
                  <button
                    onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}
                    className="p-2 btn-secondary"
                    title="Editar"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(exam)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          {exams.length === 0 && (
            <div className="col-span-full text-center py-16">
              <BookOpen size={48} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No hay exámenes registrados</p>
              <button className="btn-primary mt-4" onClick={() => navigate('/admin/exams/new')}>
                <Plus size={16} /> Crear el primero
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Examen"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="btn-danger" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">
          ¿Estás seguro que deseas eliminar <strong>"{deleteTarget?.title}"</strong>?
          Esta acción no se puede deshacer y eliminará todas las preguntas y resultados asociados.
        </p>
      </Modal>
    </div>
  );
};
