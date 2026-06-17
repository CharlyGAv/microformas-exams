import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const examApi = {
  list: () => api.get('/exams'),
  get: (id: string) => api.get(`/exams/${id}`),
  create: (data: Record<string, unknown>) => api.post('/exams', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  getQuestions: (examId: string) => api.get(`/exams/${examId}/questions`),
  createQuestion: (examId: string, data: Record<string, unknown>) => api.post(`/exams/${examId}/questions`, data),
  updateQuestion: (examId: string, questionId: string, data: Record<string, unknown>) =>
    api.put(`/exams/${examId}/questions/${questionId}`, data),
  deleteQuestion: (examId: string, questionId: string) =>
    api.delete(`/exams/${examId}/questions/${questionId}`),
};

export const attemptApi = {
  start: (examId: string) => api.post(`/exams/${examId}/start`),
  saveAnswer: (attemptId: string, data: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/answer`, data),
  submit: (attemptId: string) => api.post(`/attempts/${attemptId}/submit`),
  get: (attemptId: string) => api.get(`/attempts/${attemptId}`),
  myAttempts: () => api.get('/attempts/my'),
  logAudit: (attemptId: string, data: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/audit`, data),
  userAttempts: (userId: string) => api.get(`/users/${userId}/attempts`),
  delete: (attemptId: string) => api.delete(`/attempts/${attemptId}`),
};

export const userApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  completeProfile: (data: { cobertura: string; gerente: string }) => api.post('/users/complete-profile', data),
};

interface DashboardFilters { examId?: string; cobertura?: string; gerente?: string; }

const f = ({ examId, cobertura, gerente }: DashboardFilters) => ({
  exam_id: examId || undefined,
  cobertura: cobertura || undefined,
  gerente: gerente || undefined,
});

export const dashboardApi = {
  examsList: () => api.get('/dashboard/exams-list'),
  stats: (filters: DashboardFilters = {}) => api.get('/dashboard/stats', { params: f(filters) }),
  byExam: (filters: DashboardFilters = {}) => api.get('/dashboard/results-by-exam', { params: f(filters) }),
  byArea: (filters: DashboardFilters = {}) => api.get('/dashboard/results-by-area', { params: f(filters) }),
  byMonth: (filters: DashboardFilters = {}) => api.get('/dashboard/results-by-month', { params: f(filters) }),
  topScores: (filters: DashboardFilters = {}) => api.get('/dashboard/top-scores', { params: f(filters) }),
  avgTimePerQuestion: (filters: DashboardFilters = {}) => api.get('/dashboard/avg-time-per-question', { params: f(filters) }),
  byCobertura: (filters: DashboardFilters = {}) => api.get('/dashboard/results-by-cobertura', { params: f(filters) }),
  byGerente: (filters: DashboardFilters = {}) => api.get('/dashboard/results-by-gerente', { params: f(filters) }),
  liveMonitor: () => api.get('/dashboard/live-monitor'),
};

export const reportApi = {
  get: (type: string, id?: string, format?: string, filters?: { exam_id?: string; cobertura?: string; gerente?: string }) =>
    api.get(`/reports/${type}`, { params: { id, format, ...filters }, responseType: format === 'csv' || format === 'xlsx' ? 'blob' : 'json' }),
  auditUsers: () => api.get('/reports/audit/users'),
  auditLogs: (params: Record<string, string>) => api.get('/reports/audit/logs', { params }),
};

export default api;
