import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Clock, Edit } from 'lucide-react';
import { examApi } from '../../services/api';
import { Question, QuestionType } from '../../types';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, PlusCircle, MinusCircle, Image } from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import { Badge } from '../../components/UI/Badge';
import toast from 'react-hot-toast';

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Opción múltiple',
  true_false: 'Verdadero / Falso',
  multiple_select: 'Selección múltiple',
  open_text: 'Respuesta abierta',
  image_question: 'Con imagen',
};

interface QuestionFormData {
  question_text: string;
  question_type: QuestionType;
  image_url: string;
  points: number;
  time_limit_seconds: number | '';
  feedback: string;
  options: { option_text: string; is_correct: boolean }[];
}

const defaultForm: QuestionFormData = {
  question_text: '',
  question_type: 'multiple_choice',
  image_url: '',
  points: 1,
  time_limit_seconds: '',
  feedback: '',
  options: [
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
};

export const QuestionBank = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const { data: examData } = useQuery({ queryKey: ['exam', examId], queryFn: () => examApi.get(examId!) });
  const { data, isLoading } = useQuery({ queryKey: ['questions', examId], queryFn: () => examApi.getQuestions(examId!) });
  const questions: Question[] = data?.data?.questions || [];
  const exam = examData?.data?.exam;

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<QuestionFormData>({
    defaultValues: defaultForm,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const questionType = watch('question_type');
  const optionValues = watch('options');

  const openCreate = () => {
    setEditing(null);
    reset(defaultForm);
    setShowModal(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    reset({
      question_text: q.question_text,
      question_type: q.question_type,
      image_url: q.image_url || '',
      points: q.points,
      time_limit_seconds: q.time_limit_seconds || '',
      feedback: q.feedback || '',
      options: (q.options || []).map((o) => ({ option_text: o.option_text, is_correct: o.is_correct || false })),
    });
    setShowModal(true);
  };

  const handleTypeChange = (type: QuestionType) => {
    setValue('question_type', type);
    if (type === 'true_false') {
      setValue('options', [
        { option_text: 'Verdadero', is_correct: false },
        { option_text: 'Falso', is_correct: false },
      ]);
    } else if (type === 'open_text') {
      setValue('options', []);
    } else {
      if (fields.length < 2) {
        setValue('options', [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ]);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: QuestionFormData) => examApi.createQuestion(examId!, data as unknown as Record<string, unknown>),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions', examId] }); toast.success('Pregunta creada'); setShowModal(false); },
    onError: () => toast.error('Error al crear pregunta'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: QuestionFormData) => examApi.updateQuestion(examId!, editing!.id, data as unknown as Record<string, unknown>),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions', examId] }); toast.success('Pregunta actualizada'); setShowModal(false); },
    onError: () => toast.error('Error al actualizar pregunta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => examApi.deleteQuestion(examId!, questionId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions', examId] }); toast.success('Pregunta eliminada'); },
  });

  const onSubmit = (data: QuestionFormData) => {
    const payload = { ...data, time_limit_seconds: data.time_limit_seconds || null, order_index: questions.length };
    if (editing) updateMutation.mutate(payload as QuestionFormData);
    else createMutation.mutate(payload as QuestionFormData);
  };

  const needsOptions = questionType !== 'open_text';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/exams')} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="page-title">Banco de Preguntas</h1>
          <p className="text-gray-500 text-sm">{exam?.title} · {questions.length} preguntas</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} /> Agregar Pregunta
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">Este examen no tiene preguntas aún</p>
          <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Agregar primera pregunta</button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="card p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 flex-shrink-0 text-gray-400">
                <GripVertical size={18} className="cursor-grab" />
                <span className="text-sm font-bold text-gray-500 w-6 text-center">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm leading-snug">{q.question_text}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="blue">{typeLabels[q.question_type]}</Badge>
                  <Badge variant="gray">{q.points} {q.points === 1 ? 'punto' : 'puntos'}</Badge>
                  {q.time_limit_seconds && <Badge variant="yellow"><Clock /> {q.time_limit_seconds}s</Badge>}
                  {q.options && <span className="text-xs text-gray-400">{q.options.length} opciones</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(q)} className="btn-secondary p-2"><Edit size={15} /></button>
                <button onClick={() => deleteMutation.mutate(q.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Pregunta' : 'Nueva Pregunta'}
        size="2xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending}>
              <Save size={15} /> {editing ? 'Actualizar' : 'Guardar'} Pregunta
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Type selector */}
          <div>
            <label className="label">Tipo de pregunta</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(typeLabels) as [QuestionType, string][]).map(([type, label]) => (
                <button key={type} type="button" onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    questionType === type ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Enunciado de la pregunta *</label>
            <textarea {...register('question_text', { required: 'Requerido' })} className="input" rows={3} placeholder="Escribe la pregunta aquí..." />
            {errors.question_text && <p className="text-red-500 text-xs mt-1">{errors.question_text.message}</p>}
          </div>

          {(questionType === 'image_question') && (
            <div>
              <label className="label flex items-center gap-1.5"><Image size={14} /> URL de imagen</label>
              <input {...register('image_url')} className="input" placeholder="https://..." />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Puntos</label>
              <input type="number" min={0.5} step={0.5} {...register('points')} className="input" />
            </div>
            <div>
              <label className="label">Tiempo máximo (segundos)</label>
              <input type="number" min={10} {...register('time_limit_seconds')} className="input" placeholder="Sin límite" />
            </div>
          </div>

          {needsOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Opciones de respuesta</label>
                {questionType !== 'true_false' && (
                  <button type="button" onClick={() => append({ option_text: '', is_correct: false })}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <PlusCircle size={14} /> Agregar opción
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {questionType === 'multiple_select'
                  ? 'Marca todas las opciones correctas'
                  : 'Marca solo la opción correcta'}
              </p>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type={questionType === 'multiple_select' ? 'checkbox' : 'radio'}
                      name="correct-option"
                      checked={optionValues?.[i]?.is_correct || false}
                      onChange={(e) => {
                        if (questionType !== 'multiple_select') {
                          fields.forEach((_, j) => setValue(`options.${j}.is_correct`, false));
                        }
                        setValue(`options.${i}.is_correct`, e.target.checked, { shouldValidate: true });
                      }}
                      className="w-4 h-4 accent-brand-600 flex-shrink-0 cursor-pointer"
                    />
                    <input
                      {...register(`options.${i}.option_text`, { required: true })}
                      className="input flex-1 text-sm"
                      placeholder={`Opción ${i + 1}`}
                      disabled={questionType === 'true_false'}
                    />
                    {questionType !== 'true_false' && fields.length > 2 && (
                      <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                        <MinusCircle size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Retroalimentación (opcional)</label>
            <textarea {...register('feedback')} className="input" rows={2} placeholder="Explicación de la respuesta correcta..." />
          </div>
        </div>
      </Modal>
    </div>
  );
};

