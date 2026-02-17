import React, { useState } from 'react';
import { useStore } from '../store';
import { parseQuestionsFromText, generateQuestionsByTopic } from '../services/geminiService';
import { Question, QuestionType } from '../types';
import { Wand2, Save, Trash2, Plus, AlertCircle, FilePlus, BrainCircuit, FileText, Settings, Sparkles, Users, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CreateMode = 'PARSE' | 'GENERATE';

export const ExamCreate: React.FC = () => {
  const navigate = useNavigate();
  const { addExam, user, classes } = useStore();
  
  // Basic Info
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  
  // Save Settings
  const [saveTarget, setSaveTarget] = useState<'BANK' | 'CLASS'>('BANK');
  const [targetClassId, setTargetClassId] = useState('');

  // Mode & Data
  const [mode, setMode] = useState<CreateMode>('PARSE');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse Mode State
  const [rawText, setRawText] = useState('');

  // Generate Mode State
  const [aiTopic, setAiTopic] = useState('');
  const [aiClassLevel, setAiClassLevel] = useState('5'); // Default Class 5
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>('MCQ');
  const [aiDifficulty, setAiDifficulty] = useState('Mức 2 (Hiểu - Kết nối)');
  const [aiCount, setAiCount] = useState(5);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

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
      const generated = await generateQuestionsByTopic(
        aiTopic, 
        aiClassLevel,
        aiQuestionType,
        aiDifficulty, 
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

    if (saveTarget === 'CLASS' && !targetClassId) {
        setError("Vui lòng chọn lớp để giao bài.");
        return;
    }

    const newExam = {
      id: `exam_${Date.now()}`,
      title,
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

  const getTypeLabel = (type: QuestionType) => {
      switch(type) {
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                        <input 
                            type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
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
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Nội dung kiến thức</label>
                            <input 
                                value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                                placeholder="VD: Phép cộng trong phạm vi 100, Động vật hoang dã..."
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trình độ lớp</label>
                                <select 
                                    value={aiClassLevel} onChange={e => setAiClassLevel(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                                >
                                    {[1, 2, 3, 4, 5].map(i => <option key={i} value={i}>Lớp {i}</option>)}
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
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
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ (Thông tư 27)</label>
                                <select 
                                    value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                                >
                                    <option value="Mức 1 (Nhận biết - Nhắc lại)">Mức 1: Nhận biết, nhắc lại</option>
                                    <option value="Mức 2 (Hiểu - Kết nối)">Mức 2: Hiểu, kết nối</option>
                                    <option value="Mức 3 (Vận dụng - Giải quyết)">Mức 3: Vận dụng, giải quyết vấn đề</option>
                                </select>
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
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm">
                        {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                           <p className="text-gray-900 font-medium text-base">{q.content}</p>
                           <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border uppercase">
                               {getTypeLabel(q.type)}
                           </span>
                      </div>
                      
                      {/* Render Options based on type */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div 
                            key={i} 
                            className={`p-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors
                              ${q.correctOptionIndex === i ? 'bg-green-50 border-green-200 text-green-900' : 'bg-white border-gray-200 text-gray-600'}
                            `}
                          >
                            <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${q.correctOptionIndex === i ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                              {i + 1}
                            </span>
                            {opt}
                          </div>
                        ))}
                      </div>

                      {q.solution && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-2 items-start">
                           <BrainCircuit className="h-4 w-4 mt-0.5 flex-shrink-0" />
                           <div>
                               <strong>Đáp án/Lời giải:</strong> {q.solution}
                           </div>
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
    </div>
  );
};