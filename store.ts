import { create } from 'zustand';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound } from './types';

// --- Mock Data (Keep existing mock data) ---

const MOCK_USERS: User[] = [
  {
    id: 'admin1',
    name: 'System Admin',
    email: 'admin@school.edu',
    role: 'ADMIN',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
  },
  {
    id: 't1',
    name: 'Nguyen Van Teacher',
    email: 'teacher@openlms.edu',
    role: 'TEACHER',
    avatar: 'https://ui-avatars.com/api/?name=Teacher+Nguyen&background=random',
  },
  {
    id: 's1',
    name: 'Tran Van Student',
    email: 'student@openlms.edu',
    role: 'STUDENT',
    avatar: 'https://ui-avatars.com/api/?name=Student+Tran&background=random',
  },
  {
    id: 's2',
    name: 'Le Thi Hoa',
    email: 'hoa@openlms.edu',
    role: 'STUDENT',
    avatar: 'https://ui-avatars.com/api/?name=Le+Thi+Hoa&background=random',
  }
];

const MOCK_YEARS: AcademicYear[] = [
  {
    id: 'ay_23_24',
    name: '2023-2024',
    isActive: true,
    semesters: [
      { id: 'sem1', name: 'Học kì 1', startDate: '2023-09-05', endDate: '2024-01-15' },
      { id: 'sem2', name: 'Học kì 2', startDate: '2024-01-16', endDate: '2024-05-31' },
    ]
  }
];

const MOCK_CLASSES: Class[] = [
  {
    id: 'c1',
    name: '12A1',
    teacherId: 't1',
    academicYearId: 'ay_23_24',
    studentIds: ['s1', 's2']
  }
];

const MOCK_EXAMS: Exam[] = [
  {
    id: 'e1',
    title: 'Đề thi Toán 15 phút - Đại số',
    description: 'Kiểm tra chương 1 về hàm số.',
    durationMinutes: 15,
    questionCount: 2,
    createdAt: new Date().toISOString(),
    status: 'PUBLISHED',
    classId: 'c1', 
    questions: [
      {
        id: 'q1',
        type: 'MCQ',
        content: 'Tập xác định của hàm số y = (x-1)/(x+1) là:',
        options: ['R \\ {-1}', 'R \\ {1}', 'R', '(1; +∞)'],
        correctOptionIndex: 0,
        solution: 'Mẫu số khác 0 => x + 1 != 0 => x != -1'
      },
      {
        id: 'q2',
        type: 'MCQ',
        content: 'Cho hàm số y = f(x) có đạo hàm f\'(x) = x(x-1). Số điểm cực trị là:',
        options: ['1', '2', '0', '3'],
        correctOptionIndex: 1,
        solution: 'f\'(x)=0 <=> x=0 or x=1. Đổi dấu 2 lần -> 2 cực trị.'
      }
    ]
  }
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign_1',
    examId: 'e1',
    classId: 'c1',
    teacherId: 't1',
    createdAt: new Date().toISOString(),
    durationMinutes: 15,
    startTime: new Date().toISOString(), // Started just now
    settings: {
      viewScore: true,
      viewPassFail: true,
      viewSolution: true,
      maxAttempts: 1
    }
  }
];

export const useStore = create<AppState & { endDiscussionSession: (pin: string) => void }>((set) => ({
  // Session
  user: null,
  setUser: (user) => set({ user }),

  // Users
  users: MOCK_USERS,
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (updatedUser) => set((state) => ({
    users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u)
  })),

  // Academic Years
  academicYears: MOCK_YEARS,
  addAcademicYear: (year) => set((state) => ({ academicYears: [...state.academicYears, year] })),
  updateAcademicYear: (updatedYear) => set((state) => ({
    academicYears: state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : y)
  })),

  // Classes
  classes: MOCK_CLASSES,
  addClass: (cls) => set((state) => ({ classes: [...state.classes, cls] })),
  updateClass: (updatedClass) => set((state) => ({
    classes: state.classes.map(c => c.id === updatedClass.id ? updatedClass : c)
  })),

  // Exams
  exams: MOCK_EXAMS,
  addExam: (exam) => set((state) => ({ exams: [exam, ...state.exams] })),
  updateExam: (updatedExam) => set((state) => ({
    exams: state.exams.map((e) => e.id === updatedExam.id ? updatedExam : e)
  })),

  // Assignments
  assignments: MOCK_ASSIGNMENTS,
  addAssignment: (assign) => set((state) => ({ assignments: [assign, ...state.assignments] })),

  // Attempts
  attempts: [],
  addAttempt: (attempt) => set((state) => ({ attempts: [...state.attempts, attempt] })),

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
      if (sessionIndex === -1) {
        return state;
      }
      
      const session = state.liveSessions[sessionIndex];
      // Check if already joined
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
           // Check if already voted
           const hasVoted = p.options.some(o => o.voterIds.includes(studentId));
           if (hasVoted) return p; // Only 1 vote per poll allowed

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

  // New Actions for Advanced Discussion Features
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
        activeRoundId: newRound.id // Auto switch to new round
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
