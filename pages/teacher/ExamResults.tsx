import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { analyzeClassPerformance, analyzeStudentAttempt } from '../../services/geminiService';
import { BarChart3, ArrowLeft, Users, BrainCircuit, Sparkles, TrendingUp, TrendingDown, Clock, Settings, X, CheckCircle, XCircle, Search, Send, Save, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Attempt } from '../../types';

export const ExamResults: React.FC = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { exams, attempts, users, assignments, classes, user, saveUserPrompt, updateAttemptFeedback } = useStore();

   const exam = exams.find(e => e.id === id);
   const examAttempts = attempts.filter(a => a.examId === id);

   // Class Analysis State
   const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [showConfigModal, setShowConfigModal] = useState(false);
   const [customPrompt, setCustomPrompt] = useState('');

   // Student Detail Modal State
   const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
   const [studentAiFeedback, setStudentAiFeedback] = useState<string>(''); // Edited Feedback Content
   const [isStudentAnalyzing, setIsStudentAnalyzing] = useState(false);
   const [isEditingFeedback, setIsEditingFeedback] = useState(true);

   // Toggle states
   const [showQuestionStats, setShowQuestionStats] = useState(false);
   const [showStudentStats, setShowStudentStats] = useState(false);

   // New State for Feedback Settings
   const [allowViewSolution, setAllowViewSolution] = useState(true);

   // Load existing feedback when opening student modal
   useEffect(() => {
      if (selectedAttemptId) {
         const att = attempts.find(a => a.id === selectedAttemptId);
         if (att) {
            setStudentAiFeedback(att.teacherFeedback || '');
            setAllowViewSolution(att.feedbackAllowViewSolution ?? true); // Default to true if not set previously
            setIsEditingFeedback(!att.teacherFeedback); // If exists, show preview first
         }
      }
   }, [selectedAttemptId, attempts]);

   // Helper to format score
   const fmt = (n: number) => n.toFixed(1).replace('.', ',');

   const stats = useMemo(() => {
      if (examAttempts.length === 0) return null;

      const scores = examAttempts.map(a => a.score || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const max = Math.max(...scores);
      const min = Math.min(...scores);

      // Distribution
      const distribution = {
         excellent: scores.filter(s => s >= 9).length,
         good: scores.filter(s => s >= 7 && s < 9).length,
         average: scores.filter(s => s >= 5 && s < 7).length,
         weak: scores.filter(s => s < 5).length,
      };

      return { avg, max, min, distribution, count: scores.length };
   }, [examAttempts]);

   const handleClassAnalyze = async () => {
      if (!exam || !stats) return;
      setIsAnalyzing(true);
      try {
         const result = await analyzeClassPerformance(exam.title, exam.questions, examAttempts, customPrompt);
         setAiAnalysis(result);
         if (customPrompt) saveUserPrompt(customPrompt); // Save the prompt
         setShowConfigModal(false);
      } catch (e) {
         setAiAnalysis("Có lỗi xảy ra khi phân tích.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   const handleStudentAnalyze = async (att: Attempt) => {
      if (!exam) return;
      setIsStudentAnalyzing(true);
      try {
         const feedback = await analyzeStudentAttempt(exam.title, exam.questions, att.answers, att.score || 0);
         setStudentAiFeedback(feedback);
         setIsEditingFeedback(true); // Switch to edit mode to let teacher review
      } catch (e) {
         setStudentAiFeedback("Lỗi khi phân tích.");
      } finally {
         setIsStudentAnalyzing(false);
      }
   };

   const handleSendFeedback = () => {
      if (!selectedAttemptId) return;
      updateAttemptFeedback(selectedAttemptId, studentAiFeedback, allowViewSolution);
      setIsEditingFeedback(false);
      alert("Đã gửi nhận xét cho học sinh!");
   };

   const openStudentDetail = (attId: string) => {
      setSelectedAttemptId(attId);
   };

   const selectedAttempt = attempts.find(a => a.id === selectedAttemptId);
   const selectedStudent = users.find(u => u.id === selectedAttempt?.studentId);

   if (!exam) return <div className="p-8 text-center">Không tìm thấy bài tập.</div>;

   return (
      <div className="max-w-6xl mx-auto pb-10">
         <div className="mb-6">
            <button onClick={() => navigate('/exams')} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2 transition-colors">
               <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                  <p className="text-gray-500 text-sm">Thống kê kết quả lớp học</p>
               </div>
               <button
                  onClick={() => setShowConfigModal(true)}
                  disabled={isAnalyzing || examAttempts.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <Sparkles className="h-5 w-5" />
                  {isAnalyzing ? 'AI đang phân tích...' : 'Phân tích lớp học với AI'}
               </button>
            </div>
         </div>

         {examAttempts.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu bài làm</h3>
               <p className="text-gray-500">Hãy đợi học sinh nộp bài để xem thống kê.</p>
            </div>
         ) : (
            <div className="space-y-6">
               {/* Stats Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Số lượng bài nộp</p>
                     <p className="text-3xl font-bold text-gray-900">{stats?.count}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><Users className="h-3 w-3" /> Tổng học sinh</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm trung bình</p>
                     <p className="text-3xl font-bold text-indigo-600">{fmt(stats?.avg || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400">Thang điểm 10</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm cao nhất</p>
                     <p className="text-3xl font-bold text-green-600">{fmt(stats?.max || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Xuất sắc</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm thấp nhất</p>
                     <p className="text-3xl font-bold text-red-500">{fmt(stats?.min || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Cần cải thiện</div>
                  </div>
               </div>

               {/* Distribution Chart */}
               <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Phổ điểm</h3>
                  <div className="flex items-end gap-4 h-48 px-2 md:px-8">
                     <div className="flex-1 flex flex-col justify-end items-center gap-3">
                        <div className="w-16 md:w-20 bg-red-200 rounded-t-lg transition-all relative group flex flex-col justify-end" style={{ height: `${stats!.count > 0 ? (stats!.distribution.weak / stats!.count) * 100 : 0}%`, minHeight: '8px' }}>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">{stats!.distribution.weak}</div>
                        </div>
                        <div className="w-full h-1 bg-red-200 rounded-full"></div>
                        <div className="text-center">
                           <div className="text-xs font-medium text-gray-500 mb-1">Yếu (&lt;5)</div>
                           <div className="text-sm font-bold text-gray-900">{stats!.distribution.weak}</div>
                        </div>
                     </div>
                     <div className="flex-1 flex flex-col justify-end items-center gap-3">
                        <div className="w-16 md:w-20 bg-yellow-200 rounded-t-lg transition-all relative group flex flex-col justify-end" style={{ height: `${stats!.count > 0 ? (stats!.distribution.average / stats!.count) * 100 : 0}%`, minHeight: '8px' }}>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity">{stats!.distribution.average}</div>
                        </div>
                        <div className="w-full h-1 bg-yellow-300 rounded-full"></div>
                        <div className="text-center">
                           <div className="text-xs font-medium text-gray-500 mb-1">TB (5-7)</div>
                           <div className="text-sm font-bold text-gray-900">{stats!.distribution.average}</div>
                        </div>
                     </div>
                     <div className="flex-1 flex flex-col justify-end items-center gap-3">
                        <div className="w-16 md:w-20 bg-blue-200 rounded-t-lg transition-all relative group flex flex-col justify-end" style={{ height: `${stats!.count > 0 ? (stats!.distribution.good / stats!.count) * 100 : 0}%`, minHeight: '8px' }}>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">{stats!.distribution.good}</div>
                        </div>
                        <div className="w-full h-1 bg-blue-300 rounded-full"></div>
                        <div className="text-center">
                           <div className="text-xs font-medium text-gray-500 mb-1">Khá (7-9)</div>
                           <div className="text-sm font-bold text-gray-900">{stats!.distribution.good}</div>
                        </div>
                     </div>
                     <div className="flex-1 flex flex-col justify-end items-center gap-3">
                        <div className="w-16 md:w-20 bg-green-200 rounded-t-lg transition-all relative group flex flex-col justify-end" style={{ height: `${stats!.count > 0 ? (stats!.distribution.excellent / stats!.count) * 100 : 0}%`, minHeight: '8px' }}>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">{stats!.distribution.excellent}</div>
                        </div>
                        <div className="w-full h-1 bg-green-300 rounded-full"></div>
                        <div className="text-center">
                           <div className="text-xs font-medium text-gray-500 mb-1">Giỏi (&ge;9)</div>
                           <div className="text-sm font-bold text-gray-900">{stats!.distribution.excellent}</div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Statistics by Question */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
                  <div
                     className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                     onClick={() => setShowQuestionStats(!showQuestionStats)}
                  >
                     <h3 className="font-bold text-gray-800">Thống kê theo câu hỏi</h3>
                     <div className="text-gray-400">
                        {showQuestionStats ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                     </div>
                  </div>
                  {showQuestionStats && (
                     <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
                        {exam.questions.map((q, idx) => {
                           let correctCount = 0;
                           let incorrectCount = 0;
                           examAttempts.forEach(att => {
                              const studentAnsIdx = att.answers[q.id];
                              // Only count if they answered
                              if (studentAnsIdx !== undefined) {
                                 if (studentAnsIdx === q.correctOptionIndex) {
                                    correctCount++;
                                 } else {
                                    incorrectCount++;
                                 }
                              } else {
                                 // If they didn't answer, it's incorrect
                                 incorrectCount++;
                              }
                           });
                           const total = correctCount + incorrectCount;
                           const correctPercent = total > 0 ? (correctCount / total) * 100 : 0;
                           const incorrectPercent = total > 0 ? (incorrectCount / total) * 100 : 0;

                           return (
                              <div key={q.id}>
                                 <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">Câu {idx + 1}</span>
                                    <span className="text-gray-500">
                                       <span className="text-green-600 font-medium">{correctCount} đúng</span> / <span className="text-red-500">{incorrectCount} sai</span>
                                    </span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                                    <div className="bg-green-500 h-2.5" style={{ width: `${correctPercent}%` }}></div>
                                    <div className="bg-red-500 h-2.5" style={{ width: `${incorrectPercent}%` }}></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>

               {/* Statistics by Student */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
                  <div
                     className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                     onClick={() => setShowStudentStats(!showStudentStats)}
                  >
                     <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800">Thống kê theo từng học sinh</h3>
                        <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                           {(() => {
                              const submittedStudents = new Set(examAttempts.map(a => a.studentId)).size;
                              const examAssignments = assignments.filter(a => a.examId === id);
                              const examClassIds = new Set<string>();
                              if (exam.classId) examClassIds.add(exam.classId);
                              examAssignments.forEach(a => examClassIds.add(a.classId));
                              const expectedStudentIds = new Set<string>();
                              examClassIds.forEach(classId => {
                                 const cls = classes.find(c => c.id === classId);
                                 if (cls) cls.studentIds.forEach(stId => expectedStudentIds.add(stId));
                              });
                              const totalExpected = expectedStudentIds.size > 0 ? expectedStudentIds.size : submittedStudents;
                              return `${submittedStudents}/${totalExpected} học sinh`;
                           })()}
                        </div>
                     </div>
                     <div className="text-gray-400">
                        {showStudentStats ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                     </div>
                  </div>
                  {showStudentStats && (
                     <div className="p-6 pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {Array.from(new Set(examAttempts.map(a => a.studentId))).map(studentId => {
                              const student = users.find(u => u.id === studentId);
                              const studentAttempts = examAttempts.filter(a => a.studentId === studentId);
                              const attemptCount = studentAttempts.length;
                              const scores = studentAttempts.map(a => a.score || 0);
                              const maxScore = Math.max(...scores);
                              const minScore = Math.min(...scores);
                              const avgScore = scores.reduce((a, b) => a + b, 0) / attemptCount;

                              // Percentage based on a max score of 10
                              const maxPercent = (maxScore / 10) * 100;
                              const minPercent = (minScore / 10) * 100;
                              const avgPercent = (avgScore / 10) * 100;

                              return (
                                 <div key={studentId} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                                          {student?.name.charAt(0) || '?'}
                                       </div>
                                       {student?.name || 'Khách'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Số lần làm</div>
                                          <div className="font-bold text-gray-800">{attemptCount}</div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">ĐTB</div>
                                          <div className="font-bold text-indigo-600">{fmt(avgScore)} <span className="text-xs font-normal text-gray-500">({Math.round(avgPercent)}%)</span></div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Cao nhất</div>
                                          <div className="font-bold text-green-600">{fmt(maxScore)} <span className="text-xs font-normal text-gray-500">({Math.round(maxPercent)}%)</span></div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Thấp nhất</div>
                                          <div className="font-bold text-red-500">{fmt(minScore)} <span className="text-xs font-normal text-gray-500">({Math.round(minPercent)}%)</span></div>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>

               {/* AI Analysis Section */}
               {aiAnalysis && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl shadow-sm animate-fade-in">
                     <h3 className="font-bold text-indigo-800 text-lg flex items-center gap-2 mb-4">
                        <BrainCircuit className="h-6 w-6 text-purple-600" /> Báo cáo phân tích từ AI
                     </h3>
                     <div className="prose prose-sm max-w-none text-gray-800 bg-white/50 p-4 rounded-lg">
                        <ReactMarkdown
                           remarkPlugins={[remarkMath]}
                           rehypePlugins={[rehypeKatex]}
                        >
                           {aiAnalysis}
                        </ReactMarkdown>
                     </div>
                  </div>
               )}

               {/* Student List Table */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                     <h3 className="font-bold text-gray-800">Danh sách bài làm chi tiết</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-600 border-b">
                           <tr>
                              <th className="px-6 py-3 font-medium">Học sinh</th>
                              <th className="px-6 py-3 font-medium text-center">Số câu đúng</th>
                              <th className="px-6 py-3 font-medium text-right">Điểm số</th>
                              <th className="px-6 py-3 font-medium text-center">Trạng thái</th>
                              <th className="px-6 py-3 font-medium text-center">Thao tác</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {examAttempts.map(att => {
                              const student = users.find(u => u.id === att.studentId);
                              // Calculate correct answers locally just for display if needed
                              let correctCount = 0;
                              exam.questions.forEach(q => {
                                 if (att.answers[q.id] === q.correctOptionIndex) correctCount++;
                              });

                              return (
                                 <tr key={att.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openStudentDetail(att.id)}>
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                          {student?.name.charAt(0) || '?'}
                                       </div>
                                       <div>
                                          <div className="font-bold">{student?.name || 'Khách'}</div>
                                          <div className="text-[10px] text-gray-500">{new Date(att.submittedAt).toLocaleString('vi-VN')}</div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <span className="font-bold text-green-600">{correctCount}</span> / {exam.questions.length}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`font-bold text-lg ${(att.score || 0) >= 8 ? 'text-green-600' : (att.score || 0) >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {fmt(att.score || 0)}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       {att.teacherFeedback ? (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Đã nhận xét</span>
                                       ) : (
                                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Chưa nhận xét</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors" title="Xem chi tiết">
                                          <Search className="h-4 w-4" />
                                       </button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* AI Config Modal */}
         {showConfigModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-600" /> Cấu hình phân tích AI
                     </h3>
                     <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Saved Prompts */}
                  {user?.savedPrompts && user.savedPrompts.length > 0 && (
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mẫu yêu cầu đã lưu</label>
                        <select
                           className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                           onChange={(e) => setCustomPrompt(e.target.value)}
                        >
                           <option value="">-- Chọn mẫu --</option>
                           {user.savedPrompts.map((p, i) => (
                              <option key={i} value={p}>{p.substring(0, 50)}...</option>
                           ))}
                        </select>
                     </div>
                  )}

                  <div className="mb-4">
                     <label className="block text-sm font-medium text-gray-700 mb-2">Yêu cầu tùy chỉnh</label>
                     <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                        rows={4}
                        placeholder="VD: Tập trung phân tích các lỗi sai về hình học. Đưa ra nhận xét nghiêm khắc hơn..."
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                     />
                     <p className="text-xs text-gray-500 mt-2">AI sẽ phân tích dựa trên dữ liệu bài làm và yêu cầu này. Yêu cầu mới sẽ được tự động lưu lại.</p>
                  </div>
                  <button
                     onClick={handleClassAnalyze}
                     className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                     Bắt đầu phân tích
                  </button>
               </div>
            </div>
         )}

         {/* Student Detail Modal */}
         {selectedAttempt && selectedStudent && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-5 border-b flex justify-between items-center bg-white z-10">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h3>
                        <p className="text-sm text-gray-500">Điểm số: <span className="font-bold text-indigo-600">{fmt(selectedAttempt.score || 0)}</span></p>
                     </div>
                     <div className="flex gap-2">
                        <button
                           onClick={() => handleStudentAnalyze(selectedAttempt)}
                           disabled={isStudentAnalyzing}
                           className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-100 transition-colors border border-purple-100"
                        >
                           <Sparkles className="h-4 w-4" /> {isStudentAnalyzing ? 'Đang phân tích...' : 'AI Phân tích riêng'}
                        </button>
                        <button onClick={() => setSelectedAttemptId(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                     {/* Feedback Section */}
                     <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm mb-6 animate-fade-in">
                        <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                           <BrainCircuit className="h-5 w-5" /> Nhận xét cho học sinh
                           <div className="ml-auto flex gap-2 items-center">
                              {isEditingFeedback ? (
                                 <>
                                    <label className="flex items-center gap-2 cursor-pointer mr-2 bg-gray-50 px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 transition">
                                       <input
                                          type="checkbox"
                                          checked={allowViewSolution}
                                          onChange={e => setAllowViewSolution(e.target.checked)}
                                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                       />
                                       <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                          {allowViewSolution ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                          Xem đáp án
                                       </span>
                                    </label>
                                    <button onClick={handleSendFeedback} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                                       <Send className="h-3 w-3" /> Gửi nhận xét
                                    </button>
                                 </>
                              ) : (
                                 <button onClick={() => setIsEditingFeedback(true)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                                    Chỉnh sửa
                                 </button>
                              )}
                           </div>
                        </h4>

                        {isEditingFeedback ? (
                           <textarea
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                              rows={6}
                              value={studentAiFeedback}
                              onChange={e => setStudentAiFeedback(e.target.value)}
                              placeholder="Nhập nhận xét của bạn hoặc sử dụng AI để tạo..."
                           />
                        ) : (
                           <div className="prose prose-sm max-w-none text-gray-800 bg-gray-50 p-4 rounded-lg border">
                              {studentAiFeedback ? (
                                 <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {studentAiFeedback}
                                 </ReactMarkdown>
                              ) : (
                                 <span className="text-gray-400 italic">Chưa có nhận xét.</span>
                              )}
                              {/* Feedback Status Badge */}
                              <div className="mt-2 pt-2 border-t flex justify-end">
                                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${allowViewSolution ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {allowViewSolution ? 'Học sinh ĐƯỢC xem đáp án' : 'Học sinh KHÔNG ĐƯỢC xem đáp án'}
                                 </span>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        {exam.questions.map((q, idx) => {
                           const studentAnsIdx = selectedAttempt.answers[q.id];
                           const isCorrect = studentAnsIdx === q.correctOptionIndex;

                           return (
                              <div key={q.id} className={`bg-white p-4 rounded-xl border ${isCorrect ? 'border-green-200' : 'border-red-200'} shadow-sm`}>
                                 <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                       {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                       <div className="font-medium text-gray-900 mb-2">
                                          <span className="font-bold text-gray-500 mr-2">Câu {idx + 1}:</span>
                                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                                       </div>

                                       {q.imageUrl && (
                                          <img src={q.imageUrl} alt="Question" className="my-2 rounded-lg border max-h-40 object-contain" />
                                       )}

                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                          {q.options.map((opt, i) => {
                                             let optionClass = "p-2 rounded border ";
                                             if (i === q.correctOptionIndex) optionClass += "bg-green-50 border-green-500 text-green-800 font-bold";
                                             else if (i === studentAnsIdx && !isCorrect) optionClass += "bg-red-50 border-red-500 text-red-800 font-bold";
                                             else optionClass += "bg-white border-gray-200 text-gray-500 opacity-70";

                                             return (
                                                <div key={i} className={optionClass}>
                                                   <span className="mr-2">{String.fromCharCode(65 + i)}.</span>
                                                   <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} className="inline">{opt}</ReactMarkdown>
                                                </div>
                                             );
                                          })}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};