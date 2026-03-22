import { create } from 'zustand';
import { supabase } from './supabaseClient';
import { DailyEvaluation, SubjectEvaluation, EvaluationRating } from '../types';

// --- Constants ---
const COMMENT_SUGGESTIONS_KEY = 'evaluation_comment_suggestions';
const MAX_SUGGESTIONS = 100;

// --- Danh mục TT27 ---
export const SUBJECT_LIST = [
  { key: 'toan', label: 'Toán' },
  { key: 'tieng_viet', label: 'Tiếng Việt' },
  { key: 'khoa_hoc', label: 'Khoa học' },
  { key: 'lich_su_dia_li', label: 'Lịch sử và Địa lí' },
  { key: 'cong_nghe', label: 'Công nghệ' },
  { key: 'dao_duc', label: 'Đạo đức' },
  { key: 'hdtn', label: 'Hoạt động trải nghiệm' },
];

export const COMPETENCY_LIST = [
  { key: 'tu_chu_tu_hoc', label: 'Tự chủ và tự học' },
  { key: 'giao_tiep_hop_tac', label: 'Giao tiếp và hợp tác' },
  { key: 'gqvd_sang_tao', label: 'Giải quyết vấn đề và sáng tạo' },
];

export const QUALITY_LIST = [
  { key: 'yeu_nuoc', label: 'Yêu nước' },
  { key: 'nhan_ai', label: 'Nhân ái' },
  { key: 'cham_chi', label: 'Chăm chỉ' },
  { key: 'trung_thuc', label: 'Trung thực' },
  { key: 'trach_nhiem', label: 'Trách nhiệm' },
];

export const SUBJECT_RATING_OPTIONS: { value: EvaluationRating; label: string; color: string }[] = [
  { value: 'None', label: 'Không đánh giá', color: '#94a3b8' },
  { value: 'T', label: 'Hoàn thành tốt', color: '#22c55e' },
  { value: 'H', label: 'Hoàn thành', color: '#3b82f6' },
  { value: 'C', label: 'Chưa hoàn thành', color: '#ef4444' },
];

export const COMPETENCY_RATING_OPTIONS: { value: EvaluationRating; label: string; color: string }[] = [
  { value: 'None', label: 'Không đánh giá', color: '#94a3b8' },
  { value: 'T', label: 'Tốt', color: '#22c55e' },
  { value: 'Đ', label: 'Đạt', color: '#f59e0b' },
  { value: 'C', label: 'Chưa đạt', color: '#ef4444' },
];

// --- Helper: tạo đánh giá rỗng ---
export function createEmptyEvaluation(): {
  subjects: Record<string, SubjectEvaluation>;
  competencies: Record<string, SubjectEvaluation>;
  qualities: Record<string, SubjectEvaluation>;
} {
  const subjects: Record<string, SubjectEvaluation> = {};
  SUBJECT_LIST.forEach(s => { subjects[s.key] = { rating: 'None', comment: '' }; });

  const competencies: Record<string, SubjectEvaluation> = {};
  COMPETENCY_LIST.forEach(c => { competencies[c.key] = { rating: 'None', comment: '' }; });

  const qualities: Record<string, SubjectEvaluation> = {};
  QUALITY_LIST.forEach(q => { qualities[q.key] = { rating: 'None', comment: '' }; });

  return { subjects, competencies, qualities };
}

// --- Store Interface ---
interface EvaluationState {
  evaluations: DailyEvaluation[];
  isLoading: boolean;
  commentSuggestions: string[];

  // Actions
  fetchEvaluations: (classId: string, date: string) => Promise<void>;
  fetchEvaluationsByRange: (classId: string, fromDate: string, toDate: string) => Promise<void>;
  saveEvaluation: (evaluation: Omit<DailyEvaluation, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  saveBatchEvaluation: (
    studentIds: string[],
    data: {
      teacher_id: string;
      class_id: string;
      evaluation_date: string;
      subjects: Record<string, SubjectEvaluation>;
      competencies: Record<string, SubjectEvaluation>;
      qualities: Record<string, SubjectEvaluation>;
      general_comment: string;
    }
  ) => Promise<boolean>;
  deleteEvaluation: (id: string) => Promise<boolean>;
  fetchStudentEvaluations: (studentId: string, fromDate?: string, toDate?: string) => Promise<DailyEvaluation[]>;
  loadCommentSuggestions: () => void;
  saveCommentToHistory: (comment: string) => void;
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  evaluations: [],
  isLoading: false,
  commentSuggestions: [],

  // --- Fetch evaluations cho 1 lớp, 1 ngày ---
  fetchEvaluations: async (classId, date) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('daily_evaluations')
        .select('*')
        .eq('class_id', classId)
        .eq('evaluation_date', date);

      if (!error && data) {
        set({ evaluations: data as DailyEvaluation[] });
      } else {
        console.error('Error fetching evaluations:', error);
        set({ evaluations: [] });
      }
    } catch (e) {
      console.error('Error fetching evaluations:', e);
      set({ evaluations: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Fetch evaluations theo khoảng thời gian ---
  fetchEvaluationsByRange: async (classId, fromDate, toDate) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('daily_evaluations')
        .select('*')
        .eq('class_id', classId)
        .gte('evaluation_date', fromDate)
        .lte('evaluation_date', toDate)
        .order('evaluation_date', { ascending: false });

      if (!error && data) {
        set({ evaluations: data as DailyEvaluation[] });
      } else {
        console.error('Error fetching evaluations by range:', error);
        set({ evaluations: [] });
      }
    } catch (e) {
      console.error('Error fetching evaluations by range:', e);
      set({ evaluations: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Lưu 1 đánh giá (upsert) ---
  saveEvaluation: async (evaluation) => {
    try {
      const id = `eval_${evaluation.student_id}_${evaluation.evaluation_date}`;
      const now = new Date().toISOString();

      const payload = {
        id,
        ...evaluation,
        updated_at: now,
      };

      const { error } = await supabase
        .from('daily_evaluations')
        .upsert(payload, { onConflict: 'student_id,teacher_id,evaluation_date' });

      if (error) {
        console.error('Error saving evaluation:', error);
        return false;
      }

      // Cập nhật local state
      set(s => {
        const existing = s.evaluations.findIndex(e => e.student_id === evaluation.student_id && e.evaluation_date === evaluation.evaluation_date);
        if (existing >= 0) {
          const updated = [...s.evaluations];
          updated[existing] = { ...payload, created_at: updated[existing].created_at || now } as DailyEvaluation;
          return { evaluations: updated };
        }
        return { evaluations: [...s.evaluations, { ...payload, created_at: now } as DailyEvaluation] };
      });

      // Lưu comment vào suggestions
      if (evaluation.general_comment?.trim()) {
        get().saveCommentToHistory(evaluation.general_comment.trim());
      }

      return true;
    } catch (e) {
      console.error('Error saving evaluation:', e);
      return false;
    }
  },

  // --- Nhận xét hàng loạt ---
  saveBatchEvaluation: async (studentIds, data) => {
    try {
      const now = new Date().toISOString();
      const payloads = studentIds.map(studentId => ({
        id: `eval_${studentId}_${data.evaluation_date}`,
        student_id: studentId,
        teacher_id: data.teacher_id,
        class_id: data.class_id,
        evaluation_date: data.evaluation_date,
        subjects: data.subjects,
        competencies: data.competencies,
        qualities: data.qualities,
        general_comment: data.general_comment,
        updated_at: now,
      }));

      const { error } = await supabase
        .from('daily_evaluations')
        .upsert(payloads, { onConflict: 'student_id,teacher_id,evaluation_date' });

      if (error) {
        console.error('Error batch saving evaluations:', error);
        return false;
      }

      // Cập nhật local state
      set(s => {
        const newEvals = [...s.evaluations];
        payloads.forEach(payload => {
          const idx = newEvals.findIndex(e => e.student_id === payload.student_id && e.evaluation_date === payload.evaluation_date);
          const fullPayload = { ...payload, created_at: (idx >= 0 ? newEvals[idx].created_at : now) } as DailyEvaluation;
          if (idx >= 0) {
            newEvals[idx] = fullPayload;
          } else {
            newEvals.push(fullPayload);
          }
        });
        return { evaluations: newEvals };
      });

      if (data.general_comment?.trim()) {
        get().saveCommentToHistory(data.general_comment.trim());
      }

      return true;
    } catch (e) {
      console.error('Error batch saving evaluations:', e);
      return false;
    }
  },

  // --- Xoá đánh giá ---
  deleteEvaluation: async (id) => {
    const { error } = await supabase.from('daily_evaluations').delete().eq('id', id);
    if (!error) {
      set(s => ({ evaluations: s.evaluations.filter(e => e.id !== id) }));
      return true;
    }
    console.error('Error deleting evaluation:', error);
    return false;
  },

  // --- Xem lịch sử 1 HS ---
  fetchStudentEvaluations: async (studentId, fromDate, toDate) => {
    let query = supabase
      .from('daily_evaluations')
      .select('*')
      .eq('student_id', studentId)
      .order('evaluation_date', { ascending: false });

    if (fromDate) query = query.gte('evaluation_date', fromDate);
    if (toDate) query = query.lte('evaluation_date', toDate);

    const { data } = await query;
    return (data || []) as DailyEvaluation[];
  },

  // --- Gợi ý nhận xét nhanh (localStorage) ---
  loadCommentSuggestions: () => {
    try {
      const stored = localStorage.getItem(COMMENT_SUGGESTIONS_KEY);
      if (stored) {
        set({ commentSuggestions: JSON.parse(stored) });
      }
    } catch {
      set({ commentSuggestions: [] });
    }
  },

  saveCommentToHistory: (comment) => {
    if (!comment.trim()) return;
    const trimmed = comment.trim();
    set(s => {
      const existing = s.commentSuggestions.filter(c => c !== trimmed);
      const updated = [trimmed, ...existing].slice(0, MAX_SUGGESTIONS);
      localStorage.setItem(COMMENT_SUGGESTIONS_KEY, JSON.stringify(updated));
      return { commentSuggestions: updated };
    });
  },
}));
