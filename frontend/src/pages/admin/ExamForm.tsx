import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from '../../services/api';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ExamFormData {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_immediately: boolean;
  is_active: boolean;
}

export const ExamForm = () => {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExamFormData>({
    defaultValues: {
      passing_score: 70,
      max_attempts: 1,
      duration_minutes: 60,
      randomize_questions: false,
      randomize_options: false,
      show_results_immediately: true,
      is_active: true,
    },
  });

  const { data: examData } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (examData?.data?.exam) {
      const exam = examData.data.exam;
      reset({
        ...exam,
        start_datetime: format(new Date(exam.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        end_datetime: format(new Date(exam.end_datetime), "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }, [examData, reset]);

  const mutation = useMutation({
    mutationFn: (data: ExamFormData) =>
      isEdit ? examApi.update(id!, data as Record<string, unknown>) : examApi.create(data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(isEdit ? 'Examen actualizado' : 'Examen creado exitosamente');
      navigate('/admin/exams');
    },
    onError: () => toast.error('Error al guardar el examen'),
  });

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/exams')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Editar Examen' : 'Nuevo Examen'}</h1>
          <p className="text-gray-500 text-sm">{isEdit ? 'Modifica los datos del examen' : 'Configura un nuevo examen'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base border-b border-gray-200 dark:border-gray-800 pb-3">
            Información General
          </h2>

          <div>
            <label className="label">Nombre del examen *</label>
            <input {...register('title', { required: 'Requerido' })} className="input" placeholder="Ej: Inducción Corporativa 2026" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea {...register('description')} className="input" rows={3} placeholder="Descripción del examen y sus objetivos..." />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base border-b border-gray-200 dark:border-gray-800 pb-3">
            Programación
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha y hora de inicio *</label>
              <input type="datetime-local" {...register('start_datetime', { required: 'Requerido' })} className="input" />
              {errors.start_datetime && <p className="text-red-500 text-xs mt-1">{errors.start_datetime.message}</p>}
            </div>
            <div>
              <label className="label">Fecha y hora de fin *</label>
              <input type="datetime-local" {...register('end_datetime', { required: 'Requerido' })} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Duración total (minutos) *</label>
            <input type="number" min={1} max={480} {...register('duration_minutes', { required: 'Requerido', min: 1 })} className="input" />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base border-b border-gray-200 dark:border-gray-800 pb-3">
            Configuración de Evaluación
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Calificación mínima aprobatoria (%)</label>
              <input type="number" min={0} max={100} {...register('passing_score')} className="input" />
            </div>
            <div>
              <label className="label">Número de intentos permitidos</label>
              <input type="number" min={1} max={10} {...register('max_attempts')} className="input" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { field: 'randomize_questions' as const, label: 'Aleatorizar orden de preguntas', desc: 'Las preguntas aparecerán en orden aleatorio para cada usuario' },
              { field: 'randomize_options' as const, label: 'Aleatorizar opciones de respuesta', desc: 'Las opciones de cada pregunta se mostrarán en orden aleatorio' },
              { field: 'show_results_immediately' as const, label: 'Mostrar resultados al finalizar', desc: 'El usuario verá su calificación y retroalimentación inmediatamente' },
              { field: 'is_active' as const, label: 'Examen activo', desc: 'Los usuarios pueden ver y realizar este examen' },
            ].map(({ field, label, desc }) => (
              <label key={field} className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" {...register(field)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/exams')}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            <Save size={16} />
            {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar Examen' : 'Crear Examen'}
          </button>
        </div>
      </form>
    </div>
  );
};
