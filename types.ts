
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string;
  className?: string; // For students
  savedPrompts?: string[]; // For teachers/admins
}

export interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
  semesters: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
}

export interface Class {
  id: string;
  name: string;
  academicYearId: string;
  teacherId: string;
  studentIds: string[];
}

export type QuestionType = 'MCQ' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP' | 'SHORT_ANSWER';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  imageUrl?: string;
  options: string[];
  correctOptionIndex?: number; // For MCQ
  solution?: string;
  hint?: string;
}

export type ExamDifficulty = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  difficulty: ExamDifficulty;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  status: 'DRAFT' | 'PUBLISHED';
  classId?: string; // If assigned to a specific class directly (or null for bank)
  questions: Question[];
}

export interface AssignmentSettings {
  viewScore: boolean;
  viewPassFail: boolean;
  viewSolution: boolean;
  viewHint: boolean;
  maxAttempts: number;
}

export interface Assignment {
  id: string;
  examId: string;
  classId: string;
  teacherId: string;
  createdAt: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  settings: AssignmentSettings;
}

export interface Attempt {
  id: string;
  examId: string;
  assignmentId?: string;
  studentId: string;
  answers: Record<string, number>;
  score: number | null;
  submittedAt: string;
  teacherFeedback?: string;
  feedbackAllowViewSolution?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export type WebResourceType = 'LINK' | 'EMBED';

export interface WebResource {
  id: string;
  title: string;
  url: string;
  type: WebResourceType;
  description?: string;
  addedBy: string;
  createdAt: string;
}

export type LiveSessionStatus = 'WAITING' | 'RUNNING' | 'FINISHED';

export interface LiveParticipant {
  studentId: string;
  name: string;
  progress: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    score: number;
  };
}

export interface LiveSession {
  id: string;
  examId: string;
  teacherId: string;
  status: LiveSessionStatus;
  participants: LiveParticipant[];
  createdAt: string;
}

// Discussion Types

export type ChatMessageType = 'TEXT' | 'STICKER' | 'IMAGE' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: ChatMessageType;
  timestamp: string;
  roomId: string; // 'MAIN' or breakout room ID
  roundId: string;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voterIds: string[];
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

export interface DiscussionRound {
  id: string;
  name: string;
  createdAt: string;
}

export interface DiscussionParticipant {
  studentId: string;
  name: string;
  isHandRaised: boolean;
  currentRoomId: string; // 'MAIN' or breakout room ID
}

export type MessageVisibility = 'FULL' | 'HIDDEN_ALL' | 'NAME_ONLY' | 'CONTENT_ONLY';
export type DiscussionStatus = 'ACTIVE' | 'FINISHED';

export interface DiscussionSession {
  id: string;
  title: string;
  teacherId: string;
  status: DiscussionStatus;
  participants: DiscussionParticipant[];
  messages: ChatMessage[];
  polls: Poll[];
  breakoutRooms: BreakoutRoom[];
  createdAt: string;
  rounds: DiscussionRound[];
  activeRoundId: string;
  visibility: MessageVisibility;
}

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
  isDataLoading: boolean;
  fetchInitialData: () => Promise<void>;

  user: User | null;
  setUser: (user: User | null) => void;

  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => Promise<boolean>;
  saveUserPrompt: (prompt: string) => void;
  changePassword: (userId: string, newPass: string) => Promise<boolean>;

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

  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  resources: WebResource[];
  addResource: (res: WebResource) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;

  liveSessions: LiveSession[];
  createLiveSession: (session: LiveSession) => void;
  joinLiveSession: (pin: string, user: User) => boolean;
  updateLiveSessionStatus: (id: string, status: LiveSessionStatus) => void;
  updateLiveParticipantProgress: (sessionId: string, studentId: string, progress: any) => void;

  discussionSessions: DiscussionSession[];
  createDiscussion: (session: DiscussionSession) => void;
  joinDiscussion: (pin: string, user: User) => boolean;
  sendDiscussionMessage: (sessionId: string, message: ChatMessage) => void;
  toggleHandRaise: (sessionId: string, userId: string) => void;
  createPoll: (sessionId: string, poll: Poll) => void;
  votePoll: (sessionId: string, pollId: string, optionId: string, userId: string) => void;
  togglePollStatus: (sessionId: string, pollId: string, isActive: boolean) => void;
  createBreakoutRooms: (sessionId: string, rooms: BreakoutRoom[]) => void;
  assignToRoom: (sessionId: string, userId: string, roomId: string) => void;
  createDiscussionRound: (sessionId: string, name: string) => void;
  setActiveRound: (sessionId: string, roundId: string) => void;
  setDiscussionVisibility: (sessionId: string, visibility: MessageVisibility) => void;
  endDiscussionSession: (sessionId: string) => void;
}
