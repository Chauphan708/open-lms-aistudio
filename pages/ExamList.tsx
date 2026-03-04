import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, ChevronRight, Send, Radio, Search, Filter, Calendar, BookOpen, GraduationCap, X, Layers, BarChart3, HelpCircle, LineChart, Edit2, Trash2, RotateCcw, Save, Plus, AlertCircle, BrainCircuit, Lightbulb } from 'lucide-react';
import { AssignModal } from '../components/AssignModal';
import { Exam, LiveSession, QuestionType, ExamDifficulty, Question } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// --- Full Edit Modal Component ---
const EditExamModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  onSave: (updated: Exam) => void;
}> = ({ isOpen, onClose, exam, onSave }) => {
  const [editedExam, setEditedExam] = useState<Exam | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('MCQ');

  React.useEffect(() => {
    if (exam) {
      setEditedExam(JSON.parse(JSON.stringify(exam))); // Deep copy
    }
  }, [exam, isOpen]);

  if (!isOpen || !editedExam) return null;

  const handleSaveAll = () => {
    onSave(editedExam);
    onClose();
  };

  const removeQuestion = (qid: string) => {
    setEditedExam({
      ...editedExam,
      questions: editedExam.questions.filter(q => q.id !== qid),
      questionCount: editedExam.questionCount - 1
    });
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: `new_${Date.now()}`,
      type: newQuestionType,
      content: 'Nội dung câu hỏi mới...',
      options: newQuestionType === 'MCQ' ? ['A', 'B', 'C', 'D'] : [],
      correctOptionIndex: newQuestionType === 'MCQ' ? 0 : undefined,
      solution: '',
      hint: '',
    };
    setEditedExam({
      ...editedExam,
      questions: [...editedExam.questions, newQ],
      questionCount: editedExam.questionCount + 1
    });
    setEditingQuestion(newQ);
  };

  const updateQuestion = (updated: Question) => {
    setEditedExam({
      ...editedExam,
      questions: editedExam.questions.map(q => q.id === updated.id ? updated : q)
    });
    setEditingQuestion(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chi tiết & Chỉnh sửa bài tập</h2>
            <p className="text-xs text-gray-500">Quản lý nội dung câu hỏi và đáp án</p>
          </div>
          <button onClick={onClose} className="hover:bg-gray-200 p-2 rounded-full transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Tên bài tập</label>
              <input
                type="text"
                value={editedExam.title}
                onChange={e => setEditedExam({ ...editedExam, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Môn học</label>
                <input
                  type="text"
                  value={editedExam.subject || ''}
                  onChange={e => setEditedExam({ ...editedExam, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Lớp</label>
                <input
                  type="text"
                  value={editedExam.grade || ''}
                  onChange={e => setEditedExam({ ...editedExam, grade: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white py-2 sticky top-0 z-10 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Danh sách câu hỏi ({editedExam.questions.length})
            </h3>
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border">
              <select
                value={newQuestionType}
                onChange={e => setNewQuestionType(e.target.value as QuestionType)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="MCQ">Trắc nghiệm (ABCD)</option>
                <option value="SHORT_ANSWER">Tự luận ngắn</option>
                <option value="MATCHING">Nối cột</option>
                <option value="ORDERING">Sắp xếp</option>
                <option value="DRAG_DROP">Kéo thả</option>
              </select>
              <button
                onClick={addQuestion}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-100"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm câu
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {editedExam.questions.map((q: Question, idx: number) => (
              <div key={q.id} className="group border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all relative shadow-sm">
                <div className="absolute right-4 top-4 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingQuestion(q)} className="p-2 bg-white text-gray-400 hover:text-indigo-600 rounded-full border shadow-sm hover:border-indigo-100 transition-all"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => removeQuestion(q.id)} className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-full border shadow-sm hover:border-red-100 transition-all"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</span>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{q.type}</span>
                      {q.level && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{q.level}</span>}
                    </div>
                    <p className="text-gray-900 font-medium whitespace-pre-wrap leading-relaxed pr-16">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                    </p>
                    {q.type === 'MCQ' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className={`text-sm py-2 px-3 rounded-lg border transition-all flex items-center gap-2 ${q.correctOptionIndex === oIdx ? 'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm' : 'bg-white border-gray-100 text-gray-600'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${q.correctOptionIndex === oIdx ? 'bg-green-200 text-green-700' : 'bg-gray-100'}`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'SHORT_ANSWER' && q.options && q.options.length > 0 && (
                      <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-green-600 uppercase mb-2">Đáp án máy chấm:</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((ans: string, aIdx: number) => (
                            <span key={aIdx} className="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{ans}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(q.solution || q.hint) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {q.hint && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                            <span className="font-bold flex items-center gap-1 mb-1"><Lightbulb className="h-3 w-3" /> Gợi ý</span>
                            <div className="leading-relaxed opacity-90">{q.hint}</div>
                          </div>
                        )}
                        {q.solution && (
                          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900">
                            <span className="font-bold flex items-center gap-1 mb-1"><BrainCircuit className="h-3 w-3" /> Lời giải chi tiết</span>
                            <div className="leading-relaxed opacity-90">{q.solution}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {editedExam.questions.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <div className="bg-gray-200/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-bold text-gray-900">Chưa có câu hỏi nào</p>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">Hãy thêm câu hỏi mới hoặc sử dụng tính năng tách câu hỏi từ file để bắt đầu.</p>
                <button onClick={addQuestion} className="mt-6 bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" /> Thêm câu hỏi đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-200 transition-all">Đóng</button>
          <button
            onClick={handleSaveAll}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Lưu tất cả thay đổi
          </button>
        </div>
      </div>

      {/* Nested Question Edit Modal (Manual Entry Style) */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-zoom-in">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-xl text-gray-900">Chỉnh sửa chi tiết câu hỏi</h3>
              <button onClick={() => setEditingQuestion(null)} className="hover:bg-gray-100 p-2 rounded-full text-gray-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi</label>
                <textarea
                  value={editingQuestion.content}
                  onChange={e => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-32 transition-all"
                />
              </div>

              {editingQuestion.type === 'MCQ' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex justify-between items-center">
                    Các lựa chọn (ABCD)
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, ''] })}
                      className="text-xs text-indigo-600 font-bold hover:underline py-1 px-2 rounded-lg hover:bg-indigo-50"
                    >
                      + Thêm lựa chọn
                    </button>
                  </label>
                  <div className="space-y-3">
                    {editingQuestion.options.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 animate-slide-in">
                        <button
                          onClick={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: i })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all border-2
                            ${editingQuestion.correctOptionIndex === i ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-200'}
                          `}
                        >
                          {String.fromCharCode(65 + i)}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[i] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          className="flex-1 border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                          placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}...`}
                        />
                        <button onClick={() => setEditingQuestion({ ...editingQuestion, options: editingQuestion.options.filter((_: any, oI: number) => oI !== i) })} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingQuestion.type === 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex justify-between items-center">
                    Đáp án đúng (Chấp nhận nhiều biến thể)
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, options: [...(editingQuestion.options || []), ''] })}
                      className="text-xs text-indigo-600 font-bold hover:underline py-1 px-2 rounded-lg hover:bg-indigo-50"
                    >
                      + Thêm đáp án
                    </button>
                  </label>
                  <div className="space-y-3">
                    {editingQuestion.options.map((opt: string, i: number) => (
                      <div key={i} className="flex gap-2 animate-slide-in">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[i] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          className="flex-1 border border-gray-200 rounded-xl p-3 bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                          placeholder="Ví dụ: 4500 hoặc 4.500..."
                        />
                        <button onClick={() => setEditingQuestion({ ...editingQuestion, options: editingQuestion.options.filter((_: any, oI: number) => oI !== i) })} className="p-3 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {editingQuestion.options.length === 0 && (
                      <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Lưu ý: Nếu trống, máy sẽ so khớp với nội dung Lời giải chi tiết.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Gợi ý (Hint)</label>
                  <textarea
                    value={editingQuestion.hint || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, hint: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm transition-all"
                    placeholder="Hướng dẫn phương pháp giải..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lời giải chi tiết</label>
                  <textarea
                    value={editingQuestion.solution || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, solution: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50/50 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm transition-all"
                    placeholder="Các bước giải chi tiết..."
                  />
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white -mx-8 px-8 pb-4">
                <button onClick={() => setEditingQuestion(null)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-all">Huỷ bỏ</button>
                <button
                  onClick={() => updateQuestion(editingQuestion)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Cập nhật câu hỏi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ExamList: React.FC = () => {
  const { exams, assignments, user, classes, createLiveSession, updateExam, softDeleteExam, restoreExam } = useStore();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [fullEditExam, setFullEditExam] = useState<Exam | null>(null);
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const navigate = useNavigate();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subjects = useMemo(() => Array.from(new Set(exams.map(e => e.subject).filter(Boolean))), [exams]);
  const topics = useMemo(() => Array.from(new Set(exams.map(e => e.topic).filter(Boolean))) as string[], [exams]);
  const grades = useMemo(() => Array.from(new Set(exams.map(e => e.grade).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [exams]);

  const handleOpenAssign = (exam: Exam) => {
    setSelectedExam(exam);
    setAssignModalOpen(true);
  };

  const handleHostLive = (exam: Exam) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit PIN
    const newSession: LiveSession = {
      id: pin,
      examId: exam.id,
      teacherId: user?.id || '',
      status: 'WAITING',
      participants: [],
      createdAt: new Date().toISOString()
    };
    createLiveSession(newSession);
    navigate(`/live/host/${pin}`);
  };

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Exclude soft-deleted exams from main view
      if (exam.deletedAt) return false;

      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = filterSubject ? exam.subject === filterSubject : true;
      const matchesGrade = filterGrade ? exam.grade === filterGrade : true;
      const matchesTopic = filterTopic ? exam.topic === filterTopic : true;
      const matchesDate = filterDate ? exam.createdAt.startsWith(filterDate) : true;
      const matchesDifficulty = filterDifficulty ? exam.difficulty === filterDifficulty : true;

      let matchesDuration = true;
      if (filterDuration) {
        if (filterDuration === '<15') matchesDuration = exam.durationMinutes < 15;
        else if (filterDuration === '15-45') matchesDuration = exam.durationMinutes >= 15 && exam.durationMinutes <= 45;
        else if (filterDuration === '>45') matchesDuration = exam.durationMinutes > 45;
      }

      let matchesType = true;
      if (filterQuestionType) {
        // Check if any question in exam matches the selected type
        matchesType = exam.questions.some(q => q.type === filterQuestionType);
      }

      return matchesSearch && matchesSubject && matchesGrade && matchesTopic && matchesDate && matchesDuration && matchesDifficulty && matchesType;
    });
  }, [exams, searchTerm, filterSubject, filterGrade, filterTopic, filterDate, filterDuration, filterDifficulty, filterQuestionType]);

  const trashedExams = useMemo(() => exams.filter(e => e.deletedAt), [exams]);

  const handleStartEdit = (exam: Exam) => {
    setFullEditExam(exam);
    setIsFullEditModalOpen(true);
  };

  const handleSaveFullEdit = (updated: Exam) => {
    updateExam(updated);
    setIsFullEditModalOpen(false);
  };

  const getDifficultyLabel = (diff: ExamDifficulty | undefined) => {
    switch (diff) {
      case 'LEVEL_1': return { label: 'Mức 1', color: 'bg-green-100 text-green-700' };
      case 'LEVEL_2': return { label: 'Mức 2', color: 'bg-yellow-100 text-yellow-700' };
      case 'LEVEL_3': return { label: 'Mức 3', color: 'bg-red-100 text-red-700' };
      default: return { label: 'Khác', color: 'bg-gray-100 text-gray-500' };
    }
  };

  // --- STUDENT VIEW: Show Assignments ---
  if (user?.role === 'STUDENT') {
    // 1. Get student's classes
    const myClassIds = classes
      .filter(c => c.studentIds.includes(user.id))
      .map(c => c.id);

    // 2. Filter assignments for these classes
    const myAssignments = assignments
      .filter(a => myClassIds.includes(a.classId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bài tập & Thi cử</h1>
          <Link to="/live/join" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap">
            <Radio className="h-4 w-4" /> Nhập mã PIN (Thi Live)
          </Link>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {myAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Bạn chưa có bài tập nào được giao.
            </div>
          ) : (
            <div className="divide-y">
              {myAssignments.map((assign) => {
                const exam = exams.find(e => e.id === assign.examId);
                const cls = classes.find(c => c.id === assign.classId);
                if (!exam) return null;

                // Check Time
                const now = new Date();
                const start = assign.startTime ? new Date(assign.startTime) : null;
                const end = assign.endTime ? new Date(assign.endTime) : null;

                const isUpcoming = start && now < start;
                const isExpired = end && now > end;
                const isAvailable = !isUpcoming && !isExpired;

                return (
                  <div key={assign.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0
                        ${isAvailable ? 'bg-indigo-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-400'}
                      `}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{exam.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {assign.durationMinutes || exam.durationMinutes} phút
                          </span>
                          <span>• Lớp {cls?.name}</span>
                          {assign.endTime && (
                            <span className={isExpired ? 'text-red-500 font-medium' : ''}>
                              • Hạn chót: {new Date(assign.endTime).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/exam/${exam.id}/take?assign=${assign.id}`}
                        className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                      >
                        Làm bài ngay <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button disabled className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 rounded-lg whitespace-nowrap">
                        {isUpcoming ? 'Chưa mở' : 'Đã kết thúc'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TEACHER / ADMIN VIEW: Show Question Bank + Assign Button ---
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ngân hàng bài tập</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm bài tập..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white hover:bg-gray-50'}`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-5 rounded-xl border shadow-sm mb-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {/* 1. Subject */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Môn học</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* 2. Grade */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Khối lớp</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
            </div>
            {/* 3. Difficulty */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Mức độ</label>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="LEVEL_1">Mức 1</option>
                  <option value="LEVEL_2">Mức 2</option>
                  <option value="LEVEL_3">Mức 3</option>
                </select>
              </div>
            </div>
            {/* 3.5 Topic */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">C.Đề / Nội dung</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {topics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {/* 4. Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Thời gian</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDuration} onChange={e => setFilterDuration(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="<15">&lt; 15 phút</option>
                  <option value="15-45">15 - 45 phút</option>
                  <option value=">45">&gt; 45 phút</option>
                </select>
              </div>
            </div>
            {/* 5. Question Type */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Loại câu hỏi</label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterQuestionType} onChange={e => setFilterQuestionType(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="MCQ">Trắc nghiệm (4 LC)</option>
                  <option value="MATCHING">Nối cột</option>
                  <option value="ORDERING">Sắp xếp</option>
                  <option value="SHORT_ANSWER">Tự luận</option>
                </select>
              </div>
            </div>
            {/* 6. Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ngày tạo</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <input
                  type="date"
                  value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex justify-end">
            <button
              onClick={() => {
                setFilterSubject(''); setFilterGrade(''); setFilterDate(''); setFilterTopic('');
                setSearchTerm(''); setFilterDuration(''); setFilterDifficulty(''); setFilterQuestionType('');
              }}
              className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Không tìm thấy bài tập nào.</p>
            <p className="text-sm">Thử thay đổi bộ lọc hoặc tạo bài tập mới.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between group gap-4">
                <div className="flex gap-4">
                  <div className="h-14 w-14 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center text-indigo-700 flex-shrink-0">
                    <span className="text-xs font-bold uppercase">{exam.grade ? `Lớp ${exam.grade}` : 'K.Hợp'}</span>
                    <span className="text-[10px] text-gray-500">{exam.subject?.substring(0, 6) || 'Chung'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                      {exam.difficulty && (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getDifficultyLabel(exam.difficulty).color}`}>
                          {getDifficultyLabel(exam.difficulty).label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.durationMinutes} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {exam.questionCount} câu
                      </span>
                      <span>• {new Date(exam.createdAt).toLocaleDateString('vi-VN')}</span>
                      {exam.subject && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{exam.subject}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {user?.role === 'TEACHER' && (
                    <>
                      {/* New Results Button */}
                      <Link
                        to={`/exam/${exam.id}/results`}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-100"
                        title="Xem kết quả và thống kê"
                      >
                        <LineChart className="h-4 w-4" /> <span className="hidden sm:inline">Kết quả</span>
                      </Link>

                      <button
                        onClick={() => handleHostLive(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-pink-700 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors border border-pink-100"
                        title="Tổ chức thi Live (Tại lớp)"
                      >
                        <Radio className="h-4 w-4" /> <span className="hidden sm:inline">Tổ chức thi</span>
                      </button>
                      <button
                        onClick={() => handleOpenAssign(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                        title="Giao bài tập về nhà"
                      >
                        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Giao bài</span>
                      </button>
                    </>
                  )}
                  {/* Teachers/Admins can preview/try the exam */}
                  <Link
                    to={`/exam/${exam.id}/take`}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                  >
                    Xem thử
                  </Link>
                  {user?.role === 'TEACHER' && (
                    <>
                      <button
                        onClick={() => handleStartEdit(exam)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Chỉnh sửa bài tập"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {deletingId === exam.id ? (
                        <div className="flex items-center gap-1 animate-fade-in">
                          <button onClick={() => { softDeleteExam(exam.id); setDeletingId(null); }}
                            className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600">Xoá</button>
                          <button onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Huỷ</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(exam.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá bài tập (vào thùng rác)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trash Section */}
      {user?.role === 'TEACHER' && (
        <div className="mt-6">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <Trash2 className="h-4 w-4" />
            Thùng rác ({trashedExams.length})
          </button>
          {showTrash && trashedExams.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 divide-y">
              {trashedExams.map(exam => (
                <div key={exam.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-500 truncate">{exam.title}</p>
                      <p className="text-xs text-gray-400">Xoá: {new Date(exam.deletedAt!).toLocaleString('vi-VN')} • {exam.questionCount} câu</p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreExam(exam.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-100 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Khôi phục
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedExam && (
        <AssignModal
          exam={selectedExam}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
        />
      )}

      <EditExamModal
        isOpen={isFullEditModalOpen}
        onClose={() => setIsFullEditModalOpen(false)}
        exam={fullEditExam}
        onSave={handleSaveFullEdit}
      />
    </div>
  );
};