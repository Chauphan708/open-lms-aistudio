import { create } from 'zustand';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound, Notification, WebResource, ChatMessage, Poll, BreakoutRoom } from './types';
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

  // --- INITIAL DATA FETCHING ---
  fetchInitialData: async () => {
    set({ isDataLoading: true });
    try {
      // 1. Fetch Users (Profiles)
      const { data: users, error: userErr } = await supabase.from('profiles').select('*');
      if (users && users.length > 0) {
        set({ users: users as User[] });
      } else if (!userErr) {
        await supabase.from('profiles').insert(SEED_USERS);
        set({ users: SEED_USERS });
      }

      // 2. Fetch Exams
      const { data: exams } = await supabase.from('exams').select('*').order('createdAt', { ascending: false });
      if (exams) set({ exams: exams as Exam[] });

      // 3. Fetch Classes
      const { data: classes } = await supabase.from('classes').select('*');
      if (classes) set({ classes: classes as Class[] });

      // 4. Fetch Assignments
      const { data: assignments } = await supabase.from('assignments').select('*').order('createdAt', { ascending: false });
      if (assignments) set({ assignments: assignments as Assignment[] });

      // 5. Fetch Attempts
      const { data: attempts } = await supabase.from('attempts').select('*');
      if (attempts) set({ attempts: attempts as Attempt[] });

      // 6. Fetch Years
      const { data: years } = await supabase.from('academic_years').select('*');
      if (years) set({ academicYears: years as AcademicYear[] });

      // 7. Notifications
      const { data: notifs } = await supabase.from('notifications').select('*').order('createdAt', { ascending: false });
      if (notifs) set({ notifications: notifs as Notification[] });

      // 8. Resources
      const { data: resources } = await supabase.from('resources').select('*');
      if (resources) set({ resources: resources as WebResource[] });

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
      console.error("Error fetching initial data:", e);
      set({ users: SEED_USERS });
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
  users: [],
  addUser: async (user: User, assignedClassId?: string) => {
    // 1. Dùng Transaction giả lập bằng cách Insert User rồi Update Class
    const { error } = await supabase.from('profiles').insert(user);
    if (error) {
      console.error("Error creating user:", error);
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

        const { error: clsError } = await supabase.from('classes')
          .update({ studentIds: updatedStudentIds })
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
    const { error } = await supabase.from('profiles').update(updatedUser).eq('id', updatedUser.id);
    if (!error) {
      set((state) => ({
        users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        user: state.user?.id === updatedUser.id ? updatedUser : state.user
      }));
    }
  },
  deleteUser: async (userId) => {
    // 1. Dọn dẹp id học sinh khỏi danh sách lớp nếu có
    const state = get();
    const affectedClass = state.classes.find(c => c.studentIds?.includes(userId));
    if (affectedClass) {
      const updatedStudentIds = affectedClass.studentIds.filter(id => id !== userId);
      const { error: clsError } = await supabase.from('classes')
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

    // 2. Xóa user khỏi bảng profiles
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
      user: state.user?.id === userId ? { ...state.user, password: newPass } : state.user
    }));
    return true;
  },
  saveUserPrompt: async (prompt) => {
    const state = get();
    if (!state.user || !prompt.trim()) return;
    const currentPrompts = state.user.savedPrompts || [];
    if (currentPrompts.includes(prompt)) return;

    const newPrompts = [prompt, ...currentPrompts].slice(0, 10);
    const updatedUser = { ...state.user, savedPrompts: newPrompts };

    await supabase.from('profiles').update({ savedPrompts: newPrompts }).eq('id', state.user.id);

    set({
      user: updatedUser,
      users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u)
    });
  },

  // Academic Years
  academicYears: [],
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
  classes: [],
  addClass: async (cls) => {
    const { error } = await supabase.from('classes').insert(cls);
    if (!error) set((state) => ({ classes: [...state.classes, cls] }));
  },
  updateClass: async (updatedClass) => {
    const { error } = await supabase.from('classes').update(updatedClass).eq('id', updatedClass.id);
    if (!error) set((state) => ({
      classes: state.classes.map(c => c.id === updatedClass.id ? updatedClass : c)
    }));
  },

  // Exams
  exams: [],
  addExam: async (exam) => {
    const { error } = await supabase.from('exams').insert(exam);
    if (!error) set((state) => ({ exams: [exam, ...state.exams] }));
    else console.error(error);
  },
  updateExam: async (updatedExam) => {
    const { error } = await supabase.from('exams').update(updatedExam).eq('id', updatedExam.id);
    if (!error) set((state) => ({
      exams: state.exams.map((e) => e.id === updatedExam.id ? updatedExam : e)
    }));
  },

  // Assignments
  assignments: [],
  addAssignment: async (assign) => {
    const { error } = await supabase.from('assignments').insert(assign);
    if (error) return;

    set((state) => ({ assignments: [assign, ...state.assignments] }));

    const state = get();
    const targetClass = state.classes.find(c => c.id === assign.classId);
    const exam = state.exams.find(e => e.id === assign.examId);

    if (targetClass && exam) {
      const newNotifs: Notification[] = targetClass.studentIds.map(sid => ({
        id: `notif_${Date.now()}_${sid}`,
        userId: sid,
        type: 'INFO',
        title: 'Bài tập mới',
        message: `Giáo viên đã giao bài tập: ${exam.title}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/exam/${exam.id}/take?assign=${assign.id}`
      }));

      await supabase.from('notifications').insert(newNotifs);
      set(state => ({ notifications: [...newNotifs, ...state.notifications] }));
    }
  },

  // Attempts
  attempts: [],
  addAttempt: async (attempt) => {
    const { error } = await supabase.from('attempts').insert(attempt);
    if (!error) set((state) => ({ attempts: [...state.attempts, attempt] }));
  },
  updateAttemptFeedback: async (attemptId, feedback, allowViewSolution) => {
    const { error } = await supabase.from('attempts').update({
      teacherFeedback: feedback,
      feedbackAllowViewSolution: allowViewSolution
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
      const newNotif: Notification = {
        id: `notif_fb_${Date.now()}`,
        userId: attempt.studentId,
        type: 'SUCCESS',
        title: 'Nhận xét mới',
        message: `Giáo viên đã gửi nhận xét cho bài thi: ${exam.title}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/exam/${exam.id}/take`
      };
      await supabase.from('notifications').insert(newNotif);
      set(s => ({ notifications: [newNotif, ...s.notifications] }));
    }
  },

  // Notifications
  notifications: [],
  addNotification: async (notif) => {
    await supabase.from('notifications').insert(notif);
    set((state) => ({ notifications: [notif, ...state.notifications] }));
  },
  markNotificationRead: async (id) => {
    await supabase.from('notifications').update({ isRead: true }).eq('id', id);
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    }));
  },
  markAllNotificationsRead: async (userId) => {
    await supabase.from('notifications').update({ isRead: true }).eq('userId', userId);
    set((state) => ({
      notifications: state.notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n)
    }));
  },

  // Resources - Force Update
  resources: [],
  addResource: async (res) => {
    set(state => ({ resources: [res, ...state.resources] }));
    await supabase.from('resources').insert({
      id: res.id,
      title: res.title,
      url: res.url,
      type: res.type,
      topic: res.topic,
      description: res.description,
      addedBy: res.addedBy,
      createdAt: res.createdAt
    });
    return true;
  },
  deleteResource: async (id) => {
    set(state => ({ resources: state.resources.filter(r => r.id !== id) }));
    await supabase.from('resources').delete().eq('id', id);
    return true;
  },

  // --- DISCUSSION ROOM (SUPABASE) ---

  discussionSessions: [],

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
    if (!error) {
      set({ arenaProfile: profile as any });
    }
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
    const { data } = await supabase.from('arena_questions').select('*');
    if (data) {
      set({ arenaQuestions: data.map((q: any) => ({ ...q, answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers })) });
    }
  },

  addArenaQuestion: async (q) => {
    const id = `aq_${Date.now()}`;
    const row = { id, content: q.content, answers: q.answers, correct_index: q.correct_index, difficulty: q.difficulty, subject: q.subject };
    const { error } = await supabase.from('arena_questions').insert(row);
    if (error) return false;
    set(state => ({ arenaQuestions: [...state.arenaQuestions, { ...row, answers: typeof row.answers === 'string' ? JSON.parse(row.answers as any) : row.answers } as any] }));
    return true;
  },

  updateArenaQuestion: async (q) => {
    const { error } = await supabase.from('arena_questions').update({ content: q.content, answers: q.answers, correct_index: q.correct_index, difficulty: q.difficulty, subject: q.subject }).eq('id', q.id);
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

  fetchWaitingMatches: async () => {
    const { data } = await supabase
      .from('arena_matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  },

  createMatch: async (playerId) => {
    // 1. Get questions
    const { data: questions } = await supabase.from('arena_questions').select('id');
    const allIds = questions?.map((q: any) => q.id) || [];
    // Shuffle and pick 5
    const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, 5);
    const matchId = `match_${Date.now()}`;
    const newMatch = {
      id: matchId,
      player1_id: playerId,
      player2_id: null,
      status: 'waiting',
      question_ids: shuffled,
      current_question: 0,
      player1_hp: 100,
      player2_hp: 100,
      player1_score: 0,
      player2_score: 0,
      winner_id: null
    };

    const { error } = await supabase.from('arena_matches').insert(newMatch);
    if (error) {
      console.error("Match creation error", error);
      return null;
    }
    return newMatch as any;
  },

  cancelMatchmaking: async (matchId) => {
    await supabase.from('arena_matches').delete().eq('id', matchId).in('status', ['waiting', 'challenged']);
  },

  challengeMatch: async (matchId, challengerId) => {
    await supabase.from('arena_matches')
      .update({ player2_id: challengerId, status: 'challenged' })
      .eq('id', matchId)
      .eq('status', 'waiting');
  },

  acceptMatch: async (matchId) => {
    await supabase.from('arena_matches')
      .update({ status: 'playing' })
      .eq('id', matchId)
      .eq('status', 'challenged');
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

}));

