
import { create } from 'zustand';
import { AppState, User, AcademicYear, Class, Exam, Assignment, Attempt, Notification, WebResource, LiveSession, DiscussionSession } from './types';
import { supabase } from './services/supabaseClient';

export const useStore = create<AppState>((set, get) => ({
  isDataLoading: false,
  fetchInitialData: async () => {
    // In a real app, fetch from Supabase here
    // For now, we rely on initial state or local updates
    set({ isDataLoading: false });
  },

  user: null,
  setUser: (user) => set({ user }),

  users: [
      { id: 'admin_1', name: 'Admin User', email: 'admin@school.edu', role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=Admin', password: '123' },
      { id: 't_1', name: 'Cô giáo Thảo', email: 'teacher@school.edu', role: 'TEACHER', avatar: 'https://ui-avatars.com/api/?name=Teacher', password: '123' },
      { id: 's_1', name: 'Học sinh A', email: 'student@school.edu', role: 'STUDENT', avatar: 'https://ui-avatars.com/api/?name=Student+A', className: '5A', password: '123' },
  ],
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (user) => set((state) => ({ users: state.users.map((u) => (u.id === user.id ? user : u)) })),
  deleteUser: async (userId) => {
      set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
      return true;
  },
  saveUserPrompt: (prompt) => set((state) => {
      if (!state.user) return state;
      const savedPrompts = state.user.savedPrompts || [];
      if (savedPrompts.includes(prompt)) return state;
      const updatedUser = { ...state.user, savedPrompts: [...savedPrompts, prompt] };
      return { user: updatedUser, users: state.users.map(u => u.id === state.user!.id ? updatedUser : u) };
  }),
  changePassword: async (userId, newPass) => {
      set((state) => ({ users: state.users.map(u => u.id === userId ? { ...u, password: newPass } : u) }));
      return true;
  },

  academicYears: [
      { id: 'ay_1', name: '2023-2024', isActive: true, semesters: [{ id: 's1', name: 'HK1', startDate: '2023-09-05', endDate: '2024-01-15' }, { id: 's2', name: 'HK2', startDate: '2024-01-16', endDate: '2024-05-30' }] }
  ],
  addAcademicYear: (year) => set((state) => ({ academicYears: [...state.academicYears, year] })),
  updateAcademicYear: (year) => set((state) => ({ academicYears: state.academicYears.map((y) => (y.id === year.id ? year : y)) })),

  classes: [
      { id: 'c_1', name: '5A', academicYearId: 'ay_1', teacherId: 't_1', studentIds: ['s_1'] }
  ],
  addClass: (cls) => set((state) => ({ classes: [...state.classes, cls] })),
  updateClass: (cls) => set((state) => ({ classes: state.classes.map((c) => (c.id === cls.id ? cls : c)) })),

  exams: [],
  addExam: (exam) => set((state) => ({ exams: [...state.exams, exam] })),
  updateExam: (exam) => set((state) => ({ exams: state.exams.map((e) => (e.id === exam.id ? exam : e)) })),

  assignments: [],
  addAssignment: (assign) => set((state) => ({ assignments: [...state.assignments, assign] })),

  attempts: [],
  addAttempt: (attempt) => set((state) => ({ attempts: [...state.attempts, attempt] })),
  updateAttemptFeedback: (attemptId, feedback, allowViewSolution) => set((state) => ({
      attempts: state.attempts.map((a) => (a.id === attemptId ? { ...a, teacherFeedback: feedback, feedbackAllowViewSolution: allowViewSolution } : a))
  })),

  notifications: [],
  addNotification: (notif) => set((state) => ({ notifications: [notif, ...state.notifications] })),
  markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
  })),
  markAllNotificationsRead: (userId) => set((state) => ({
      notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, isRead: true } : n))
  })),

  resources: [],
  addResource: async (res) => {
      // Optimistic update
      set((state) => ({ resources: [res, ...state.resources] }));
      // Try Supabase (if configured)
      try {
        const { error } = await supabase.from('resources').insert(res);
        if (error) console.warn("Supabase insert failed (using local store):", error.message);
      } catch (e) {
         // ignore
      }
      return true;
  },
  deleteResource: async (id) => {
      set((state) => ({ resources: state.resources.filter((r) => r.id !== id) }));
      try {
        await supabase.from('resources').delete().eq('id', id);
      } catch (e) {
          // ignore
      }
      return true;
  },

  liveSessions: [],
  createLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  joinLiveSession: (pin, user) => {
      const session = get().liveSessions.find(s => s.id === pin);
      if (!session) return false;
      if (session.status === 'FINISHED') return false;

      // Add user to participants if not exists
      if (!session.participants.some(p => p.studentId === user.id)) {
          const newParticipant = {
              studentId: user.id,
              name: user.name,
              progress: { answeredCount: 0, correctCount: 0, wrongCount: 0, score: 0 }
          };
          const updatedSession = { ...session, participants: [...session.participants, newParticipant] };
          set(state => ({ liveSessions: state.liveSessions.map(s => s.id === pin ? updatedSession : s) }));
      }
      return true;
  },
  updateLiveSessionStatus: (id, status) => set((state) => ({
      liveSessions: state.liveSessions.map(s => s.id === id ? { ...s, status } : s)
  })),
  updateLiveParticipantProgress: (sessionId, studentId, progress) => set((state) => ({
      liveSessions: state.liveSessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              participants: s.participants.map(p => p.studentId === studentId ? { ...p, progress } : p)
          };
      })
  })),

  discussionSessions: [],
  createDiscussion: (session) => set((state) => ({ discussionSessions: [...state.discussionSessions, session] })),
  joinDiscussion: (pin, user) => {
      const session = get().discussionSessions.find(s => s.id === pin);
      if (!session) return false;

       // Add user if not exists
       if (!session.participants.some(p => p.studentId === user.id)) {
          const newParticipant = {
              studentId: user.id,
              name: user.name,
              isHandRaised: false,
              currentRoomId: 'MAIN'
          };
          const updatedSession = { ...session, participants: [...session.participants, newParticipant] };
          set(state => ({ discussionSessions: state.discussionSessions.map(s => s.id === pin ? updatedSession : s) }));
      }
      return true;
  },
  sendDiscussionMessage: (sessionId, message) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => {
          if (s.id !== sessionId) return s;
          return { ...s, messages: [...s.messages, message] };
      })
  })),
  toggleHandRaise: (sessionId, userId) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              participants: s.participants.map(p => p.studentId === userId ? { ...p, isHandRaised: !p.isHandRaised } : p)
          };
      })
  })),
  createPoll: (sessionId, poll) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { ...s, polls: [...s.polls, poll] } : s)
  })),
  votePoll: (sessionId, pollId, optionId, userId) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              polls: s.polls.map(p => {
                  if (p.id !== pollId) return p;
                  // Remove previous vote if any (assuming single choice for now, logic can vary)
                  // For simplicity: add to voterIds of selected option, ensure uniqueness in logic if needed
                  // Logic: Allow one vote per poll
                  const hasVoted = p.options.some(o => o.voterIds.includes(userId));
                  if (hasVoted) return p; // Prevent multiple votes

                  return {
                      ...p,
                      options: p.options.map(o => o.id === optionId ? { ...o, voteCount: o.voteCount + 1, voterIds: [...o.voterIds, userId] } : o)
                  };
              })
          };
      })
  })),
  togglePollStatus: (sessionId, pollId, isActive) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              polls: s.polls.map(p => p.id === pollId ? { ...p, isActive } : p)
          };
      })
  })),
  createBreakoutRooms: (sessionId, rooms) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { ...s, breakoutRooms: rooms } : s)
  })),
  assignToRoom: (sessionId, userId, roomId) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
              ...s,
              participants: s.participants.map(p => p.studentId === userId ? { ...p, currentRoomId: roomId } : p)
          };
      })
  })),
  createDiscussionRound: (sessionId, name) => set((state) => {
      const session = state.discussionSessions.find(s => s.id === sessionId);
      if (!session) return state;
      const newRound = { id: `round_${Date.now()}`, name, createdAt: new Date().toISOString() };
      return {
          discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { 
              ...s, 
              rounds: [...s.rounds, newRound],
              activeRoundId: newRound.id // Auto switch
          } : s)
      };
  }),
  setActiveRound: (sessionId, roundId) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { ...s, activeRoundId: roundId } : s)
  })),
  setDiscussionVisibility: (sessionId, visibility) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { ...s, visibility } : s)
  })),
  endDiscussionSession: (sessionId) => set((state) => ({
      discussionSessions: state.discussionSessions.map(s => s.id === sessionId ? { ...s, status: 'FINISHED' } : s)
  })),

}));
