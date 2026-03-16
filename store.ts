import { create } from 'zustand';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound, Notification, WebResource, ChatMessage, CustomToolMenu, Poll, BreakoutRoom, ArenaMatchFilters, QuestionBankItem } from './types';
import { supabase } from './services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// Fallback Mock Data in case Supabase is empty (for seeding first time)
const SEED_USERS: User[] = [
  {
    id: 'admin1',
    name: 'Quản Trị Viên',
    email: 'admin@school.edu',
    role: 'ADMIN',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
    password: '123456'
  }
];

export const useStore = create<AppState>((set, get) => ({
  isDataLoading: false,
  users: [],
  exams: [],
  assignments: [],
  academicYears: [],
  classes: [],
  attempts: [],
  totalAttemptsCount: 0,
  customTopics: [],
  notifications: [],
  resources: [],
  discussionSessions: [],
  questionBank: [],

  // --- INITIAL DATA FETCHING ---
  fetchInitialData: async () => {
    set({ isDataLoading: true });
    try {
      // 0. Fetch Question Bank
      try {
        const { data: qBanks } = await supabase.from('question_bank').select('*');
        if (qBanks) {
          const mapped = qBanks.map((q: any) => ({
            ...q,
            correctOptionIndex: q.correct_option_index,
            imageUrl: q.image_url,
            isArenaEligible: q.is_arena_eligible,
            teacherId: q.teacher_id
          }));
          set({ questionBank: mapped as QuestionBankItem[] });
        }
      } catch (err) {
        console.error("Error fetching question_bank:", err);
      }

      // 1. Fetch Users (Profiles)
      const { data: users, error: userErr } = await supabase.from('profiles').select('*');
      if (users && users.length > 0) {
        set({ users: users as User[] });
      } else if (!userErr) {
        await supabase.from('profiles').insert(SEED_USERS);
        set({ users: SEED_USERS });
      }

      // 2. Fetch Exams
      const { data: exams, error: examErr } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (examErr) {
        // Fallback for older schemas
        const { data: fallbackExams } = await supabase.from('exams').select('*').order('createdAt', { ascending: false });
        if (fallbackExams) set({ exams: fallbackExams });
      } else if (exams) {
        const mappedExams = exams.map((e: any) => ({
          ...e,
          id: String(e.id),
          teacherId: String(e.teacherId || e.teacher_id || e.teacherid),
          createdAt: e.createdAt || e.created_at || e.createdat,
          updatedAt: e.updatedAt || e.updated_at || e.updatedat,
          questionCount: e.questionCount || e.question_count || e.questioncount,
          category: e.category || (String(e.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
          classId: String(e.classId || e.class_id || e.classid || '')
        }));
        set({ exams: mappedExams as Exam[] });
      }

      // 3. Fetch Classes
      const { data: rawClasses } = await supabase.from('classes').select('*');
      if (rawClasses) {
        const classes = rawClasses.map(c => {
          let ids = c.studentIds || c.student_ids || c.studentids || [];
          if (typeof ids === 'string') {
            try { ids = JSON.parse(ids); } catch (e) { ids = []; }
          }
          if (!Array.isArray(ids)) ids = [];

          return {
            id: String(c.id),
            name: c.name,
            academicYearId: String(c.academicYearId || c.academic_year_id || c.academicyearid),
            teacherId: String(c.teacherId || c.teacher_id || c.teacherid),
            studentIds: ids.map((sid: any) => String(sid))
          };
        });
        set({ classes: classes as Class[] });
      }

      // 4. Fetch Assignments
      let { data: assignments, error: assignErr } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
      if (assignErr) {
        const { data: fallbackAssignments } = await supabase.from('assignments').select('*').order('createdAt', { ascending: false });
        assignments = fallbackAssignments;
      }
      if (assignments) {
        const mappedAssignments = assignments.map((a: any) => ({
          ...a,
          id: String(a.id),
          examId: String(a.examId || a.exam_id || a.examid),
          classId: String(a.classId || a.class_id || a.classid),
          teacherId: String(a.teacherId || a.teacher_id || a.teacherid),
          durationMinutes: Number(a.durationMinutes || a.duration_minutes || a.durationminutes || 0),
          studentIds: Array.isArray(a.studentIds || a.student_ids || a.studentids) 
            ? (a.studentIds || a.student_ids || a.studentids).map((sid: any) => String(sid)) 
            : [],
          createdAt: a.createdAt || a.created_at || a.createdat,
          startTime: a.startTime || a.start_time || a.starttime,
          endTime: a.endTime || a.end_time || a.endtime,
          status: a.status || 'active'
        }));
        set({ assignments: mappedAssignments as Assignment[] });
      }

      // 5. Fetch Attempts
      await get().fetchAttempts();

      // --- SETUP REALTIME SUBSCRIPTIONS ---
      supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'attempts' },
          (payload) => {
            console.log('REALTIME: New attempt received:', payload.new);
            const a = payload.new;
            const mappedAttempt: Attempt = {
              id: String(a.id),
              answers: (a.answers as Record<string, any>) || {},
              examId: String(a.exam_id || a.examId || a.examid),
              assignmentId: String(a.assignment_id || a.assignmentId || a.assignmentid || ''),
              studentId: String(a.student_id || a.studentId || a.studentid),
              submittedAt: String(a.submitted_at || a.submittedAt || a.submittedat || new Date().toISOString()),
              score: (a.score !== undefined && a.score !== null) ? Number(a.score) : Number(a.score_achieved || 0),
              teacherFeedback: a.teacher_feedback || a.teacherFeedback || a.teacherfeedback,
              feedbackAllowViewSolution: !!(a.feedback_allow_view_solution ?? a.feedbackAllowViewSolution ?? a.feedbackallowviewsolution ?? true),
              totalTimeSpentSec: Number(a.total_time_spent_sec ?? a.totalTimeSpentSec ?? a.totaltimespentsec ?? 0),
              timeSpentPerQuestion: (a.time_spent_per_question || a.timeSpentPerQuestion || a.timespentperquestion || {}) as Record<string, number>,
              cheatWarnings: Number(a.cheat_warnings ?? a.cheatWarnings ?? a.cheatwarnings ?? 0)
            };
            
            set((state) => {
               // Tránh trùng lặp nếu bài nộp đã được addAttempt (local) add vào rồi
               if (state.attempts.some(att => String(att.id) === mappedAttempt.id)) return state;
               return { attempts: [...state.attempts, mappedAttempt] };
            });
          }
        )
        .subscribe();

      // 6. Fetch Years
      const { data: years } = await supabase.from('academic_years').select('*');
      if (years) set({ academicYears: years as AcademicYear[] });

      // 7. Notifications & Realtime Subscription
      const { data: notifs, error: notifErr } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (notifErr) console.error("Error fetching notifications:", notifErr);
      
      const mapNotif = (n: any): Notification => ({
        id: String(n.id),
        userId: String(n.userId || n.user_id || n.userid),
        type: n.type || 'INFO',
        title: n.title,
        message: n.message,
        isRead: !!(n.isRead ?? n.is_read ?? n.isread ?? false),
        createdAt: n.createdAt || n.created_at || n.createdat,
        link: n.link
      });

      if (notifs) {
        const mappedNotifs = notifs.map(mapNotif);
        set({ notifications: mappedNotifs });
      }

      // Realtime subscription for notifications
      supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const newNotif = mapNotif(payload.new);
            console.log('REALTIME: New notification received:', newNotif);
            
            set((state) => {
              // Only add if it belongs to current user and not already in state
              if (state.user && newNotif.userId === state.user.id) {
                if (state.notifications.some(n => n.id === newNotif.id)) return state;
                return { notifications: [newNotif, ...state.notifications] };
              }
              return state;
            });
          }
        )
        .subscribe();

      // 8. Resources
      const { data: rawResources } = await supabase.from('resources').select('*');
      if (rawResources) {
        const resources = rawResources.map(r => ({
          ...r,
          createdAt: r.createdAt || r.created_at || r.createdat,
          addedBy: r.addedBy || r.added_by || r.addedby
        }));
        set({ resources: resources as WebResource[] });
      }

      // 9. Fetch Discussions (New)
      const { data: sessions } = await supabase.from('discussion_sessions').select(`
            *,
            rounds:discussion_rounds(*),
            participants:discussion_participants(*),
            polls:discussion_polls(*),
            breakoutRooms:discussion_breakout_rooms(*)
        `);

      if (sessions) {
        // Need to fetch messages separately or just fetch latest? For now fetch all messages for simplicity or lazy load
        const { data: messages } = await supabase.from('discussion_messages').select('*');

        const formattedSessions: DiscussionSession[] = sessions.map((s: any) => ({
          id: s.id,
          teacherId: s.teacher_id, // Map snake_case to camelCase
          title: s.title,
          status: s.status,
          visibility: s.visibility,
          activeRoundId: s.active_round_id,
          createdAt: s.created_at,
          rounds: s.rounds || [],
          participants: s.participants.map((p: any) => ({
            studentId: p.student_id,
            name: p.name,
            isHandRaised: p.is_hand_raised,
            currentRoomId: p.current_room_id
          })),
          polls: s.polls?.map((p: any) => ({
            ...p,
            isActive: p.is_active,
            isAnonymous: p.is_anonymous
            // Note: 'options' JSONB should map automatically
          })) || [],
          messages: messages?.filter((m: any) => m.session_id === s.id).map((m: any) => ({
            id: m.id,
            sessionId: m.session_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            content: m.content,
            type: m.type,
            roomId: m.room_id,
            roundId: m.round_id,
            timestamp: m.created_at
          })) || [],
          breakoutRooms: s.breakoutRooms || [] // If using table
        }));
        set({ discussionSessions: formattedSessions });
      }

    } catch (e) {
      console.error("Error fetching initial data (Global):", e);
      // Don't reset users unless it's absolutely necessary (e.g., users is empty)
      if (get().users.length === 0) set({ users: SEED_USERS });
    } finally {
      set({ isDataLoading: false });
    }
  },

  // Session
  user: (() => {
    try {
      const stored = localStorage.getItem('user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_session');
    }
    set({ user });
  },

  // Users
  addUser: async (user: User, assignedClassId?: string) => {
    // 1. Dùng Transaction giả lập bằng cách Insert User rồi Update Class
    // Cố gắng chèn với camelCase trước, nếu lỗi thì thử lại với snake_case cho class_name thay vì className
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      password: user.password,
      class_name: user.className,
      gender: user.gender,
      saved_prompts: user.savedPrompts,
      custom_tools: user.customTools
    };
    let { error } = await supabase.from('profiles').insert(payload);

    if (error) {
      console.error("Error creating user ultimate:", error);
      alert("Lỗi tạo người dùng: " + error.message);
      return;
    }

    set((state) => ({ users: [...state.users, user] }));

    // 2. Cập nhật ID học sinh vào class nếu có
    if (assignedClassId && user.role === 'STUDENT') {
      const state = get();
      const targetClass = state.classes.find(c => c.id === assignedClassId);

      if (targetClass) {
        const updatedStudentIds = [...targetClass.studentIds, user.id];
        const updatedClass = { ...targetClass, studentIds: updatedStudentIds };

        let { error: clsError } = await supabase.from('classes')
          .update({ student_ids: updatedStudentIds })
          .eq('id', assignedClassId);

        if (!clsError) {
          set(s => ({
            classes: s.classes.map(c => c.id === assignedClassId ? updatedClass : c)
          }));
        } else {
          console.error("Error updating class student list:", clsError);
        }
      }
    }
  },

  updateUser: async (updatedUser) => {
    const payload = {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      password: updatedUser.password,
      class_name: updatedUser.className,
      gender: updatedUser.gender,
      saved_prompts: updatedUser.savedPrompts,
      custom_tools: updatedUser.customTools
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', updatedUser.id);
    if (!error) {
      set((state) => ({
        users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        user: state.user && state.user.id === updatedUser.id ? updatedUser : state.user
      }));
    }
  },

  deleteUser: async (userId) => {
    // 1. Dọn dẹp id học sinh khỏi danh sách lớp nếu có
    const state = get();
    const affectedClass = state.classes.find(c => c.studentIds?.includes(userId));
    if (affectedClass) {
      const updatedStudentIds = affectedClass.studentIds.filter(id => id !== userId);
      let { error: clsError } = await supabase.from('classes')
        .update({ studentIds: updatedStudentIds })
        .eq('id', affectedClass.id);

      if (!clsError) {
        set(s => ({
          classes: s.classes.map(c => c.id === affectedClass.id ? { ...c, studentIds: updatedStudentIds } : c)
        }));
      } else {
        console.error("Failed to remove student from class before deletion", clsError);
      }
    }

    // 2. Cascade delete dependent data manually as fallback
    await Promise.all([
      supabase.from('attempts').delete().eq('studentId', userId),
      supabase.from('notifications').delete().eq('userId', userId),
      supabase.from('arena_matches').delete().eq('player1_id', userId),
      supabase.from('arena_matches').delete().eq('player2_id', userId),
      supabase.from('arena_match_events').delete().eq('player_id', userId),
    ]);

    // 3. Xóa user khỏi bảng profiles
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      console.error("Delete user error", error);
      return false;
    }

    set((state) => ({
      users: state.users.filter(u => u.id !== userId)
    }));

    return true;
  },

  changePassword: async (userId, newPass) => {
    const { error } = await supabase.from('profiles').update({ password: newPass }).eq('id', userId);
    if (error) return false;
    set(state => ({
      users: state.users.map(u => u.id === userId ? { ...u, password: newPass } : u),
      user: state.user && state.user.id === userId ? { ...state.user, password: newPass } : state.user
    }));
    return true;
  },

  saveUserPrompt: (prompt) => set(state => {
    if (!state.user) return state;
    const isTeacherInfo = state.user.id !== 'admin1' && state.user.id !== 'teacher1' && state.user.id !== 'student1';

    if (isTeacherInfo && state.user.id) {
      // Attempt supabase sync gracefully
      supabase.from('profiles').update({ // Changed from 'users' to 'profiles'
        savedPrompts: [...(state.user.savedPrompts || []), prompt] // Changed from saved_prompts to savedPrompts
      }).eq('id', state.user.id).then();
    }

    const updatedUser = {
      ...state.user,
      savedPrompts: [...(state.user.savedPrompts || []), prompt]
    };
    localStorage.setItem('user_session', JSON.stringify(updatedUser));
    return { user: updatedUser, users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u) }; // Added users update
  }),

  updateUserCustomTools: (tools: CustomToolMenu[]) => set(state => {
    if (!state.user) return state;
    const isTeacherInfo = state.user.id !== 'admin1' && state.user.id !== 'teacher1' && state.user.id !== 'student1';

    if (isTeacherInfo && state.user.id) {
      // We will store it in metadata or wait for DB sync, for now localstorage only
      supabase.from('profiles').update({ customTools: tools }).eq('id', state.user.id).then(); // Changed from 'users' to 'profiles'
    }

    const updatedUser = {
      ...state.user,
      customTools: tools
    };

    // Also update in users list if it exists
    const updatedUsers = state.users.map(u =>
      u.id === state.user!.id ? { ...u, customTools: tools } : u
    );

    localStorage.setItem('user_session', JSON.stringify(updatedUser));
    return { user: updatedUser, users: updatedUsers };
  }),

  // Academic Years
  addAcademicYear: async (year) => {
    const { error } = await supabase.from('academic_years').insert(year);
    if (!error) set((state) => ({ academicYears: [...state.academicYears, year] }));
  },
  updateAcademicYear: async (updatedYear) => {
    const { error } = await supabase.from('academic_years').update(updatedYear).eq('id', updatedYear.id);
    if (!error) set((state) => ({
      academicYears: state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : y)
    }));
  },

  // Classes
  addClass: async (cls) => {
    // Map camelCase to potential snake_case for robust insertion
    const payload = {
      id: String(cls.id),
      name: cls.name,
      academic_year_id: String(cls.academicYearId),
      teacher_id: String(cls.teacherId),
      student_ids: Array.isArray(cls.studentIds) ? cls.studentIds.map((sid: any) => String(sid)) : []
    };

    const { error } = await supabase.from('classes').insert(payload);

    if (!error) {
      set((state) => ({ classes: [...state.classes, cls] }));
    } else {
      console.error("addClass ultimate error", error);
      alert("Lỗi tạo lớp học: " + error.message);
    }
  },
  updateClass: async (updatedClass) => {
    const payload = {
      name: updatedClass.name,
      academic_year_id: updatedClass.academicYearId,
      teacher_id: updatedClass.teacherId,
      student_ids: updatedClass.studentIds
    };
    const { error } = await supabase.from('classes').update(payload).eq('id', updatedClass.id);

    if (!error) {
      set((state) => ({
        classes: state.classes.map(c => c.id === updatedClass.id ? updatedClass : c)
      }));
    } else {
      console.error("updateClass ultimate error", error);
      alert("Lỗi cập nhật lớp học: " + error.message);
    }
  },

  // Exams
  addExam: async (exam) => {
    // Optimistic: add to local state immediately so user sees it
    set((state) => ({ exams: [exam, ...state.exams] }));
    const payload = {
      id: String(exam.id),
      title: exam.title,
      subject: exam.subject,
      topic: exam.topic,
      grade: exam.grade,
      difficulty: exam.difficulty,
      duration_minutes: Number(exam.durationMinutes),
      question_count: Number(exam.questionCount),
      created_at: exam.createdAt,
      status: exam.status,
      class_id: String(exam.classId || ''),
      description: (exam as any).description,
      questions: exam.questions,
      category: exam.category || 'EXAM',
      deleted_at: exam.deletedAt
    };
    const { error } = await supabase.from('exams').insert(payload);
    if (error) {
      console.error("DEBUG: addExam Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload
      });
      alert(`⚠️ Lỗi lưu bài tập lên server: ${error.message}\nBài tập vẫn hiện tạm thời nhưng sẽ mất khi tải lại trang.`);
    }
  },
  bulkUpdateTopic: async (oldName, newName) => {
    const { error } = await supabase.from('exams').update({ topic: newName }).eq('topic', oldName);
    if (error) {
      console.error("bulkUpdateTopic error:", error);
      return false;
    }
    set(state => ({
      exams: state.exams.map(e => e.topic === oldName ? { ...e, topic: newName } : e)
    }));
    return true;
  },
  bulkDeleteTopic: async (topicName) => {
    const { error } = await supabase.from('exams').update({ topic: null }).eq('topic', topicName);
    if (error) {
      console.error("bulkDeleteTopic error:", error);
      return false;
    }
    set(state => ({
      exams: state.exams.map(e => e.topic === topicName ? { ...e, topic: undefined } : e)
    }));
    return true;
  },
  updateExam: async (updatedExam) => {
    const payload = {
      title: updatedExam.title,
      subject: updatedExam.subject,
      topic: updatedExam.topic,
      grade: updatedExam.grade,
      difficulty: updatedExam.difficulty,
      duration_minutes: Number(updatedExam.durationMinutes),
      question_count: Number(updatedExam.questionCount),
      status: updatedExam.status,
      class_id: String(updatedExam.classId || ''),
      description: (updatedExam as any).description,
      questions: updatedExam.questions,
      category: updatedExam.category || (String(updatedExam.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
      deleted_at: updatedExam.deletedAt
    };
    const { error } = await supabase.from('exams').update(payload).eq('id', updatedExam.id);
    if (!error) set((state) => ({
      exams: state.exams.map((e) => e.id === updatedExam.id ? updatedExam : e)
    }));
  },
  softDeleteExam: async (id) => {
    const deletedAt = new Date().toISOString();
    set((state) => ({
      exams: state.exams.map(e => e.id === id ? { ...e, deletedAt } : e)
    }));
    await supabase.from('exams').update({ deleted_at: deletedAt }).eq('id', id);
  },
  restoreExam: async (id) => {
    set((state) => ({
      exams: state.exams.map(e => e.id === id ? { ...e, deletedAt: undefined } : e)
    }));
    await supabase.from('exams').update({ deleted_at: null }).eq('id', id);
  },

  addCustomTopic: (topic) => {
    set((state) => ({
      customTopics: Array.from(new Set([...state.customTopics, topic]))
    }));
  },

  // Question Bank
  fetchQuestionBank: async () => {
    const { data } = await supabase.from('question_bank').select('*');
    if (data) set({ questionBank: data as QuestionBankItem[] });
  },
  syncQuestionsFromExams: async () => {
    const { exams, questionBank, user } = get();
    if (!user) {
      console.error("[Sync] No user found in store, sync aborted");
      return 0;
    }

    let newQuestions: QuestionBankItem[] = [];
    
    // Create a set of existing question contents to avoid duplicates
    const existingContents = new Set(questionBank.map(q => q.content.trim()));

    console.log("[Sync] Current User ID:", user.id);
    console.log("[Sync] Existing questions in bank:", existingContents.size);

    console.log("[Sync] Start syncing from", exams.length, "exams");
    
    exams.filter(e => e.category === 'TASK').forEach(exam => {
      let qList = exam.questions;
      if (!qList) return;
      
      // Handle potential stringified JSON
      if (typeof qList === 'string') {
        try { qList = JSON.parse(qList); } catch (e) { return; }
      }
      
      if (!Array.isArray(qList)) return;

      qList.forEach(q => {
        if (!q || !q.content) return;
        const content = String(q.content).trim();
        
        // Simple duplicate check: by content
        if (existingContents.has(content)) return;

        const newItem: QuestionBankItem = {
          ...q,
          content,
          id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subject: exam.subject || 'Chưa rõ',
          grade: exam.grade || 'Chưa rõ',
          topic: q.topic || exam.topic || '',
          level: (q.level as string === 'THONG_HIEU' ? 'KET_NOI' : q.level) as any
        };
        newQuestions.push(newItem);
        existingContents.add(content); // Prevent duplicates within the same sync
      });
    });

    console.log("[Sync] Found", newQuestions.length, "new questions to sync");

    if (newQuestions.length === 0) return 0;

    // Push to Supabase in chunks to avoid payload size limits
    const CHUNK_SIZE = 50;
    let successCount = 0;
    for (let i = 0; i < newQuestions.length; i += CHUNK_SIZE) {
      const chunk = newQuestions.slice(i, i + CHUNK_SIZE);
      const payload = chunk.map(q => ({
        content: q.content,
        type: q.type,
        options: q.options,
        correct_option_index: q.correctOptionIndex,
        solution: q.solution,
        hint: q.hint,
        image_url: q.imageUrl,
        level: q.level,
        topic: q.topic,
        subject: q.subject,
        grade: q.grade,
        is_arena_eligible: q.isArenaEligible,
        teacher_id: get().user?.id
      }));

      console.log(`[Sync] Sending chunk ${i / CHUNK_SIZE + 1}...`, payload);
      
      const { error } = await supabase.from('question_bank').insert(payload);
      if (!error) {
        successCount += chunk.length;
        console.log(`[Sync] Chunk ${i / CHUNK_SIZE + 1} success!`);
      } else {
        console.error("[Sync] Chunk error details:", {
          error,
          payloadSample: payload[0]
        });
      }
    }

    // Refresh local state
    await get().fetchQuestionBank();
    return successCount;
  },
  addQuestionToBank: async (q) => {
    const payload = {
      content: q.content,
      type: q.type,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      solution: q.solution,
      hint: q.hint,
      image_url: q.imageUrl,
      level: q.level,
      topic: q.topic,
      subject: q.subject,
      grade: q.grade,
      is_arena_eligible: q.isArenaEligible,
      teacher_id: get().user?.id
    };
    const { error } = await supabase.from('question_bank').insert(payload);
    if (error) return false;
    await get().fetchQuestionBank(); // Refresh to get proper IDs or just trust UI
    return true;
  },
  updateQuestionInBank: async (q) => {
    const payload = {
      content: q.content,
      type: q.type,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      solution: q.solution,
      hint: q.hint,
      image_url: q.imageUrl,
      level: q.level,
      topic: q.topic,
      subject: q.subject,
      grade: q.grade,
      is_arena_eligible: q.isArenaEligible
    };
    const { error } = await supabase.from('question_bank').update(payload).eq('id', q.id);
    if (error) return false;
    set((state) => ({
      questionBank: state.questionBank.map((item) => item.id === q.id ? q : item)
    }));
    return true;
  },
  deleteQuestionFromBank: async (id) => {
    const { error } = await supabase.from('question_bank').delete().eq('id', id);
    if (error) return false;
    set((state) => ({ questionBank: state.questionBank.filter((q) => q.id !== id) }));
    return true;
  },

  // Assignments
  addAssignment: async (assign) => {
    // Optimistic: add to local state immediately
    set((state) => ({ assignments: [assign, ...state.assignments] }));

    const payload = {
      id: String(assign.id),
      exam_id: String(assign.examId),
      class_id: String(assign.classId),
      teacher_id: String(assign.teacherId),
      duration_minutes: Number(assign.durationMinutes),
      start_time: assign.startTime,
      end_time: assign.endTime,
      settings: assign.settings,
      mode: assign.mode,
      student_ids: Array.isArray(assign.studentIds) ? assign.studentIds.map((sid: any) => String(sid)) : [],
      created_at: assign.createdAt || new Date().toISOString()
    };

    const { error } = await supabase.from('assignments').insert(payload);
    if (error) {
      console.error("DEBUG: addAssignment Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload
      });
      alert(`⚠️ Lỗi giao bài tập lên server (Vercel): ${error.message}\nCó thể do lỗi mạng hoặc cấu hình bảng. Bài giao vẫn hiện tạm thời.`);
      return;
    }

    const state = get();
    const targetClass = state.classes.find(c => c.id === assign.classId);
    const exam = state.exams.find(e => e.id === assign.examId);

    if (targetClass && exam) {
      const assignAny = assign as any;
      const notifyIds: string[] = assignAny.studentIds && assignAny.studentIds.length > 0 ? assignAny.studentIds : targetClass.studentIds;
      
      const newNotifsRaw = notifyIds.map((sid: string) => {
        const id = `notif_${Date.now()}_${sid}`;
        const createdAt = new Date().toISOString();
        const link = `/exam/${exam.id}/take?assign=${assign.id}`;
        
        return {
          id,
          user_id: sid,
          type: 'INFO',
          title: 'Bài đề KT mới',
          message: `Giáo viên đã giao bài đề KT: ${exam.title}`,
          is_read: false,
          created_at: createdAt,
          link
        };
      });

      await supabase.from('notifications').insert(newNotifsRaw);
      
      // Update local state (mapped to camelCase)
      const newNotifsMapped: Notification[] = newNotifsRaw.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
        link: n.link
      }));
      
      set((state: AppState) => ({ notifications: [...newNotifsMapped, ...state.notifications] }));
    }
  },

  deleteAssignment: async (id) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) {
      console.error("Delete assignment error:", error);
      return false;
    }
    set((state) => ({
      assignments: state.assignments.filter(a => a.id !== id)
    }));
    return true;
  },

  updateAssignment: async (updated) => {
    const { error } = await supabase.from('assignments').update({
      start_time: updated.startTime,
      end_time: updated.endTime,
      duration_minutes: updated.durationMinutes,
      settings: updated.settings,
      student_ids: (updated as any).studentIds,
      mode: updated.mode
    }).eq('id', updated.id);
    if (error) {
      console.error("Update assignment error:", error);
      return false;
    }
    set((state) => ({
      assignments: state.assignments.map(a => a.id === updated.id ? updated : a)
    }));
    return true;
  },

  // Attempts
  fetchAttempts: async () => {
    // Try ordering by different potential columns to handle various schema versions
    const orderColumns = ['submitted_at', 'created_at', 'submittedAt'];
    let data: any[] | null = null;
    let lastError: any = null;

    for (const col of orderColumns) {
      const { data: result, error } = await supabase
        .from('attempts')
        .select('*')
        .order(col, { ascending: false });
      
      if (!error) {
        data = result;
        break;
      }
      lastError = error;
    }

    if (data) {
      // Also fetch total count for dashboard stats
      const { count } = await supabase.from('attempts').select('*', { count: 'exact', head: true });
      
      const mappedAttempts: Attempt[] = data.map((a: any) => ({
        id: String(a.id),
        answers: (a.answers as Record<string, any>) || {},
        examId: String(a.examId || a.exam_id || a.examid),
        assignmentId: String(a.assignmentId || a.assignment_id || a.assignmentid || ''),
        studentId: String(a.studentId || a.student_id || a.studentid),
        submittedAt: String(a.submittedAt || a.submitted_at || a.submittedat || new Date().toISOString()),
        score: (a.score !== undefined && a.score !== null) ? Number(a.score) : Number(a.score_achieved || 0),
        teacherFeedback: a.teacherFeedback || a.teacher_feedback || a.teacherfeedback,
        feedbackAllowViewSolution: !!(a.feedbackAllowViewSolution ?? a.feedback_allow_view_solution ?? a.feedbackallowviewsolution ?? true),
        totalTimeSpentSec: Number(a.totalTimeSpentSec ?? a.total_time_spent_sec ?? a.totaltimespentsec ?? 0),
        timeSpentPerQuestion: (a.timeSpentPerQuestion || a.time_spent_per_question || a.timespentperquestion || {}) as Record<string, number>,
        cheatWarnings: Number(a.cheatWarnings ?? a.cheat_warnings ?? a.cheatwarnings ?? 0)
      }));
      set({ attempts: mappedAttempts, totalAttemptsCount: count || mappedAttempts.length });
    } else if (lastError) {
      console.error("fetchAttempts failed on all order columns:", lastError);
    }
  },

  addAttempt: async (attempt) => {
    console.log("DEBUG: addAttempt starting with payload:", attempt);
    
    // First Priority: Standard Snake Case (New Schema)
    const snakePayload = {
      id: attempt.id,
      exam_id: attempt.examId,
      assignment_id: attempt.assignmentId || null,
      student_id: attempt.studentId,
      answers: attempt.answers,
      score: attempt.score,
      submitted_at: attempt.submittedAt,
      teacher_feedback: attempt.teacherFeedback || null,
      feedback_allow_view_solution: attempt.feedbackAllowViewSolution ?? true,
      total_time_spent_sec: attempt.totalTimeSpentSec || null,
      time_spent_per_question: attempt.timeSpentPerQuestion || null,
      cheat_warnings: attempt.cheatWarnings || null
    };

    let { error } = await supabase.from('attempts').insert(snakePayload);
    
    if (error) {
      console.warn("DEBUG: addAttempt Snake Case failed, trying Snake Min...", error.message);
      
      // Second Priority: Snake Case without stats columns (Compatibility)
      const snakeMinPayload = { ...snakePayload };
      delete (snakeMinPayload as any).total_time_spent_sec;
      delete (snakeMinPayload as any).time_spent_per_question;
      delete (snakeMinPayload as any).cheat_warnings;

      const { error: err2 } = await supabase.from('attempts').insert(snakeMinPayload);
      
      if (err2) {
        console.warn("DEBUG: addAttempt Snake Min failed, trying Camel Case...", err2.message);
        
        // Third Priority: Old Camel Case
        const camelPayload = {
          id: attempt.id,
          examId: attempt.examId,
          assignmentId: attempt.assignmentId || null,
          studentId: attempt.studentId,
          answers: attempt.answers,
          score: attempt.score,
          submittedAt: attempt.submittedAt,
          teacherFeedback: attempt.teacherFeedback || null,
          feedbackAllowViewSolution: attempt.feedbackAllowViewSolution ?? true
        };

        const { error: err3 } = await supabase.from('attempts').insert(camelPayload);
        
        if (err3) {
           console.error("DEBUG: addAttempt failed on ALL levels:", {
             snakeError: error.message,
             snakeMinError: err2.message,
             camelError: err3.message
           });
           alert(`❌ LỖI NỘP BÀI: ${err3.message}\n\nVui lòng CHỤP ẢNH MÀN HÌNH kết quả này và gửi cho giáo viên ngay!`);
           return false;
        }
      }
    }

    // Success if we reached here
    set((state) => ({ attempts: [...state.attempts, attempt] }));
    return true;
  },
  updateAttemptFeedback: async (attemptId, feedback, allowViewSolution) => {
    const { error } = await supabase.from('attempts').update({
      teacher_feedback: feedback,
      feedback_allow_view_solution: allowViewSolution
    }).eq('id', attemptId);

    if (error) return;

    set((state) => ({
      attempts: state.attempts.map(a => a.id === attemptId ? {
        ...a,
        teacherFeedback: feedback,
        feedbackAllowViewSolution: allowViewSolution
      } : a)
    }));

    const state = get();
    const attempt = state.attempts.find(a => a.id === attemptId);
    const exam = state.exams.find(e => e.id === attempt?.examId);

    if (attempt && exam) {
      const createdAt = new Date().toISOString();
      const newNotifRaw = {
        id: `notif_fb_${Date.now()}`,
        user_id: attempt.studentId,
        type: 'SUCCESS',
        title: 'Nhận xét mới',
        message: `Giáo viên đã gửi nhận xét cho bài thi: ${exam.title}`,
        is_read: false,
        created_at: createdAt,
        link: `/exam/${exam.id}/take`
      };

      await supabase.from('notifications').insert(newNotifRaw);

      // Local update
      const newNotif: Notification = {
        id: newNotifRaw.id,
        userId: newNotifRaw.user_id,
        type: 'SUCCESS',
        title: newNotifRaw.title,
        message: newNotifRaw.message,
        isRead: false,
        createdAt: newNotifRaw.created_at,
        link: newNotifRaw.link
      };
      set(s => ({ notifications: [newNotif, ...s.notifications] }));
    }
  },

  // Notifications
  addNotification: async (notif) => {
    const payload = {
      id: notif.id,
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      is_read: notif.isRead,
      created_at: notif.createdAt,
      link: notif.link
    };

    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error('Error inserting notification:', error);
    set((state) => ({ notifications: [notif, ...state.notifications] }));
  },
  markNotificationRead: async (id) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
    }));
    // Try both snake_case and camelCase to be extra sure
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
       await supabase.from('notifications').update({ isRead: true }).eq('id', id);
    }
  },
  markAllNotificationsRead: async (userId) => {
    set((state) => ({
      notifications: state.notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n)
    }));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) {
       await supabase.from('notifications').update({ isRead: true }).eq('userId', userId);
    }
  },

  addResource: async (res) => {
    const payload = {
      id: res.id,
      title: res.title,
      url: res.url,
      type: res.type,
      topic: res.topic,
      description: res.description,
      added_by: res.addedBy,
      created_at: res.createdAt
    };

    const { error } = await supabase.from('resources').insert(payload);
    if (error) {
      console.error("Lỗi khi thêm resource:", error);
      return false;
    }
    set(state => ({ resources: [res, ...state.resources] }));
    return true;
  },
  deleteResource: async (id) => {
    set(state => ({ resources: state.resources.filter(r => r.id !== id) }));
    await supabase.from('resources').delete().eq('id', id);
    return true;
  },

  // --- DISCUSSION ROOM (SUPABASE) ---

  // Create Session
  createDiscussion: async (session) => {
    // 1. Insert Session
    const { error: sErr } = await supabase.from('discussion_sessions').insert({
      id: session.id,
      teacher_id: session.teacherId,
      title: session.title,
      status: session.status,
      visibility: session.visibility,
      active_round_id: session.activeRoundId
    });
    if (sErr) { console.error(sErr); return; }

    // 2. Insert Rounds
    if (session.rounds.length > 0) {
      const roundsData = session.rounds.map(r => ({
        id: r.id,
        session_id: session.id,
        name: r.name,
        created_at: r.createdAt
      }));
      await supabase.from('discussion_rounds').insert(roundsData);
    }

    // Update local state (Optimistic)
    set(state => ({ discussionSessions: [...state.discussionSessions, session] }));
  },

  // Join Session
  joinDiscussion: async (pin, student) => {
    // Check if already joined (client side check first)
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    if (!session) return false; // Should verify with DB if not found locally?

    const isJoined = session.participants.some(p => p.studentId === student.id);
    if (isJoined) return true;

    // Insert into DB
    const { error } = await supabase.from('discussion_participants').insert({
      session_id: pin,
      student_id: student.id,
      name: student.name,
      current_room_id: 'MAIN'
    });

    if (error) {
      console.error("Join error:", error);
      return false;
    }

    // Local update will happen via Realtime subscription or optimistic
    const newParticipant = { studentId: student.id, name: student.name, isHandRaised: false, currentRoomId: 'MAIN' };
    set(state => ({
      discussionSessions: state.discussionSessions.map(s =>
        s.id === pin ? { ...s, participants: [...s.participants, newParticipant] } : s
      )
    }));
    return true;
  },

  // Send Message
  sendDiscussionMessage: async (pin, message) => {
    const { error } = await supabase.from('discussion_messages').insert({
      id: message.id,
      session_id: pin,
      sender_id: message.senderId,
      sender_name: message.senderName,
      content: message.content,
      type: message.type,
      round_id: message.roundId,
      room_id: message.roomId,
      created_at: message.timestamp // Ensure timestamp is consistent
    });

    if (!error) {
      // Optimistic update
      set(state => ({
        discussionSessions: state.discussionSessions.map(s =>
          s.id === pin ? { ...s, messages: [...s.messages, message] } : s
        )
      }));
    }
  },

  toggleHandRaise: async (pin, studentId) => {
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    if (!session) return;
    const participant = session.participants.find(p => p.studentId === studentId);
    if (!participant) return;

    const newVal = !participant.isHandRaised;

    // DB Update
    await supabase.from('discussion_participants').update({ is_hand_raised: newVal })
      .eq('session_id', pin).eq('student_id', studentId);

    // Local Update
    set(state => ({
      discussionSessions: state.discussionSessions.map(s =>
        s.id === pin ? {
          ...s,
          participants: s.participants.map(p => p.studentId === studentId ? { ...p, isHandRaised: newVal } : p)
        } : s
      )
    }));
  },

  createPoll: async (pin, poll) => {
    const payload = {
      id: poll.id,
      session_id: pin,
      question: poll.question,
      options: poll.options, // Jsonb
      is_anonymous: poll.isAnonymous,
      is_active: poll.isActive,
      created_at: poll.createdAt
    };
    const { error } = await supabase.from('discussion_polls').insert(payload);
    if (!error) {
      set(state => ({
        discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, polls: [poll, ...s.polls] } : s)
      }));
    }
  },

  votePoll: async (pin, pollId, optionId, studentId) => {
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    const poll = session?.polls.find(p => p.id === pollId);
    if (!poll) return;

    // Calc new options
    const newOptions = poll.options.map(o =>
      o.id === optionId ? { ...o, voteCount: o.voteCount + 1, voterIds: [...o.voterIds, studentId] } : o
    );

    // DB Update (Replace options array)
    await supabase.from('discussion_polls').update({ options: newOptions }).eq('id', pollId);

    // Optimistic
    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          polls: s.polls.map(p => p.id === pollId ? { ...p, options: newOptions } : p)
        };
      })
    }));
  },

  togglePollStatus: async (pin, pollId, isActive) => {
    await supabase.from('discussion_polls').update({ is_active: isActive }).eq('id', pollId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          polls: s.polls.map(p => p.id === pollId ? { ...p, isActive } : p)
        };
      })
    }));
  },

  createBreakoutRooms: async (pin, rooms) => {
    // 1. Clear old rooms if table based? Or just replace JSON/Records
    // For simplicity, we assume we just update the 'breakoutRooms' structure. 
    // If we use 'discussion_breakout_rooms' table:
    const { error: delErr } = await supabase.from('discussion_breakout_rooms').delete().eq('session_id', pin);
    if (delErr) console.error(delErr);

    if (rooms.length > 0) {
      const payload = rooms.map(r => ({
        id: r.id,
        session_id: pin,
        name: r.name
      }));
      await supabase.from('discussion_breakout_rooms').insert(payload);
    }

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, breakoutRooms: rooms } : s)
    }));
  },

  assignToRoom: async (pin, studentId, roomId) => {
    await supabase.from('discussion_participants').update({ current_room_id: roomId })
      .eq('session_id', pin).eq('student_id', studentId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          participants: s.participants.map(p => p.studentId === studentId ? { ...p, currentRoomId: roomId } : p)
        };
      })
    }));
  },

  setDiscussionVisibility: async (pin, visibility) => {
    await supabase.from('discussion_sessions').update({ visibility }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, visibility } : s)
    }));
  },

  createDiscussionRound: async (pin, roundName) => {
    const newRound = {
      id: `round_${Date.now()}`,
      session_id: pin,
      name: roundName,
      created_at: new Date().toISOString()
    };

    await supabase.from('discussion_rounds').insert(newRound);
    // Also set as active
    await supabase.from('discussion_sessions').update({ active_round_id: newRound.id }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        const r: DiscussionRound = { id: newRound.id, name: roundName, createdAt: newRound.created_at };
        return {
          ...s,
          rounds: [...s.rounds, r],
          activeRoundId: newRound.id
        };
      })
    }));
  },

  setActiveRound: async (pin, roundId) => {
    await supabase.from('discussion_sessions').update({ active_round_id: roundId }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, activeRoundId: roundId } : s)
    }));
  },

  endDiscussionSession: async (pin) => {
    await supabase.from('discussion_sessions').update({ status: 'FINISHED' }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, status: 'FINISHED' } : s)
    }));
  },

  // DELETE
  deleteDiscussionSession: async (pin) => {
    const { error } = await supabase.from('discussion_sessions').delete().eq('id', pin);
    if (error) {
      console.error("Failed to delete session:", error);
      return false;
    }

    set(state => ({
      discussionSessions: state.discussionSessions.filter(s => s.id !== pin)
    }));
    return true;
  },

  // LIVE SESSIONS (Still Mock/Memory for now as requested only Discussion Room first)
  liveSessions: [],
  createLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  updateLiveSessionStatus: (pin, status) => set((state) => ({ liveSessions: state.liveSessions.map(s => s.id === pin ? { ...s, status } : s) })),
  joinLiveSession: (pin, student) => { return true; }, // Mock
  updateLiveParticipantProgress: (pin, studentId, progress) => { },

  // ============================================
  // EDUQUEST ARENA
  // ============================================
  arenaProfile: null,
  arenaQuestions: [],
  arenaQuestionsHasMore: false,
  arenaMatches: [],

  fetchArenaProfile: async (userId) => {
    const { data, error } = await supabase.from('arena_profiles').select('*').eq('id', userId).single();
    if (data) {
      set({ arenaProfile: data as any });
    } else {
      set({ arenaProfile: null });
    }
  },

  createArenaProfile: async (userId, avatarClass) => {
    const profile = { id: userId, avatar_class: avatarClass, elo_rating: 1000, total_xp: 0, wins: 0, losses: 0, tower_floor: 1 };
    const { error } = await supabase.from('arena_profiles').insert(profile);
    if (error) {
      console.error('Lỗi tạo Arena Profile:', error);
      alert(`Lỗi tạo hồ sơ Arena: ${error.message}\n\nHãy chạy script MIGRATION trong Supabase SQL Editor để cập nhật CHECK constraint.`);
      return;
    }
    set({ arenaProfile: profile as any });
  },

  updateArenaProfile: async (profile) => {
    const { error } = await supabase.from('arena_profiles').update(profile).eq('id', profile.id);
    if (!error) {
      set(state => ({
        arenaProfile: state.arenaProfile ? { ...state.arenaProfile, ...profile } : null
      }));
    }
  },

  fetchArenaQuestions: async () => {
    const { data } = await supabase.from('arena_questions').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) {
      set({
        arenaQuestions: data.map((q: any) => ({ ...q, answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers })),
        arenaQuestionsHasMore: data.length === 50
      });
    }
  },

  loadMoreArenaQuestions: async () => {
    const state = get();
    if (!state.arenaQuestionsHasMore || state.arenaQuestions.length === 0) return;

    // Sử dụng range với offset là độ dài hiện tại
    const currentLength = state.arenaQuestions.length;
    const { data } = await supabase.from('arena_questions').select('*').order('created_at', { ascending: false }).range(currentLength, currentLength + 49);

    if (data && data.length > 0) {
      const parsed = data.map((q: any) => ({ ...q, answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers }));
      set({
        arenaQuestions: [...state.arenaQuestions, ...parsed],
        arenaQuestionsHasMore: data.length === 50
      });
    } else {
      set({ arenaQuestionsHasMore: false });
    }
  },

  addArenaQuestion: async (q) => {
    const id = `aq_${Date.now()}`;
    const row = { id, content: q.content, answers: q.answers, correct_index: q.correct_index, difficulty: q.difficulty, subject: q.subject, topic: q.topic || 'general' };
    const { error } = await supabase.from('arena_questions').insert(row);
    if (error) return false;
    set(state => ({ arenaQuestions: [...state.arenaQuestions, { ...row, answers: typeof row.answers === 'string' ? JSON.parse(row.answers as any) : row.answers } as any] }));
    return true;
  },

  updateArenaQuestion: async (q) => {
    const { error } = await supabase.from('arena_questions').update({ content: q.content, answers: q.answers, correct_index: q.correct_index, difficulty: q.difficulty, subject: q.subject, topic: q.topic || 'general' }).eq('id', q.id);
    if (error) return false;
    set(state => ({ arenaQuestions: state.arenaQuestions.map(x => x.id === q.id ? q : x) }));
    return true;
  },

  deleteArenaQuestion: async (id) => {
    const { error } = await supabase.from('arena_questions').delete().eq('id', id);
    if (error) return false;
    set(state => ({ arenaQuestions: state.arenaQuestions.filter(x => x.id !== id) }));
    return true;
  },

  bulkDeleteArenaQuestions: async (ids: string[]) => {
    const { error } = await supabase.from('arena_questions').delete().in('id', ids);
    if (error) {
      console.error('Bulk delete error:', error);
      return false;
    }
    set(state => ({ arenaQuestions: state.arenaQuestions.filter(x => !ids.includes(x.id)) }));
    return true;
  },

  fetchWaitingMatches: async () => {
    const { data } = await supabase
      .from('arena_matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  },

  createMatch: async (playerId, filters) => {
    let questionIds: string[] = [];

    if (filters?.source === 'exam') {
      // Lấy câu hỏi MCQ từ ngân hàng đề Exam
      const state = get();
      const allMcqQuestions: { id: string }[] = [];

      const difficultyMap: Record<string, number> = { 'LEVEL_1': 1, 'LEVEL_2': 2, 'LEVEL_3': 3 };

      state.exams
        .filter(exam => exam.status === 'PUBLISHED')
        .filter(exam => !filters.subject || exam.subject === filters.subject)
        .filter(exam => !filters.grade || exam.grade === filters.grade)
        .forEach(exam => {
          exam.questions
            .filter(q => q.type === 'MCQ' && q.options.length >= 4 && q.correctOptionIndex !== undefined)
            .forEach(q => {
              allMcqQuestions.push({ id: `exam_${exam.id}_${q.id}` });
            });
        });

      questionIds = allMcqQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map(q => q.id);
    } else {
      // Lấy từ bảng arena_questions
      let query = supabase.from('arena_questions').select('id');
      if (filters?.subject) query = query.eq('subject', filters.subject);
      if (filters?.topic) query = query.eq('topic', filters.topic);
      const { data: questions } = await query;
      const allIds = questions?.map((q: any) => q.id) || [];
      questionIds = allIds.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    if (questionIds.length === 0) {
      // Fallback: lấy tất cả arena_questions
      const { data: questions } = await supabase.from('arena_questions').select('id');
      questionIds = (questions?.map((q: any) => q.id) || []).sort(() => Math.random() - 0.5).slice(0, 5);
    }

    const matchId = `match_${Date.now()}`;
    const newMatch = {
      id: matchId,
      player1_id: playerId,
      player2_id: null,
      status: 'waiting',
      question_ids: questionIds,
      current_question: 0,
      player1_hp: 100,
      player2_hp: 100,
      player1_score: 0,
      player2_score: 0,
      winner_id: null,
      source: filters?.source || 'arena',
      filter_subject: filters?.subject || null,
      filter_grade: filters?.grade || null
    };

    const { error } = await supabase.from('arena_matches').insert(newMatch);
    if (error) {
      console.error("Match creation error", error);
      return null;
    }

    // Send notification to related students
    const state = get();
    const currentUser = state.users.find(u => u.id === playerId);

    if (currentUser) {
      // Find classes this user belongs to
      const relatedClasses = state.classes.filter(c =>
        c.teacherId === playerId || c.studentIds.includes(playerId)
      );

      // Gather all unique student IDs from these classes
      const studentIdsToNotify = new Set<string>();
      relatedClasses.forEach(c => {
        c.studentIds.forEach(sid => {
          if (sid !== playerId) studentIdsToNotify.add(sid);
        });
      });

      // Send notifications
      studentIdsToNotify.forEach(sid => {
        state.addNotification({
          id: `notif_arena_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: sid,
          type: 'INFO',
          title: 'Thách Đấu Mới',
          message: `${currentUser.name} vừa tạo phòng Đấu Trí mới. Vào sảnh để tham gia ngay!`,
          link: '/arena/pvp',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    }

    return newMatch as any;
  },

  cancelMatchmaking: async (matchId) => {
    await supabase.from('arena_matches').delete().eq('id', matchId).in('status', ['waiting', 'challenged']);
  },

  challengeMatch: async (matchId, challengerId) => {
    const { error } = await supabase.from('arena_matches')
      .update({ player2_id: challengerId, status: 'challenged' })
      .eq('id', matchId)
      .eq('status', 'waiting');
    if (error) {
      console.error('challengeMatch error:', error);
      alert(`Lỗi gửi thách đấu: ${error.message}`);
      return false;
    }
    return true;
  },

  acceptMatch: async (matchId) => {
    const { error } = await supabase.from('arena_matches')
      .update({ status: 'playing' })
      .eq('id', matchId)
      .eq('status', 'challenged');
    if (error) {
      console.error('acceptMatch error:', error);
      alert(`Lỗi chấp nhận: ${error.message}`);
      return false;
    }
    return true;
  },

  rejectMatch: async (matchId) => {
    await supabase.from('arena_matches')
      .update({ player2_id: null, status: 'waiting' })
      .eq('id', matchId)
      .eq('status', 'challenged');
  },

  submitArenaAnswer: async (matchId, playerId, questionIndex, answerIndex, timeTaken, isCorrect) => {
    const damage = isCorrect ? 20 + Math.max(0, Math.round((15 - timeTaken) * 0.7)) : 0;
    const eventType = isCorrect ? 'answer_correct' : 'answer_wrong';
    await supabase.from('arena_match_events').insert({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      match_id: matchId,
      player_id: playerId,
      event_type: eventType,
      payload: { question_index: questionIndex, damage, time_taken: timeTaken, answer_index: answerIndex }
    });
  },

  finishMatch: async (matchId, winnerId) => {
    await supabase.from('arena_matches').update({ status: 'finished', winner_id: winnerId }).eq('id', matchId);

    // Update Elo for both players
    const { data: match } = await supabase.from('arena_matches').select('*').eq('id', matchId).single();
    if (!match) return;

    const { data: p1Profile } = await supabase.from('arena_profiles').select('*').eq('id', match.player1_id).single();
    const { data: p2Profile } = await supabase.from('arena_profiles').select('*').eq('id', match.player2_id).single();
    if (!p1Profile || !p2Profile) return;

    const K = 32;
    const expected1 = 1 / (1 + Math.pow(10, (p2Profile.elo_rating - p1Profile.elo_rating) / 400));
    const expected2 = 1 - expected1;

    let score1 = 0.5, score2 = 0.5; // draw
    if (winnerId === match.player1_id) { score1 = 1; score2 = 0; }
    else if (winnerId === match.player2_id) { score1 = 0; score2 = 1; }

    const newElo1 = Math.round(p1Profile.elo_rating + K * (score1 - expected1));
    const newElo2 = Math.round(p2Profile.elo_rating + K * (score2 - expected2));

    await supabase.from('arena_profiles').update({
      elo_rating: newElo1,
      total_xp: p1Profile.total_xp + (score1 === 1 ? 50 : 10),
      wins: p1Profile.wins + (score1 === 1 ? 1 : 0),
      losses: p1Profile.losses + (score1 === 0 ? 1 : 0)
    }).eq('id', match.player1_id);

    await supabase.from('arena_profiles').update({
      elo_rating: newElo2,
      total_xp: p2Profile.total_xp + (score2 === 1 ? 50 : 10),
      wins: p2Profile.wins + (score2 === 1 ? 1 : 0),
      losses: p2Profile.losses + (score2 === 0 ? 1 : 0)
    }).eq('id', match.player2_id);

    // Update local if current user
    const state = get();
    if (state.arenaProfile && (state.arenaProfile.id === match.player1_id || state.arenaProfile.id === match.player2_id)) {
      const isP1 = state.arenaProfile.id === match.player1_id;
      const won = winnerId === state.arenaProfile.id;
      set({
        arenaProfile: {
          ...state.arenaProfile,
          elo_rating: isP1 ? newElo1 : newElo2,
          total_xp: state.arenaProfile.total_xp + (won ? 50 : 10),
          wins: state.arenaProfile.wins + (won ? 1 : 0),
          losses: state.arenaProfile.losses + (!won && winnerId ? 1 : 0)
        }
      });
    }
  },

  updateMatchHp: async (matchId, player1Hp, player2Hp) => {
    await supabase.from('arena_matches').update({ player1_hp: player1Hp, player2_hp: player2Hp }).eq('id', matchId);
  },

  fetchLeaderboard: async () => {
    const { data } = await supabase.from('arena_profiles').select('*').order('elo_rating', { ascending: false }).limit(50);
    return (data || []) as any[];
  },

  bulkAddArenaQuestions: async (questions) => {
    const rows = questions.map((q, i) => ({
      id: `aq_bulk_${Date.now()}_${i}`,
      content: q.content,
      answers: q.answers,
      correct_index: q.correct_index,
      difficulty: q.difficulty,
      subject: q.subject,
      topic: q.topic || 'general'
    }));
    const { error } = await supabase.from('arena_questions').insert(rows);
    if (error) {
      console.error('Bulk insert error:', error);
      return 0;
    }
    const parsed = rows.map(r => ({ ...r, answers: typeof r.answers === 'string' ? JSON.parse(r.answers as any) : r.answers }));
    set(state => ({ arenaQuestions: [...state.arenaQuestions, ...parsed as any[]] }));
    return rows.length;
  },

  // ============================================
  // TOURNAMENT ACTIONS
  // ============================================
  tournaments: [],

  fetchTournaments: async () => {
    const { data } = await supabase.from('arena_tournaments').select('*').order('created_at', { ascending: false });
    set({ tournaments: (data || []) as any[] } as any);
  },

  createTournament: async (t: any) => {
    const id = `tour_${Date.now()}`;
    const row = { id, ...t, status: 'waiting' };
    const { error } = await supabase.from('arena_tournaments').insert(row);
    if (error) { console.error('Create tournament error:', error); return null; }
    set((state: any) => ({ tournaments: [row as any, ...state.tournaments] }));
    return row as any;
  },

  updateTournament: async (id: string, updates: any) => {
    await supabase.from('arena_tournaments').update(updates).eq('id', id);
    set((state: any) => ({ tournaments: state.tournaments.map((t: any) => t.id === id ? { ...t, ...updates } : t) }));
  },

  joinTournament: async (tournamentId, studentId) => {
    // Generate alias
    const ADJECTIVES = ['Dũng Cảm', 'Nhanh Trí', 'Thông Minh', 'Vui Vẻ', 'Bí Ẩn', 'Siêu Tốc', 'Mạnh Mẽ', 'Lanh Lợi', 'Tài Giỏi', 'Phi Thường', 'Oai Phong', 'Huyền Bí', 'Lẫm Liệt', 'Kiên Cường', 'Sáng Suốt'];
    const ANIMALS = ['Rồng', 'Phượng Hoàng', 'Sư Tử', 'Đại Bàng', 'Kỳ Lân', 'Ninja', 'Hổ', 'Sói', 'Cáo', 'Gấu Trúc', 'Cá Mập', 'Bạch Tuộc', 'Diều Hâu', 'Báo Đen', 'Rắn Hổ Mang'];
    const EMOJIS = ['🐉', '🦁', '🦅', '🦄', '🐯', '🐺', '🦊', '🐼', '🦈', '🐙', '🦅', '🐆', '🦇', '🐲', '🦂'];
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const alias = `${animal} ${adj}`;

    const row = {
      id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tournament_id: tournamentId,
      student_id: studentId,
      alias,
      alias_emoji: emoji,
      status: 'active',
      wins: 0,
    };
    const { error } = await supabase.from('arena_tournament_participants').insert(row);
    if (error) {
      if (error.code === '23505') return null; // Already joined
      console.error('Join tournament error:', error);
      return null;
    }
    return row as any;
  },

  fetchTournamentParticipants: async (tournamentId: string) => {
    const { data } = await supabase.from('arena_tournament_participants').select('*').eq('tournament_id', tournamentId).order('eliminated_at', { ascending: false, nullsFirst: true });
    return (data || []) as any[];
  },

  updateParticipant: async (id: string, updates: any) => {
    await supabase.from('arena_tournament_participants').update(updates).eq('id', id);
  },

  eliminateParticipant: async (id: string) => {
    await supabase.from('arena_tournament_participants').update({ status: 'eliminated', eliminated_at: new Date().toISOString() }).eq('id', id);
  },

}));

