
import { create } from 'zustand';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound, Notification } from './types';
import { supabase } from './services/supabaseClient';

// Fallback Mock Data in case Supabase is empty (for seeding first time)
const SEED_USERS: User[] = [
    { id: 'admin1', name: 'System Admin', email: 'admin@school.edu', role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff', password: '123' },
    { id: 't1', name: 'Nguyen Van Teacher', email: 'teacher@openlms.edu', role: 'TEACHER', avatar: 'https://ui-avatars.com/api/?name=Teacher+Nguyen&background=random', savedPrompts: ["Phân tích lỗi sai ngữ pháp"], password: '123' },
    { id: 's1', name: 'Tran Van Student', email: 'student@openlms.edu', role: 'STUDENT', avatar: 'https://ui-avatars.com/api/?name=Student+Tran&background=random', password: '123' },
];

export const useStore = create<AppState & { endDiscussionSession: (pin: string) => void }>((set, get) => ({
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
            // Seed if empty
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

    } catch (e) {
        console.error("Error fetching initial data:", e);
    } finally {
        set({ isDataLoading: false });
    }
  },

  // Session
  user: null,
  setUser: (user) => set({ user }),

  // Users
  users: [],
  addUser: async (user) => {
    const { error } = await supabase.from('profiles').insert(user);
    if (!error) set((state) => ({ users: [...state.users, user] }));
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
      if (error) {
          console.error("Change pass error", error);
          return false;
      }
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
    
    // Update Supabase
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
      if(!error) set((state) => ({
        academicYears: state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : y)
      }));
  },

  // Classes
  classes: [],
  addClass: async (cls) => {
      const { error } = await supabase.from('classes').insert(cls);
      if(!error) set((state) => ({ classes: [...state.classes, cls] }));
  },
  updateClass: async (updatedClass) => {
      const { error } = await supabase.from('classes').update(updatedClass).eq('id', updatedClass.id);
      if(!error) set((state) => ({
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
      if(!error) set((state) => ({
        exams: state.exams.map((e) => e.id === updatedExam.id ? updatedExam : e)
      }));
  },

  // Assignments
  assignments: [],
  addAssignment: async (assign) => {
    // 1. Save to DB
    const { error } = await supabase.from('assignments').insert(assign);
    if (error) return;

    set((state) => ({ assignments: [assign, ...state.assignments] }));

    // 2. Notify Students (Sync with DB)
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
      if(!error) set((state) => ({ attempts: [...state.attempts, attempt] }));
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

      // Notify Student
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

  // --- MEMORY ONLY (Realtime features usually use Supabase Realtime Channels, but keeping memory for MVP) ---
  
  // Live Sessions
  liveSessions: [],
  createLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  
  updateLiveSessionStatus: (pin, status) => set((state) => ({
    liveSessions: state.liveSessions.map(s => s.id === pin ? { ...s, status } : s)
  })),

  joinLiveSession: (pin, student) => {
    let joined = false;
    set((state) => {
      const sessionIndex = state.liveSessions.findIndex(s => s.id === pin);
      if (sessionIndex === -1) return state;
      
      const session = state.liveSessions[sessionIndex];
      if (session.participants.some(p => p.studentId === student.id)) {
        joined = true;
        return state;
      }

      const updatedSession: LiveSession = {
        ...session,
        participants: [
          ...session.participants,
          {
            studentId: student.id,
            name: student.name,
            status: 'JOINED',
            joinedAt: new Date().toISOString(),
            progress: { answeredCount: 0, correctCount: 0, wrongCount: 0, score: 0 }
          }
        ]
      };
      
      const newSessions = [...state.liveSessions];
      newSessions[sessionIndex] = updatedSession;
      joined = true;
      return { liveSessions: newSessions };
    });
    return joined;
  },

  updateLiveParticipantProgress: (pin, studentId, progress) => set((state) => ({
    liveSessions: state.liveSessions.map(s => {
      if (s.id !== pin) return s;
      return {
        ...s,
        participants: s.participants.map(p => {
          if (p.studentId !== studentId) return p;
          return {
            ...p,
            status: 'DOING',
            progress
          };
        })
      };
    })
  })),

  // Discussion Sessions
  discussionSessions: [],
  createDiscussion: (session) => set((state) => ({ discussionSessions: [...state.discussionSessions, session] })),
  
  joinDiscussion: (pin, student) => {
     let joined = false;
     set((state) => {
       const idx = state.discussionSessions.findIndex(s => s.id === pin);
       if (idx === -1) return state;

       const session = state.discussionSessions[idx];
       if (session.participants.some(p => p.studentId === student.id)) {
         joined = true;
         return state;
       }

       const newSessions = [...state.discussionSessions];
       newSessions[idx] = {
         ...session,
         participants: [...session.participants, {
            studentId: student.id,
            name: student.name,
            isHandRaised: false,
            currentRoomId: 'MAIN',
            joinedAt: new Date().toISOString()
         }]
       };
       joined = true;
       return { discussionSessions: newSessions };
     });
     return joined;
  },

  sendDiscussionMessage: (pin, message) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
       s.id === pin ? { ...s, messages: [...s.messages, message] } : s
    )
  })),

  toggleHandRaise: (pin, studentId) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => {
       if (s.id !== pin) return s;
       return {
         ...s,
         participants: s.participants.map(p => 
            p.studentId === studentId ? { ...p, isHandRaised: !p.isHandRaised } : p
         )
       };
    })
  })),

  createPoll: (pin, poll) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
      s.id === pin ? { ...s, polls: [poll, ...s.polls] } : s
    )
  })),

  votePoll: (pin, pollId, optionId, studentId) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => {
      if (s.id !== pin) return s;
      return {
        ...s,
        polls: s.polls.map(p => {
           if (p.id !== pollId || !p.isActive) return p;
           const hasVoted = p.options.some(o => o.voterIds.includes(studentId));
           if (hasVoted) return p; 

           return {
             ...p,
             options: p.options.map(o => 
               o.id === optionId ? { ...o, voteCount: o.voteCount + 1, voterIds: [...o.voterIds, studentId] } : o
             )
           };
        })
      };
    })
  })),

  togglePollStatus: (pin, pollId, isActive) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => {
      if (s.id !== pin) return s;
      return {
        ...s,
        polls: s.polls.map(p => p.id === pollId ? { ...p, isActive } : p)
      };
    })
  })),

  createBreakoutRooms: (pin, rooms) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
      s.id === pin ? { ...s, breakoutRooms: rooms } : s
    )
  })),

  assignToRoom: (pin, studentId, roomId) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => {
       if (s.id !== pin) return s;
       return {
         ...s,
         participants: s.participants.map(p => 
           p.studentId === studentId ? { ...p, currentRoomId: roomId } : p
         )
       };
    })
  })),

  setDiscussionVisibility: (pin, visibility) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
      s.id === pin ? { ...s, visibility } : s
    )
  })),

  createDiscussionRound: (pin, roundName) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => {
      if (s.id !== pin) return s;
      const newRound: DiscussionRound = {
        id: `round_${Date.now()}`,
        name: roundName,
        createdAt: new Date().toISOString()
      };
      return {
        ...s,
        rounds: [...s.rounds, newRound],
        activeRoundId: newRound.id 
      };
    })
  })),

  setActiveRound: (pin, roundId) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
      s.id === pin ? { ...s, activeRoundId: roundId } : s
    )
  })),

  endDiscussionSession: (pin) => set((state) => ({
    discussionSessions: state.discussionSessions.map(s => 
      s.id === pin ? { ...s, status: 'FINISHED' } : s
    )
  }))

}));
