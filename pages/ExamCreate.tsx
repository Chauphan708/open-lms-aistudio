import React, { useState } from 'react';
import { useStore } from '../store';
import { parseQuestionsFromText, generateQuestionsByTopic } from '../services/geminiService';
import { Question, QuestionType, ExamDifficulty } from '../types';
import { Wand2, Save, Trash2, Plus, AlertCircle, FilePlus, BrainCircuit, FileText, Settings, Sparkles, Users, MessageSquarePlus, Edit2, X, GraduationCap, BarChart3, Image as ImageIcon, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type CreateMode = 'PARSE' | 'GENERATE';

export const ExamCreate: React.FC = () => {
  const navigate = useNavigate();
  const { addExam, user, classes } = useStore();

  // Basic Info - Default for Primary School
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(35); // Default 35 mins
  const [subject, setSubject] = useState('Toán'); // Default Toán
  const [topic, setTopic] = useState(''); // New topic field
  const [grade, setGrade] = useState('5'); // Default Grade 5
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('LEVEL_1');

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

  // Parse Mode State
  const [rawText, setRawText] = useState('');

  // Generate Mode State
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>('MCQ');
  const [aiCount, setAiCount] = useState(5);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

  // Constants for Primary School
  const SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const GRADES = ['1', '2', '3', '4', '5'];

  // Helper to map enum to readable string for AI
  const getDifficultyDescription = (diff: ExamDifficulty) => {
    switch (diff) {
      case 'LEVEL_1': return 'Mức 1 (Nhận biết - Nhắc lại)';
      case 'LEVEL_2': return 'Mức 2 (Hiểu - Kết nối)';
      case 'LEVEL_3': return 'Mức 3 (Vận dụng - Giải quyết vấn đề)';
      default: return 'Mức 1 (Nhận biết)';
    }
  };

  const getDifficultyLabel = (diff: ExamDifficulty) => {
    switch (diff) {
      case 'LEVEL_1': return 'Mức 1 (Nhận biết)';
      case 'LEVEL_2': return 'Mức 2 (Kết nối)';
      case 'LEVEL_3': return 'Mức 3 (Vận dụng)';
      default: return 'Mức 1';
    }
  };

  // Handlers
  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const parsed = await parseQuestionsFromText(rawText);
      setQuestions(prev => [...prev, ...parsed]);
    } catch (err) {
      setError("Không thể tách câu hỏi. Vui lòng kiểm tra lại văn bản.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      // Append Subject to Topic for better context
      const fullTopic = `${subject}: ${aiTopic}`;
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
    } catch (err) {
      setError("AI không thể tạo câu hỏi lúc này. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveExam = () => {
    if (!title.trim() || questions.length === 0) {
      setError("Vui lòng nhập tên đề thi và có ít nhất 1 câu hỏi.");
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

    addExam(newExam);
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

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo Đề Thi Mới</h1>
          <p className="text-gray-500">Soạn thảo, upload file hoặc nhờ AI tạo đề tự động.</p>
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
              <Sparkles className="h-4 w-4" /> AI Tạo Đề
            </button>
          </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề thi</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra Toán Giữa Kì 1..."
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Nội dung kiến thức (Tùy chọn)</label>
                <input
                  type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="VD: Phân số, Hình học..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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
                    Ngân hàng đề
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
            </div>
          </div>

          {/* 2. Content Input (Parse or Generate) */}
          <div className="flex-1 bg-white p-5 rounded-xl border shadow-sm flex flex-col">
            {mode === 'PARSE' ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Nội dung đề (Copy/Paste)
                  </h3>
                  <button
                    onClick={handleParse}
                    disabled={isProcessing || !rawText}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all
                            ${isProcessing || !rawText ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-md'}
                            `}
                  >
                    {isProcessing ? 'Đang xử lý...' : <><Wand2 className="h-3 w-3" /> Tách câu hỏi</>}
                  </button>
                </div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`Dán nội dung từ Word/PDF vào đây...\n\nVí dụ:\nCâu 1: 1+1=?\nA. 1\nB. 2\nC. 3\nD. 4`}
                  className="flex-1 w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white text-gray-900"
                />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" /> AI Tạo đề thi (Thông minh)
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Kiến thức trọng tâm</label>
                    <input
                      value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                      placeholder="VD: Phép cộng trong phạm vi 100..."
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
                    />
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <MessageSquarePlus className="h-3 w-3" /> Yêu cầu khác (Cá nhân hóa)
                    </label>
                    <textarea
                      value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)}
                      placeholder="VD: Hãy dùng tên các nhân vật trong truyện Doraemon. Tập trung vào các lỗi sai thường gặp..."
                      className="w-full h-20 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-white text-gray-900"
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isProcessing || !aiTopic}
                    className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2
                            ${isProcessing ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'}
                            `}
                  >
                    {isProcessing ? 'AI đang viết đề...' : <><Sparkles className="h-4 w-4" /> Tạo câu hỏi ngay</>}
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
            <button className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
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

              {/* Image URL Input */}
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
                {editingQuestion.imageUrl && (
                  <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Xem trước:</p>
                    <img src={editingQuestion.imageUrl} alt="Preview" className="h-32 object-contain rounded border bg-white" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Các lựa chọn</label>
                {editingQuestion.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={editingQuestion.correctOptionIndex === i}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: i })}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="font-bold w-6">{String.fromCharCode(65 + i)}.</span>
                    <input
                      value={opt}
                      onChange={e => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[i] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-sm"
                    />
                  </div>
                ))}
              </div>

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
    </div>
  );
};