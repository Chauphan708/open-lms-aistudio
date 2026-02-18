
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string; // For mock login
  savedPrompts?: string[]; // NEW: Saved AI prompts for teachers
}

export interface Semester {
  id: string;
  name: string; // "Học kì 1", "Học kì 2"
  startDate: string;
  endDate: string;
}

export interface AcademicYear {
  id: string;
  name: string; // "2023-2024"
  semesters: Semester[];
  isActive: boolean;
}

export interface Class {
  id: string;
  name: string; // "5A"
  teacherId: string;
  academicYearId: string;
  studentIds: string[];
}

// Updated to support advanced question types
export type QuestionType = 'MCQ' | 'ESSAY' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP' | 'SHORT_ANSWER';

export interface Question {
  id: string;
  type: QuestionType;
  content: string; // HTML or Markdown
  imageUrl?: string; // NEW: Link ảnh minh họa cho câu hỏi
  options: string[]; // For MCQ: ["A...", "B..."]; For Matching: ["Item 1 - Pair A", "Item 2 - Pair B"]
  correctOptionIndex?: number; // For MCQ
  solution?: string; // Lời giải chi tiết (có đáp án)
  hint?: string; // NEW: Gợi ý/Hướng dẫn phương pháp (KHÔNG có đáp án)
}

export type ExamDifficulty = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export interface Exam {
  id: string;
  title: string;
  subject: string; // New: Môn học (Toán, Tiếng Việt...)
  grade: string;   // New: Khối lớp (1, 2, 3, 4, 5)
  difficulty?: ExamDifficulty; // New: Mức độ (TT27)
  description?: string;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  questions: Question[];
  status: 'DRAFT' | 'PUBLISHED';
  classId?: string; // Optional: for exams created specifically inside a class context
}

export interface AssignmentSettings {
  viewScore: boolean;      // Xem điểm
  viewPassFail: boolean;   // Xem đúng/sai
  viewSolution: boolean;   // Xem lời giải chi tiết
  viewHint: boolean;       // NEW: Xem gợi ý làm bài
  maxAttempts: number;     // Số lần làm bài tối đa (0 = không giới hạn)
}

export interface Assignment {
  id: string;
  examId: string;
  classId: string;
  teacherId: string;
  createdAt: string;
  
  // Timing
  startTime?: string; // ISO Date
  endTime?: string;   // ISO Date
  durationMinutes?: number; // Override exam duration if set

  // Permissions
  settings: AssignmentSettings;
}

export interface Attempt {
  id: string;
  examId: string;
  assignmentId?: string; // Link to specific assignment
  studentId: string;
  answers: Record<string, number | string>; // questionId -> selectedIndex or text
  score?: number;
  submittedAt: string;
  teacherFeedback?: string; // NEW: Feedback from teacher (edited from AI)
  feedbackAllowViewSolution?: boolean; // NEW: Teacher overrides solution visibility when sending feedback
}

// --- NEW: Notification System ---
export interface Notification {
  id: string;
  userId: string; // Target user ID
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string; // Optional link to navigate to
}

// --- Live Exam Types ---
export type LiveSessionStatus = 'WAITING' | 'RUNNING' | 'FINISHED';

export interface LiveParticipant {
  studentId: string;
  name: string;
  status: 'JOINED' | 'DOING' | 'SUBMITTED';
  progress: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    score: number;
  };
  joinedAt: string;
}

export interface LiveSession {
  id: string; // The PIN code (e.g., "123456")
  examId: string;
  teacherId: string;
  status: LiveSessionStatus;
  participants: LiveParticipant[];
  createdAt: string;
}

// --- Discussion Room Types ---

export type MessageVisibility = 'FULL' | 'HIDDEN_ALL' | 'NAME_ONLY' | 'CONTENT_ONLY';

export interface DiscussionRound {
  id: string;
  name: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // Text or Sticker code
  type: 'TEXT' | 'IMAGE' | 'STICKER' | 'SYSTEM';
  timestamp: string;
  roomId: string; // 'MAIN' or breakout room ID
  roundId: string; // Associated round
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voterIds: string[]; // for tracking who voted what (unless anonymous)
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
}

export interface DiscussionParticipant {
  studentId: string;
  name: string;
  isHandRaised: boolean;
  currentRoomId: string; // 'MAIN' or breakout ID
  joinedAt: string;
}

export interface DiscussionSession {
  id: string; // PIN
  title: string;
  teacherId: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  participants: DiscussionParticipant[];
  messages: ChatMessage[];
  polls: Poll[];
  breakoutRooms: BreakoutRoom[];
  
  // New features
  rounds: DiscussionRound[];
  activeRoundId: string;
  visibility: MessageVisibility;
  
  createdAt: string;
}

// --- External API Types (Dictionary) ---
export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

export interface AppState {
  isDataLoading: boolean; // Global loading state
  fetchInitialData: () => Promise<void>;

  // Session
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Data
  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  saveUserPrompt: (prompt: string) => void; 

  academicYears: AcademicYear[];
  addAcademicYear: (year: AcademicYear) => void;
  updateAcademicYear: (year: AcademicYear) => void;

  classes: Class[];
  addClass: (cls: Class) => void;
  updateClass: (cls: Class) => void;

  exams: Exam[];
  addExam: (exam: Exam) => void;
  updateExam: (exam: Exam) => void;

  assignments: Assignment[];
  addAssignment: (assign: Assignment) => void;

  attempts: Attempt[];
  addAttempt: (attempt: Attempt) => void;
  updateAttemptFeedback: (attemptId: string, feedback: string, allowViewSolution: boolean) => void; 

  // Notifications
  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  // Live Sessions (Usually kept in realtime DB, but here local/memory for simplicity or simple DB polling)
  liveSessions: LiveSession[];
  createLiveSession: (session: LiveSession) => void;
  updateLiveSessionStatus: (pin: string, status: LiveSessionStatus) => void;
  joinLiveSession: (pin: string, student: User) => boolean;
  updateLiveParticipantProgress: (pin: string, studentId: string, progress: LiveParticipant['progress']) => void;

  // Discussion Rooms
  discussionSessions: DiscussionSession[];
  createDiscussion: (session: DiscussionSession) => void;
  joinDiscussion: (pin: string, student: User) => boolean;
  sendDiscussionMessage: (pin: string, message: ChatMessage) => void;
  toggleHandRaise: (pin: string, studentId: string) => void;
  createPoll: (pin: string, poll: Poll) => void;
  votePoll: (pin: string, pollId: string, optionId: string, studentId: string) => void;
  togglePollStatus: (pin: string, pollId: string, isActive: boolean) => void;
  createBreakoutRooms: (pin: string, rooms: BreakoutRoom[]) => void;
  assignToRoom: (pin: string, studentId: string, roomId: string) => void;
  
  // New Actions
  setDiscussionVisibility: (pin: string, visibility: MessageVisibility) => void;
  createDiscussionRound: (pin: string, roundName: string) => void;
  setActiveRound: (pin: string, roundId: string) => void;
  endDiscussionSession: (pin: string) => void;
}