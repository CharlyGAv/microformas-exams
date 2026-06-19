import { useState, useEffect } from 'react';
import { Image, CheckSquare, ToggleLeft, List, Type } from 'lucide-react';
import { clsx } from 'clsx';
import { Question, AnswerOption } from '../../types';
import { Timer } from './Timer';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onAnswer: (questionId: string, selectedIds: string[], openText?: string, timeExpired?: boolean) => void;
  savedAnswer?: { selectedIds: string[]; openText?: string; timeExpired?: boolean };
}

const typeIcons = {
  multiple_choice: List,
  true_false: ToggleLeft,
  multiple_select: CheckSquare,
  open_text: Type,
  image_question: Image,
};

const typeLabels = {
  multiple_choice: 'Opción múltiple',
  true_false: 'Verdadero / Falso',
  multiple_select: 'Selección múltiple',
  open_text: 'Respuesta abierta',
  image_question: 'Pregunta con imagen',
};

export const QuestionCard = ({ question, index, total, onAnswer, savedAnswer }: QuestionCardProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(savedAnswer?.selectedIds || []);
  const [openText, setOpenText] = useState(savedAnswer?.openText || '');
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    setSelectedIds(savedAnswer?.selectedIds || []);
    setOpenText(savedAnswer?.openText || '');
    setTimeExpired(savedAnswer?.timeExpired ?? false);
  }, [question.id, savedAnswer?.selectedIds, savedAnswer?.openText, savedAnswer?.timeExpired]);

  const TypeIcon = typeIcons[question.question_type];

  const handleOptionClick = (optionId: string) => {
    if (timeExpired) return;
    if (question.question_type === 'multiple_select') {
      const updated = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId];
      setSelectedIds(updated);
      onAnswer(question.id, updated, undefined, false);
    } else {
      setSelectedIds([optionId]);
      onAnswer(question.id, [optionId], undefined, false);
    }
  };

  const handleTextChange = (text: string) => {
    setOpenText(text);
    onAnswer(question.id, [], text, false);
  };

  const handleTimeUp = () => {
    setTimeExpired(true);
    onAnswer(question.id, selectedIds, openText, true);
  };

  return (
    <div className="animate-fade-in">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              <TypeIcon size={13} />
              {typeLabels[question.question_type]}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {question.points} {question.points === 1 ? 'punto' : 'puntos'}
            </span>
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400 ml-auto">
              Pregunta {index + 1} de {total}
            </span>
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
            {question.question_text}
          </p>
        </div>
        {question.time_limit_seconds && !timeExpired && (
          <div className="flex-shrink-0">
            <Timer
              key={question.id}
              totalSeconds={question.time_limit_seconds}
              onTimeUp={handleTimeUp}
              label="Tiempo pregunta"
              size="sm"
              warning={30}
            />
          </div>
        )}
      </div>

      {/* Time expired overlay */}
      {timeExpired && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium text-center">
          ⏱ Tiempo agotado para esta pregunta
        </div>
      )}

      {/* Question image */}
      {question.image_url && (
        <div className="mb-5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={question.image_url} alt="Imagen de pregunta" className="w-full object-contain max-h-64" />
        </div>
      )}

      {/* Answer area */}
      {question.question_type === 'open_text' ? (
        <textarea
          value={openText}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={timeExpired}
          placeholder="Escribe tu respuesta aquí..."
          className="input min-h-[120px] resize-none"
          rows={5}
        />
      ) : (
        <div className="space-y-3">
          {question.options?.map((option: AnswerOption) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={timeExpired}
                className={clsx(
                  'w-full text-left px-4 py-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  timeExpired && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  question.question_type === 'multiple_select' ? 'rounded-md' : 'rounded-full',
                  isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-600'
                )}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className={clsx('text-sm', isSelected ? 'text-brand-700 dark:text-brand-300 font-medium' : 'text-gray-700 dark:text-gray-300')}>
                  {option.option_text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.question_type === 'multiple_select' && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
          Puedes seleccionar más de una respuesta
        </p>
      )}
    </div>
  );
};
