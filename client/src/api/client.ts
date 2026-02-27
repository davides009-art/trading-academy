import axios from 'axios';

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    } catch { /* ignore */ }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number; email: string; username: string;
  streak_count: number; last_active_date: string;
}
export interface Level {
  id: number; order_num: number; title: string;
  description: string; icon: string;
  total_lessons: number; completed_lessons: number;
}
export interface LessonSummary {
  id: number; order_num: number; title: string;
  estimated_minutes: number; status: string; mastery_score: number;
}
export interface Lesson {
  id: number; level_id: number; order_num: number; title: string;
  content: string; visual_type: string | null; visual_config: Record<string, unknown> | null;
  common_mistakes: string[]; key_takeaways: string[];
  estimated_minutes: number; level_title: string; level_order: number;
  progress_status: string; mastery_score: number;
}
export interface Question {
  id: number; type: 'multiple_choice' | 'true_false' | 'visual';
  question_text: string; options: string[] | null;
  visual_config: Record<string, unknown> | null; order_num: number;
}
export interface QuizAnswer { questionId: number; answer: string; }
export interface Drill {
  id: number; title: string; description: string; level_required: number;
  difficulty: 'easy' | 'medium' | 'hard'; tags: string[];
  chart_config: Record<string, unknown>; answer_set: Record<string, unknown>;
  hint1_text: string | null; hint2_text: string | null; explanation: string[] | null;
  attempt_count?: number; last_score?: number;
}
export interface JournalEntry {
  id: number; trade_date: string; symbol: string; direction: string;
  entry_reason: string; stop_loss: number | null; take_profit: number | null;
  entry_price: number | null; exit_price: number | null;
  planned_rr: number | null; actual_rr: number | null;
  result: string | null; notes: string | null; mistake_tags: string[];
  created_at: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', data),
  me: () => api.get<{ user: User }>('/auth/me'),
};

// ── Levels ────────────────────────────────────────────────────────────────────
export const levelsApi = {
  getAll: () => api.get<{ levels: Level[] }>('/levels'),
  getLessons: (id: number) =>
    api.get<{ level: Level; lessons: LessonSummary[] }>(`/levels/${id}/lessons`),
};

// ── Lessons ───────────────────────────────────────────────────────────────────
export const lessonsApi = {
  get: (id: number) =>
    api.get<{ lesson: Lesson; prevLesson: LessonSummary | null; nextLesson: LessonSummary | null; lastAttempt: { score: number; passed: boolean } | null }>(`/lessons/${id}`),
  getQuestions: (id: number) =>
    api.get<{ questions: Question[]; total: number }>(`/lessons/${id}/questions`),
};

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizApi = {
  submit: (data: { lessonId: number; answers: QuizAnswer[] }) =>
    api.post<{
      score: number; passed: boolean; correctCount: number; total: number;
      masteryScore: number;
      answerResults: Array<{ questionId: number; userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation: string }>;
    }>('/quiz/submit', data),
  history: (lessonId: number) =>
    api.get<{ attempts: Array<{ id: number; score: number; passed: boolean; created_at: string }> }>(`/quiz/history/${lessonId}`),
};

// ── Practice ──────────────────────────────────────────────────────────────────
export const practiceApi = {
  getDaily: () =>
    api.get<{ questions: Array<Question & { queue_id?: number; lesson_id: number; lesson_title: string }>; totalDue: number; date: string }>('/practice/daily'),
  submit: (data: { answers: Array<{ questionId: number; queueId?: number; answer: string }> }) =>
    api.post<{ score: number; correctCount: number; total: number; results: Array<{ questionId: number; isCorrect: boolean; correctAnswer: string; explanation: string }> }>('/practice/daily/submit', data),
};

// ── Drills ────────────────────────────────────────────────────────────────────
export const drillsApi = {
  getAll: () => api.get<{ drills: Drill[] }>('/drills'),
  get: (id: number) =>
    api.get<{ drill: Drill; lastAttempt: { score: number; feedback: unknown[]; user_input: unknown } | null }>(`/drills/${id}`),
  submit: (id: number, user_input: unknown, hints_used = 0, revealed = false) =>
    api.post<{
      score: number; correctElements: number; totalElements: number;
      feedback: Array<{ element: string; correct: boolean; explanation: string }>;
      answerSet: Record<string, unknown>;
      assisted: boolean;
    }>(`/drills/${id}/submit`, { user_input, hints_used, revealed }),
};

// ── Journal ───────────────────────────────────────────────────────────────────
export const journalApi = {
  getAll: (page = 1) => api.get<{ entries: JournalEntry[]; total: number }>(`/journal?page=${page}`),
  getStats: () =>
    api.get<{
      stats: { total_trades: string; wins: string; losses: string; win_rate: string; avg_planned_rr: string; avg_actual_rr: string };
      topMistakeTags: Array<{ tag: string; count: string }>;
      recentTrades: JournalEntry[];
    }>('/journal/stats'),
  get: (id: number) => api.get<{ entry: JournalEntry }>(`/journal/${id}`),
  create: (data: Partial<JournalEntry>) => api.post<{ entry: JournalEntry }>('/journal', data),
  update: (id: number, data: Partial<JournalEntry>) => api.put<{ entry: JournalEntry }>(`/journal/${id}`, data),
  delete: (id: number) => api.delete(`/journal/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () =>
    api.get<{
      user: { username: string; streak_count: number; last_active_date: string };
      levelProgress: Array<{ id: number; order_num: number; title: string; icon: string; total_lessons: number; completed_lessons: number; avg_mastery: number }>;
      lessonStats: { total: string; completed: string; in_progress: string };
      reviewDueCount: number;
      topMastery: Array<{ title: string; score: number; level_title: string }>;
      weakestTopics: Array<{ id: number; title: string; score: number; level_title: string }>;
      recentActivity: Array<{ score: number; passed: boolean; lesson_title: string; created_at: string }>;
      journalStats: { total_trades: string; win_rate: string };
    }>('/dashboard'),
};

export default api;
