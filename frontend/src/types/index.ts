export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'supervisor' | 'user';
  area?: string;
  is_active: boolean;
  created_at: string;
  cobertura?: string;
  gerente?: string;
  profile_completed?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_immediately: boolean;
  is_active: boolean;
  created_by: string;
  created_by_name?: string;
  question_count?: number;
  total_attempts?: number;
  passed_count?: number;
  avg_score?: number;
  attempts_used?: number;
  last_status?: string;
  best_score?: number;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'open_text' | 'image_question';

export interface AnswerOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  image_url?: string;
  points: number;
  time_limit_seconds?: number;
  feedback?: string;
  order_index: number;
  options?: AnswerOption[];
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  score?: number;
  passed?: boolean;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'flagged' | 'auto_submitted';
  current_question_index: number;
  tab_switch_count: number;
  copy_paste_count: number;
  fullscreen_exit_count: number;
  screenshot_attempts: number;
  is_suspicious: boolean;
  exam_title?: string;
  user_name?: string;
  email?: string;
}

export interface UserAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[];
  open_text_answer?: string;
  time_spent_seconds: number;
  is_correct?: boolean;
  points_earned: number;
  time_expired: boolean;
  question_text?: string;
  question_type?: QuestionType;
  max_points?: number;
  feedback?: string;
  options?: AnswerOption[];
}

export interface AuditLog {
  id: string;
  attempt_id?: string;
  user_id: string;
  exam_id?: string;
  event_type: string;
  event_data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  occurred_at: string;
  user_name?: string;
  email?: string;
  exam_title?: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  socket_id?: string;
  current_exam_id?: string;
  current_attempt_id?: string;
  current_question_index: number;
  progress_percent: number;
  time_remaining_seconds?: number;
  status: 'connected' | 'idle' | 'starting_exam' | 'in_exam' | 'finished' | 'disconnected';
  last_seen: string;
  name?: string;
  email?: string;
  area?: string;
  avatar_url?: string;
  exam_title?: string;
  tab_switch_count?: number;
  copy_paste_count?: number;
  fullscreen_exit_count?: number;
  is_suspicious?: boolean;
}

export interface DashboardStats {
  exams: { active: number; scheduled: number; finished: number; total: number };
  users: { total: number; active: number };
  attempts: { in_progress: number; submitted: number; total: number };
  active_users: number;
  avg_score: number;
  approval_rate: number;
  fail_rate: number;
}
