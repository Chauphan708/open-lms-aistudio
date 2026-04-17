import { create } from 'zustand';
import { createArenaSlice } from './store/arenaSlice';
import { createAuthSlice } from './store/authSlice';
import { createExamSlice } from './store/examSlice';
import { createClassSlice } from './store/classSlice';
import { createAppSlice } from './store/appSlice';
import { createDiscussionSlice } from './store/discussionSlice';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound, Notification, WebResource, ChatMessage, CustomToolMenu, Poll, BreakoutRoom, ArenaMatchFilters, QuestionBankItem, SiteSettings } from './types';
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

export const useStore = create<AppState>((set, get, api) => ({
  ...createArenaSlice(set, get, api),
  ...createAuthSlice(set, get, api),
  ...createExamSlice(set, get, api),
  ...createClassSlice(set, get, api),
  ...createAppSlice(set, get, api),
  ...createDiscussionSlice(set, get, api),

  isDataLoading: false,

  // --- INITIAL DATA FETCHING ---
  fetchInitialData: async () => {
    set({ isDataLoading: true });
    const { user } = get();

    try {
      // 1. Fetch Users (Profiles) - Security Patch: Only Admins/Teachers get all users
      if (user && (user.role === 'ADMIN' || user.role === 'TEACHER')) {
        const { data: foundUsers, error: userErr } = await supabase.from('profiles').select('*');
        if (foundUsers && foundUsers.length > 0) {
          set({ users: foundUsers as User[] });
        }
      } else {
         set({ users: [] });
      }

      // 2. Fetch Academic Years (Public data)
      const { data: years } = await supabase.from('academic_years').select('*');
      if (years) set({ academicYears: years as AcademicYear[] });

      // If no user is logged in, clear teacher/student specific data
      if (!user) {
        set({ exams: [], assignments: [], classes: [], questionBank: [], notifications: [], attempts: [], resources: [], discussionSessions: [] });
        return;
      }

      const isAdmin = user.role === 'ADMIN';
      const isTeacher = user.role === 'TEACHER';
      const isStudent = user.role === 'STUDENT';

      // 3. Fetch Question Bank
      try {
        let qQuery = supabase.from('question_bank').select('*');
        if (isTeacher) qQuery = qQuery.eq('teacher_id', user.id);
        
        const { data: qBanks } = await qQuery;
        if (qBanks) {
          const mapped = qBanks.map((q: any) => ({
            ...q,
            correctOptionIndex: q.correct_option_index,
            imageUrl: q.image_url,
            isArenaEligible: q.is_arena_eligible,
            teacherId: q.teacherId || q.teacher_id || q.teacherid
          }));
          set({ questionBank: mapped as QuestionBankItem[] });
        }
      } catch (err) {
        console.error("Error fetching question_bank:", err);
      }

      // 4. Fetch Exams
      let examQuery = supabase.from('exams').select('*');
      if (isTeacher) examQuery = examQuery.eq('teacher_id', user.id);
      
      let { data: exams, error: examErr } = await examQuery;
      
      // Fallback: Nếu không thấy bằng teacher_id (có thể do dữ liệu cũ chưa update), thử teacherId
      if (isTeacher && (examErr || !exams || exams.length === 0)) {
          const fallback = await supabase.from('exams').select('*').eq('teacherId', user.id);
          if (!fallback.error && fallback.data && fallback.data.length > 0) {
              exams = fallback.data;
              examErr = null;
          }
      }

      if (!examErr && exams) {
        // Sort in JS
        const sortedExams = [...exams].sort((a, b) => {
          const timeA = new Date(a.created_at || a.createdAt || a.createdat || 0).getTime();
          const timeB = new Date(b.created_at || b.createdAt || b.createdat || 0).getTime();
          return timeB - timeA;
        });

        const mappedExams = sortedExams.map((e: any) => ({
          ...e,
          id: String(e.id),
          teacherId: String(e.teacherId || e.teacher_id || e.teacherid || ''),
          createdAt: e.createdAt || e.created_at || e.createdat,
          updatedAt: e.updatedAt || e.updated_at || e.updatedat,
          durationMinutes: Number(e.durationMinutes || e.duration_minutes || e.durationminutes || 0),
          questionCount: e.questionCount || e.question_count || e.questioncount,
          category: e.category || (String(e.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
          classId: String(e.classId || e.class_id || e.classid || '')
        }));
        set({ exams: mappedExams as Exam[] });
      }

      // 5. Fetch Classes
      let classQuery = supabase.from('classes').select('*');
      if (isTeacher) classQuery = classQuery.eq('teacher_id', user.id);
      if (isStudent && user.className) classQuery = classQuery.eq('name', user.className);

      let { data: rawClasses, error: classErr } = await classQuery;
      
      if (isTeacher && (classErr || !rawClasses || rawClasses.length === 0)) {
          const fallback = await supabase.from('classes').select('*').eq('teacherId', user.id);
          if (!fallback.error && fallback.data && fallback.data.length > 0) {
              rawClasses = fallback.data;
              classErr = null;
          }
      }

      if (rawClasses) {
        const mappedClasses = rawClasses.map(c => ({
          id: String(c.id),
          name: c.name,
          academicYearId: String(c.academicYearId || c.academic_year_id || c.academicyearid),
          teacherId: String(c.teacherId || c.teacher_id || c.teacherid),
          studentIds: Array.isArray(c.studentIds || c.student_ids || c.studentids) ? (c.studentIds || c.student_ids || c.studentids).map((sid: any) => String(sid)) : []
        }));
        set({ classes: mappedClasses as Class[] });
      }

      // 6. Fetch Assignments
      let assignQuery = supabase.from('assignments').select('*');
      if (isTeacher) assignQuery = assignQuery.eq('teacher_id', user.id);
      
      if (isTeacher || isAdmin || (isStudent && get().classes.length > 0)) {
          let { data: assignments, error: assignErr } = await assignQuery;
          
          if (isTeacher && (assignErr || !assignments || assignments.length === 0)) {
              const fallback = await supabase.from('assignments').select('*').eq('teacherId', user.id);
              if (!fallback.error && fallback.data && fallback.data.length > 0) {
                  assignments = fallback.data;
                  assignErr = null;
              }
          }

          if (assignments) {
            const sortedAssign = [...assignments].sort((a, b) => {
              const timeA = new Date(a.created_at || a.createdAt || a.createdat || 0).getTime();
              const timeB = new Date(b.created_at || b.createdAt || b.createdat || 0).getTime();
              return timeB - timeA;
            });

            const mappedAssignments = sortedAssign.map((a: any) => ({
              ...a,
              id: String(a.id),
              examId: String(a.examId || a.exam_id || a.examid),
              classId: String(a.classId || a.class_id || a.classid),
              teacherId: String(a.teacherId || a.teacher_id || a.teacherid || ''),
              durationMinutes: Number(a.durationMinutes || a.duration_minutes || a.durationminutes || 0),
              studentIds: Array.isArray(a.studentIds || a.student_ids || a.studentids) 
                ? (a.studentIds || a.student_ids || a.studentids).map((sid: any) => String(sid)) 
                : [],
              createdAt: a.createdAt || a.created_at || a.createdat,
              startTime: a.startTime || a.start_time || a.starttime,
              endTime: a.endTime || a.end_time || a.endtime,
              status: a.status || 'active'
            }));
            
            if (isStudent) {
                const classIds = get().classes.map(c => c.id);
                const filtered = mappedAssignments.filter(a => 
                    classIds.includes(a.classId) && (!a.studentIds || a.studentIds.length === 0 || a.studentIds.includes(user.id))
                );
                set({ assignments: filtered });
            } else {
                set({ assignments: mappedAssignments as Assignment[] });
            }
          }
      } else {
          set({ assignments: [] });
      }

      // 7. Fetch Attempts
      if (isTeacher || isAdmin) {
          const teacherExamIds = isTeacher ? get().exams.map(e => e.id) : undefined;
          await get().fetchAttempts(teacherExamIds);
      } else if (isStudent) {
          const { data: myAttempts } = await supabase.from('attempts').select('*').eq('student_id', user.id);
          if (myAttempts) {
              set({ attempts: myAttempts.map((a: any) => ({
                id: String(a.id),
                examId: String(a.exam_id || a.examId),
                assignmentId: String(a.assignment_id || a.assignmentId),
                studentId: String(a.student_id || a.studentId),
                submittedAt: a.submitted_at || a.submittedAt,
                score: a.score,
                answers: a.answers || {},
                teacherFeedback: a.teacher_feedback,
                totalTimeSpentSec: a.total_time_spent_sec
              })) as Attempt[] });
          }
      }

      // 8. Notifications
      const { data: notificationData } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (notificationData) {
        set({ notifications: notificationData.map(n => ({
          id: String(n.id),
          userId: String(n.user_id),
          type: n.type || 'INFO',
          title: n.title,
          message: n.message,
          isRead: !!n.is_read,
          createdAt: n.created_at,
          link: n.link,
          payload: n.payload
        })) });
      }

      // 9. Resources
      const { data: rawResources } = await supabase.from('resources').select('*');
      if (rawResources) {
        const resources = rawResources.map(r => ({
          ...r,
          createdAt: r.createdAt || r.created_at || r.createdat,
          addedBy: r.addedBy || r.added_by || r.addedby
        }));
        set({ resources: resources as WebResource[] });
      }

      // 10. Fetch Discussions
      let discussionQuery = supabase.from('discussion_sessions').select(`
            *,
            rounds:discussion_rounds(*),
            participants:discussion_participants(*),
            polls:discussion_polls(*),
            breakoutRooms:discussion_breakout_rooms(*)
        `);
      if (isTeacher) discussionQuery = discussionQuery.eq('teacher_id', user.id);

      const { data: sessions } = await discussionQuery;
      if (sessions) {
        const { data: messages } = await supabase.from('discussion_messages').select('*');
        const formattedSessions: DiscussionSession[] = sessions.map((s: any) => ({
          id: s.id,
          teacherId: s.teacher_id,
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
          breakoutRooms: s.breakoutRooms || []
        }));
        set({ discussionSessions: formattedSessions });
      }

      // --- SETUP REALTIME SUBSCRIPTIONS ---
      // Attempts Realtime
      supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'attempts' },
          (payload) => {
            const a = payload.new;
            // Only add if relevant: admin sees all, teacher sees their own exams, student sees own
            const isMyExam = get().exams.some(e => e.id === String(a.exam_id || a.examId));
            if (isAdmin || (isTeacher && isMyExam) || (isStudent && a.student_id === user.id)) {
                const mappedAttempt: Attempt = {
                  id: String(a.id),
                  answers: (a.answers as Record<string, any>) || {},
                  examId: String(a.exam_id || a.examId),
                  assignmentId: String(a.assignment_id || a.assignmentId),
                  studentId: String(a.student_id || a.studentId),
                  submittedAt: String(a.submitted_at || a.submittedAt || new Date().toISOString()),
                  score: (a.score !== undefined && a.score !== null) ? Number(a.score) : 0,
                  teacherFeedback: a.teacher_feedback,
                  totalTimeSpentSec: Number(a.total_time_spent_sec || 0)
                };
                set((state) => {
                   if (state.attempts.some(att => att.id === mappedAttempt.id)) return state;
                   return { attempts: [...state.attempts, mappedAttempt] };
                });
            }
          }
        )
        .subscribe();

      // Notifications Realtime
      supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const n = payload.new;
            if (n.user_id === user.id) {
                const newNotif = {
                  id: String(n.id),
                  userId: String(n.user_id),
                  type: n.type || 'INFO',
                  title: n.title,
                  message: n.message,
                  isRead: !!n.is_read,
                  createdAt: n.created_at,
                  link: n.link,
                  payload: n.payload
                };
                set((state) => {
                  if (state.notifications.some(notif => notif.id === newNotif.id)) return state;
                  return { notifications: [newNotif, ...state.notifications] };
                });
            }
          }
        )
        .subscribe();

      // 11. Fetch Site Settings
      await get().fetchSiteSettings();

    } catch (e) {
      console.error("Error fetching initial data (Global):", e);
      if (get().users.length === 0) set({ users: SEED_USERS });
    } finally {
      // 10. Fetch Custom Topics
      await get().fetchCustomTopics();

      set({ isDataLoading: false });
    }
  },

  // NOTE: All remaining state logic has been moved to their respective slices in src/store/

}));

