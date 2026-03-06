import React, { useState } from 'react';
import { useStore } from '../store';
import { parseQuestionsFromText, generateQuestionsByTopic } from '../services/geminiService';
import { parseQuestionsLocal } from '../utils/localParser';
import { Question, QuestionType, ExamDifficulty } from '../types';
import { Wand2, Save, Trash2, Plus, AlertCircle, FilePlus, BrainCircuit, FileText, Settings, Sparkles, Users, MessageSquarePlus, Edit2, X, GraduationCap, BarChart3, Image as ImageIcon, Lightbulb, Printer, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MatrixConfig } from '../components/MatrixConfig';
import { PrintableContent } from '../components/PrintableContent';

type CreateMode = 'PARSE' | 'GENERATE' | 'MATRIX';
type PrintType = 'MATRIX' | 'EXAM_MCQ' | 'EXAM_ESSAY' | 'SOLUTION' | 'ALL';

export const ExamCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addExam, updateExam, exams, user, classes } = useStore();

  const searchParams = new URLSearchParams(location.search);
  const editExamId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(false);

  // Basic Info - Default for Primary School
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(35); // Default 35 mins
  const [subject, setSubject] = useState('Toán'); // Default Toán
  const [topic, setTopic] = useState(''); // New topic field
  const [grade, setGrade] = useState('5'); // Default Grade 5
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('NHAN_BIET');

  // Save Settings
  const [saveTarget, setSaveTarget] = useState<'BANK' | 'CLASS'>('BANK');
  const [targetClassId, setTargetClassId] = useState('');

  // Mode & Data
  const [mode, setMode] = useState<CreateMode>('PARSE');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Question State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Print Mode
  const [printType, setPrintType] = useState<PrintType | null>(null);

  // Save to Bank checkbox
  const [saveToBank, setSaveToBank] = useState(true);

  // Parse Mode State
  const [rawText, setRawText] = useState('');

  // Generate Mode State
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>('MCQ');
  const [aiCount, setAiCount] = useState(5);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  // Topic Combobox State
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

  // Extract unique topics from past exams
  const availableTopics = React.useMemo(() => {
    const topics = new Set<string>();
    exams.forEach(exam => {
      if (exam.topic && exam.topic.trim() !== '') {
        topics.add(exam.topic.trim());
      }
    });
    return Array.from(topics).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [exams]);

  // Filter topics based on current input
  const filteredTopics = React.useMemo(() => {
    if (!topic) return availableTopics;
    const lowerSearch = topic.toLowerCase();
    return availableTopics.filter(t => t.toLowerCase().includes(lowerSearch));
  }, [topic, availableTopics]);

  // Constants for Primary School
  const SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const GRADES = ['1', '2', '3', '4', '5'];

  // Helper to map enum to readable string for AI
  const getDifficultyDescription = (diff: ExamDifficulty) => {
    switch (diff) {
      case 'NHAN_BIET': return 'Mức 1 (Nhận biết - Nhắc lại)';
      case 'THONG_HIEU': return 'Mức 2 (Hiểu - Kết nối)';
      case 'VAN_DUNG': return 'Mức 3 (Vận dụng - Giải quyết vấn đề)';
      default: return 'Mức 1 (Nhận biết)';
    }
  };

  const getDifficultyLabel = (diff: ExamDifficulty) => {
    switch (diff) {
      case 'NHAN_BIET': return 'Mức 1 (Nhận biết)';
      case 'THONG_HIEU': return 'Mức 2 (Kết nối)';
      case 'VAN_DUNG': return 'Mức 3 (Vận dụng)';
      default: return 'Mức 1';
    }
  };

  React.useEffect(() => {
    if (editExamId) {
      const examToEdit = exams.find(e => e.id === editExamId);
      if (examToEdit) {
        setIsEditMode(true);
        setTitle(examToEdit.title);
        setSubject(examToEdit.subject || 'Toán');
        setTopic(examToEdit.topic || '');
        setGrade(examToEdit.grade || '5');
        setDifficulty(examToEdit.difficulty || 'NHAN_BIET');
        setDuration(examToEdit.durationMinutes);
        setQuestions(JSON.parse(JSON.stringify(examToEdit.questions))); // Deep copy

        // Also figure out save target based on classId
        if (examToEdit.classId) {
          setSaveTarget('CLASS');
          setTargetClassId(examToEdit.classId);
        } else {
          setSaveTarget('BANK');
        }
      }
    }
  }, [editExamId, exams]);

  // Handlers
  // --- Tách câu hỏi LOCAL (regex, không cần AI) ---
  const handleParseLocal = () => {
    if (!rawText.trim()) return;
    setError(null);
    const parsed = parseQuestionsLocal(rawText);
    if (parsed.length === 0) {
      setError("Không tìm thấy câu hỏi theo format chuẩn. Hãy thử nút \"✨ AI Tách\" hoặc kiểm tra lại định dạng (Câu 1:, A., B., C., D., Đáp án: X).");
    } else {
      setQuestions(prev => [...prev, ...parsed]);
    }
  };

  // --- Tách câu hỏi bằng AI (cần API Key + Internet) ---
  const handleParseAI = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const parsed = await parseQuestionsFromText(rawText);
      if (parsed.length === 0) {
        setError("AI không tìm thấy câu hỏi nào trong văn bản. Vui lòng kiểm tra định dạng nhập liệu.");
      } else {
        setQuestions(prev => [...prev, ...parsed]);
      }
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('API Key') || detail.includes('API_KEY') || detail.includes('Chưa cấu hình')) {
        setError("Lỗi API Key: Vui lòng vào Cài đặt → tab 🔑 API Key để nhập Google Gemini API Key.");
      } else if (detail.includes('quota') || detail.includes('429') || detail.includes('RESOURCE_EXHAUSTED')) {
        setError("AI đang quá tải (hết quota). Vui lòng thử lại sau vài phút hoặc dùng nút \"Tách câu hỏi\" (không cần AI).");
      } else if (detail.includes('network') || detail.includes('fetch') || detail.includes('Failed to fetch')) {
        setError("Lỗi mạng: Không thể kết nối đến AI. Kiểm tra kết nối internet hoặc dùng nút \"Tách câu hỏi\" (không cần AI).");
      } else {
        setError(`Không thể tách câu hỏi: ${detail || 'Lỗi không xác định. Vui lòng thử lại.'}`);
      }
      console.error("[ExamCreate] handleParseAI error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập Chủ đề / Nội dung kiến thức ở phần Cấu hình chung.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      // Append Subject to Topic for better context
      const fullTopic = `${subject}: ${topic}`;
      const diffDesc = getDifficultyDescription(difficulty);

      const generated = await generateQuestionsByTopic(
        fullTopic,
        grade, // Use Global Grade
        aiQuestionType,
        diffDesc, // Use Global Difficulty
        aiCount,
        aiCustomPrompt
      );
      setQuestions(prev => [...prev, ...generated]);
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('API Key') || detail.includes('API_KEY')) {
        setError("Lỗi API Key: Vui lòng kiểm tra cài đặt API Key trong Cài đặt.");
      } else if (detail.includes('quota') || detail.includes('429')) {
        setError("AI đang quá tải (hết quota). Vui lòng thử lại sau vài phút.");
      } else if (detail.includes('network') || detail.includes('fetch')) {
        setError("Lỗi mạng: Không thể kết nối đến AI. Kiểm tra kết nối internet.");
      } else {
        setError(`AI không thể tạo câu hỏi: ${detail || 'Lỗi không xác định. Vui lòng thử lại.'}`);
      }
      console.error("[ExamCreate] handleGenerate error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveExam = async () => {
    if (!title.trim() || questions.length === 0) {
      setError("Vui lòng nhập tên bài tập và có ít nhất 1 câu hỏi.");
      return;
    }
    if (!subject || !grade) {
      setError("Vui lòng chọn Môn học và Khối lớp.");
      return;
    }

    if (saveTarget === 'CLASS' && !targetClassId) {
      setError("Vui lòng chọn lớp để giao bài.");
      return;
    }

    if (isEditMode && editExamId) {
      // Update logic
      const updatedExam = exams.find(e => e.id === editExamId);
      if (updatedExam) {
        updateExam({
          ...updatedExam,
          title,
          subject,
          topic: topic.trim() || undefined,
          grade,
          difficulty,
          durationMinutes: duration,
          questionCount: questions.length,
          classId: saveTarget === 'CLASS' ? targetClassId : undefined,
          questions
        });
        navigate('/exams');
        return;
      }
    }

    const newExam = {
      id: `exam_${Date.now()}`,
      title,
      subject,
      topic: topic.trim() || undefined,
      grade,
      difficulty,
      durationMinutes: duration,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
      status: 'PUBLISHED' as const,
      classId: saveTarget === 'CLASS' ? targetClassId : undefined, // undefined = Public Bank
      questions
    };

    await addExam(newExam);
    navigate('/exams');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion({ ...q }); // clone to avoid direct mutation
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion) return;
    setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
    setEditingQuestion(null);
  };

  const addManualQuestion = () => {
    const newQ: Question = {
      id: `manual_${Date.now()}`,
      type: 'MCQ',
      content: 'Câu hỏi mới...',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      solution: '',
      hint: '',
      level: undefined,
      topic: topic || undefined
    };
    setQuestions(prev => [...prev, newQ]);
    setEditingQuestion(newQ);
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'MCQ': return 'Trắc nghiệm (ABCD)';
      case 'MATCHING': return 'Nối cột';
      case 'ORDERING': return 'Sắp xếp';
      case 'DRAG_DROP': return 'Kéo thả / Điền khuyết';
      case 'SHORT_ANSWER': return 'Tự luận ngắn';
      default: return type;
    }
  };

  const handlePrint = (type: PrintType) => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
      // Optional: setPrintType(null) sau khi in xong nhưng đôi khi trình duyệt block JS lúc dialog in mở
    }, 500);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Chỉnh sửa Bài Tập' : 'Tạo Bài Tập Mới'}</h1>
          <p className="text-gray-500">{isEditMode ? 'Quản lý nội dung câu hỏi và cấu hình bài tập.' : 'Soạn thảo, upload file hoặc nhờ AI tạo bài tập tự động.'}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setMode('PARSE')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'PARSE' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}
            >
              <FileText className="h-4 w-4" /> Tách từ File
            </button>
            <button
              onClick={() => setMode('GENERATE')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'GENERATE' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}
            >
              <Sparkles className="h-4 w-4" /> AI Tạo Bài Tập
            </button>
          </div>

          {/* Nút Xuất File */}
          {questions.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
                <Printer className="h-4 w-4" />
                Xuất File <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button onClick={() => handlePrint('MATRIX')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Xuất Ma trận</button>
                <button onClick={() => handlePrint('EXAM_MCQ')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><FileText className="h-4 w-4" /> Xuất Đề thi</button>
                <button onClick={() => handlePrint('EXAM_ESSAY')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><Edit2 className="h-4 w-4" /> Xuất Tự luận</button>
                <button onClick={() => handlePrint('SOLUTION')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Xuất Đáp án</button>
                <div className="h-px bg-gray-200 my-1"></div>
                <button onClick={() => handlePrint('ALL')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"><Printer className="h-4 w-4" /> Xuất Tất Cả</button>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveExam}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Save className="h-4 w-4" />
            Lưu & Xuất Bản
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* LEFT COLUMN: Config & Input */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-y-auto pr-1">

          {/* 1. General Info */}
          <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Cấu hình chung
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bài tập</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Bài tập Toán Giữa Kì 1..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                  <select
                    value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
                  <select
                    value={grade} onChange={e => setGrade(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                  </select>
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Nội dung kiến thức (Tùy chọn)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={e => {
                      setTopic(e.target.value);
                      setIsTopicDropdownOpen(true);
                    }}
                    onFocus={() => setIsTopicDropdownOpen(true)}
                    onBlur={() => {
                      // Small delay to allow click on dropdown items
                      setTimeout(() => setIsTopicDropdownOpen(false), 200);
                    }}
                    placeholder="VD: Phân số, Hình học..."
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>

                {/* Topic Dropdown */}
                {isTopicDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTopics.length > 0 ? (
                      <ul className="py-1">
                        {filteredTopics.map((t, idx) => (
                          <li
                            key={idx}
                            onMouseDown={(e) => {
                              // Use onMouseDown instead of onClick to fire before onBlur of input
                              e.preventDefault();
                              setTopic(t);
                              setIsTopicDropdownOpen(false);
                            }}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 italic">
                        {topic ? 'Nhấn "Lưu & Xuất Bản" để lưu chủ đề mới này.' : 'Chưa có chủ đề nào được lưu trước đó.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                  <input
                    type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ (TT27)</label>
                  <select
                    value={difficulty} onChange={e => setDifficulty(e.target.value as ExamDifficulty)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="LEVEL_1">Mức 1 (Nhận biết)</option>
                    <option value="LEVEL_2">Mức 2 (Kết nối)</option>
                    <option value="LEVEL_3">Mức 3 (Vận dụng)</option>
                  </select>
                </div>
              </div>

              {/* Save Target Selector */}
              <div className="pt-2 border-t mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lưu trữ</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${saveTarget === 'BANK' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50 bg-white'}`}>
                    <input type="radio" name="target" className="hidden" checked={saveTarget === 'BANK'} onChange={() => setSaveTarget('BANK')} />
                    <BrainCircuit className="h-5 w-5" />
                    Ngân hàng bài tập
                  </label>
                  <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${saveTarget === 'CLASS' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50 bg-white'}`}>
                    <input type="radio" name="target" className="hidden" checked={saveTarget === 'CLASS'} onChange={() => setSaveTarget('CLASS')} />
                    <Users className="h-5 w-5" />
                    Giao cho lớp
                  </label>
                </div>
                {saveTarget === 'CLASS' && (
                  <div className="mt-3 animate-fade-in">
                    <select
                      value={targetClassId}
                      onChange={e => setTargetClassId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {teacherClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Checkbox Lưu vào Ngân Hàng */}
              <div className="pt-2 border-t mt-2">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">Đồng thời lưu các câu hỏi vào <strong>Ngân hàng câu hỏi</strong></span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Content Input (Parse or Generate) */}
          <div className="flex-1 bg-white p-5 rounded-xl border shadow-sm flex flex-col">
            {mode === 'PARSE' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Nội dung bài tập (Copy/Paste)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleParseLocal}
                      disabled={isProcessing || !rawText}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all
                              ${isProcessing || !rawText ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-md'}
                              `}
                      title="Tách bằng regex (nhanh, miễn phí, không cần AI)"
                    >
                      <Wand2 className="h-3 w-3" /> Tách câu hỏi
                    </button>
                    <button
                      onClick={handleParseAI}
                      disabled={isProcessing || !rawText}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all
                              ${isProcessing || !rawText ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-md'}
                              `}
                      title="Tách bằng AI (cần API Key, nhận dạng format linh hoạt hơn)"
                    >
                      {isProcessing ? 'AI đang xử lý...' : <><Sparkles className="h-3 w-3" /> AI Tách</>}
                    </button>
                  </div>
                </div>

                {/* Hướng dẫn định dạng */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2 text-xs text-blue-700 space-y-1">
                  <p className="font-bold">📋 Hướng dẫn format nhập liệu:</p>
                  <p>• Mỗi câu bắt đầu bằng: <code className="bg-blue-100 px-1 rounded">Câu 1:</code> hoặc <code className="bg-blue-100 px-1 rounded">Bài 1:</code></p>
                  <p>• Đáp án: <code className="bg-blue-100 px-1 rounded">A.</code> <code className="bg-blue-100 px-1 rounded">B.</code> <code className="bg-blue-100 px-1 rounded">C.</code> <code className="bg-blue-100 px-1 rounded">D.</code> (mỗi đáp án 1 dòng)</p>
                  <p>• Đáp án đúng: <code className="bg-blue-100 px-1 rounded">Đáp án: B</code></p>
                  <p>• Lời giải: <code className="bg-blue-100 px-1 rounded">Giải thích:</code> hoặc <code className="bg-blue-100 px-1 rounded">Hướng dẫn:</code></p>
                  <p className="text-blue-500 italic">💡 AI sẽ tự động nhận dạng cả khi format không chuẩn.</p>
                </div>

                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`Dán nội dung từ Word/PDF vào đây...\n\nVí dụ:\nCâu 1: 1+1=?\nA. 1\nB. 2\nC. 3\nD. 4\nĐáp án: B`}
                  className="flex-1 w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white text-gray-900"
                  style={{ minHeight: '500px' }}
                />
              </>
            )}

            {mode === 'GENERATE' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" /> AI Tạo bài tập (Thông minh)
                  </h3>
                </div>

                {/* Status Banner */}
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4 flex items-center gap-3 text-sm text-purple-800">
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" /> Lớp {grade}
                  </div>
                  <div className="h-3 w-px bg-purple-200"></div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" /> {getDifficultyLabel(difficulty)}
                  </div>
                  <div className="h-3 w-px bg-purple-200"></div>
                  <div className="italic text-purple-600">Sử dụng từ Cấu hình chung</div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại câu hỏi</label>
                      <select
                        value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as QuestionType)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                      >
                        <option value="MCQ">Trắc nghiệm 4 lựa chọn (ABCD)</option>
                        <option value="MATCHING">Nối cột (Ghép đôi)</option>
                        <option value="ORDERING">Sắp xếp theo thứ tự</option>
                        <option value="DRAG_DROP">Kéo thả / Điền khuyết</option>
                        <option value="SHORT_ANSWER">Tự luận ngắn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng câu</label>
                      <input
                        type="number" min="1" max="20"
                        value={aiCount} onChange={e => setAiCount(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Prompt Templates - Huấn luyện AI */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Mẫu chỉ dẫn AI (Prompt sẵn)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { label: '🧒 Thân thiện HS', prompt: 'Dùng ngôn ngữ vui tươi, thân thiện, phù hợp với học sinh tiểu học. Sử dụng các tình huống gần gũi trong cuộc sống hàng ngày.' },
                        { label: '🎯 Bẫy sai phổ biến', prompt: 'Tập trung vào các lỗi sai thường gặp của học sinh. Đáp án sai (distractors) phải là những lỗi tính toán mà HS hay mắc phải.' },
                        { label: '📖 Theo SGK', prompt: 'Bám sát nội dung sách giáo khoa hiện hành. Dùng ví dụ và thuật ngữ giống SGK.' },
                        { label: '🌟 Thực tiễn', prompt: 'Tạo câu hỏi gắn với tình huống thực tế: đi chợ, đo đạc sân trường, chia bánh... để HS thấy toán học hữu ích.' },
                        { label: '🔢 Tính nhẩm', prompt: 'Tạo các bài tập rèn kỹ năng tính nhẩm nhanh, không cần nháp. Số liệu đơn giản, ưu tiên phép tính tròn chục.' },
                      ].map((tpl, i) => (
                        <button
                          key={i}
                          onClick={() => setAiCustomPrompt(prev => prev ? `${prev}\n${tpl.prompt}` : tpl.prompt)}
                          className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
                          title={tpl.prompt}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <MessageSquarePlus className="h-3 w-3" /> Yêu cầu khác (Cá nhân hóa)
                    </label>
                    <textarea
                      value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)}
                      placeholder="VD: Hãy dùng tên các nhân vật trong truyện Doraemon. Tập trung vào các lỗi sai thường gặp..."
                      className="w-full h-24 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-white text-gray-900"
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isProcessing || !topic.trim()}
                    className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2
                            ${isProcessing ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'}
                            `}
                  >
                    {isProcessing ? 'AI đang viết bài tập...' : <><Sparkles className="h-4 w-4" /> Tạo câu hỏi ngay</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Preview */}
        <div className="lg:col-span-7 bg-white rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b bg-white flex justify-between items-center rounded-t-xl">
            <h3 className="font-bold text-gray-700">Xem trước ({questions.length} câu)</h3>
            <button onClick={addManualQuestion} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> Thêm thủ công
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FilePlus className="h-16 w-16 mb-4 opacity-30" />
                <p className="font-medium">Chưa có câu hỏi nào.</p>
                <p className="text-sm mt-1">Hãy nhập nội dung bên trái để bắt đầu.</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(q)}
                      className="text-gray-300 hover:text-indigo-600 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2 pr-16">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium text-base whitespace-pre-wrap prose prose-p:my-0">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.content}
                            </ReactMarkdown>
                          </p>
                          {q.imageUrl && (
                            <img src={q.imageUrl} alt="Question" className="mt-3 max-w-full h-auto rounded-lg border border-gray-200 max-h-64 object-contain" />
                          )}
                        </div>
                        <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border uppercase whitespace-nowrap">
                          {getTypeLabel(q.type)}
                        </span>
                      </div>

                      {/* Render Options based on type */}
                      {q.type === 'MCQ' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors
                                ${q.correctOptionIndex === i ? 'bg-green-50 border-green-200 text-green-900' : 'bg-white border-gray-200 text-gray-600'}
                              `}
                            >
                              <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${q.correctOptionIndex === i ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="prose prose-p:my-0">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {opt}
                                </ReactMarkdown>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(q.type) && (
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="p-2.5 rounded-lg border bg-gray-50 border-gray-200 text-sm flex items-center gap-3">
                              <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-gray-200 text-gray-700 text-xs font-bold">
                                {i + 1}
                              </span>
                              <span className="prose prose-p:my-0 text-gray-800">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {opt}
                                </ReactMarkdown>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'SHORT_ANSWER' && (
                        <div className="mt-3 space-y-2">
                          <div className="p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 italic">
                            Học sinh sẽ trả lời bằng đoạn văn bản vào ô nhập liệu ở phần thi.
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs font-bold text-green-700 mb-2">✅ Đáp án chấm tự động ({q.options.length}):</p>
                              <div className="flex flex-wrap gap-2">
                                {q.options.map((ans, i) => (
                                  <span key={i} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full border border-green-200">
                                    {ans}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(q.solution || q.hint) && (
                        <div className="mt-4 space-y-2">
                          {q.hint && (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-orange-800 flex gap-2 items-start">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="prose prose-sm prose-p:my-0 text-orange-800">
                                <strong>Gợi ý: </strong>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {q.hint}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {q.solution && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-2 items-start">
                              <BrainCircuit className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="prose prose-sm prose-p:my-0 text-blue-800">
                                <strong>Đáp án/Lời giải: </strong>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {q.solution}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-gray-800">Chỉnh sửa câu hỏi</h3>
              <button onClick={() => setEditingQuestion(null)} className="hover:bg-gray-100 p-2 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi</label>
                <textarea
                  value={editingQuestion.content}
                  onChange={e => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Loại câu hỏi</label>
                  <select
                    value={editingQuestion.type}
                    onChange={e => {
                      const newType = e.target.value as QuestionType;
                      let newOpts = [...editingQuestion.options];
                      let newIdx = editingQuestion.correctOptionIndex;

                      if (newType === 'MCQ' && newOpts.length === 0) {
                        newOpts = ['A', 'B', 'C', 'D'];
                        newIdx = 0;
                      } else if (newType === 'SHORT_ANSWER') {
                        newOpts = [];
                        newIdx = undefined;
                      }

                      setEditingQuestion({
                        ...editingQuestion,
                        type: newType,
                        options: newOpts,
                        correctOptionIndex: newIdx
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="MCQ">Trắc nghiệm (ABCD)</option>
                    <option value="MATCHING">Nối cột (Trái ||| Phải)</option>
                    <option value="ORDERING">Sắp xếp thứ tự đúng</option>
                    <option value="DRAG_DROP">Kéo thả / Điền khuyết</option>
                    <option value="SHORT_ANSWER">Tự luận ngắn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Link ảnh minh họa (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.imageUrl || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="https://example.com/image.png"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mức độ (Tùy chọn)</label>
                <select
                  value={editingQuestion.level || ''}
                  onChange={e => setEditingQuestion({ ...editingQuestion, level: (e.target.value as ExamDifficulty) || undefined })}
                  className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="">-- Không phân mức --</option>
                  <option value="NHAN_BIET">Mức 1 (Nhận biết)</option>
                  <option value="THONG_HIEU">Mức 2 (Kết nối)</option>
                  <option value="VAN_DUNG">Mức 3 (Vận dụng)</option>
                </select>
              </div>

              {editingQuestion.imageUrl && (
                <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">Xem trước:</p>
                  <img src={editingQuestion.imageUrl} alt="Preview" className="h-32 object-contain rounded border bg-white" />
                </div>
              )}

              {editingQuestion.type === 'MCQ' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                    Các lựa chọn
                    <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, 'Lựa chọn mới'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm tùy chọn</button>
                  </label>
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2 group">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={editingQuestion.correctOptionIndex === i}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: i })}
                        className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                        title="Đánh dấu đáp án đúng"
                      />
                      <span className="font-bold w-6 text-gray-500 text-center">{String.fromCharCode(65 + i)}</span>
                      <input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[i] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={() => {
                        const newOpts = [...editingQuestion.options];
                        newOpts.splice(i, 1);
                        let newIdx = editingQuestion.correctOptionIndex;
                        if (newIdx === i) newIdx = 0;
                        else if (newIdx !== undefined && newIdx > i) newIdx--;
                        setEditingQuestion({ ...editingQuestion, options: newOpts, correctOptionIndex: newIdx });
                      }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(editingQuestion.type) && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                    {editingQuestion.type === 'MATCHING' && "Các cặp nối (Format: Nửa trái ||| Nửa phải)"}
                    {editingQuestion.type === 'ORDERING' && "Các mục cần sắp xếp (Nhập theo thứ tự ĐÚNG)"}
                    {editingQuestion.type === 'DRAG_DROP' && "Các từ/phần điền khuyết (Bao gồm cả đáp án đúng và gây nhiễu)"}
                    <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, editingQuestion.type === 'MATCHING' ? 'Vế Trái ||| Vế Phải' : 'Mục mới'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm mục</button>
                  </label>
                  {editingQuestion.type === 'DRAG_DROP' && (
                    <p className="text-xs text-gray-500 mb-2 italic">Ghi chú: Trong phần "Nội dung câu hỏi" ở trên, dùng <code className="bg-gray-100 px-1 rounded">[__]</code> để đánh dấu ô trống học sinh cần kéo thả/điền chữ vào.</p>
                  )}
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2 group">
                      <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                      <input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[i] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={() => {
                        const newOpts = [...editingQuestion.options];
                        newOpts.splice(i, 1);
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {editingQuestion.type === 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                    Các đáp án đúng được chấp nhận (Dùng cho máy chấm tự động)
                    <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, 'Đáp án'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm đáp án</button>
                  </label>
                  <p className="text-xs text-gray-500 mb-2 italic">Hệ thống sẽ lấy danh sách này để so khớp tự động. Nếu trống, máy sẽ so khớp với nội dung Lời giải chi tiết.</p>
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2 group">
                      <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                      <input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[i] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder="Nhập 1 đáp án được chấp nhận (VD: 3300)"
                        className="flex-1 border border-indigo-300 rounded-lg p-2 bg-indigo-50 text-indigo-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={() => {
                        const newOpts = [...editingQuestion.options];
                        newOpts.splice(i, 1);
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {editingQuestion.options.length === 0 && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                      Chưa có đáp án tự động nào. Hãy "Thêm đáp án" để máy chấm chính xác.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Gợi ý (Cách làm)</label>
                  <textarea
                    value={editingQuestion.hint || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, hint: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm"
                    placeholder="Hướng dẫn phương pháp giải..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lời giải chi tiết</label>
                  <textarea
                    value={editingQuestion.solution || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, solution: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm"
                    placeholder="Các bước giải chi tiết..."
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
              <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Hủy</button>
              <button onClick={saveEditedQuestion} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Vùng in ẩn, chỉ xuất hiện trên giấy */}
      {printType && (
        <PrintableContent
          type={printType}
          questions={questions}
          title={title}
          subject={subject}
          grade={grade}
          duration={duration}
          schoolName={undefined}
          academicYear={undefined}
        />
      )}
    </div>
  );
};