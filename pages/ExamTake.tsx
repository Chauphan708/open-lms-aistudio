import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Clock, CheckCircle, AlertTriangle, Lock, Ban, ChevronLeft, Radio, Sparkles } from 'lucide-react';
import { Attempt } from '../types';
import { analyzeStudentAttempt } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const ExamTake: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assign');
  const liveSessionId = searchParams.get('live'); // Check if Live Mode
  const navigate = useNavigate();
  
  const { exams, assignments, user, addAttempt, attempts, liveSessions, updateLiveParticipantProgress } = useStore();
  const exam = exams.find(e => e.id === id);
  const assignment = assignments.find(a => a.id === assignmentId);
  const liveSession = liveSessions.find(s => s.id === liveSessionId);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  
  // Access Control State
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize & Validation
  useEffect(() => {
    if (!exam) return;

    // 1. Determine Duration
    const duration = assignment?.durationMinutes || exam.durationMinutes;
    // Set initial time only once
    setTimeLeft(prev => prev === null ? duration * 60 : prev);

    // 2. Access Checks
    // ... (Existing Assignment Logic) ...
    if (assignment && user?.role === 'STUDENT') {
       // ... existing checks ...
    }
    
    // 3. LIVE SESSION CHECK
    if (liveSessionId) {
       if (!liveSession || liveSession.status === 'FINISHED') {
          setAccessDenied("Phiên thi trực tiếp đã kết thúc.");
          return;
       }
       if (liveSession.status === 'WAITING') {
          navigate(`/live/lobby/${liveSessionId}`);
          return;
       }
    }

  }, [exam, assignment, user, attempts, liveSessionId, liveSession, navigate]);

  // Timer Logic
  useEffect(() => {
    if (accessDenied) return; 
    if (timeLeft === null) return;

    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitted && exam) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, exam, accessDenied]);

  // LIVE UPDATE EFFECT: Calculate stats and send to store whenever answers change
  useEffect(() => {
    if (liveSessionId && user && exam && !isSubmitted) {
       let correct = 0;
       let wrong = 0;
       let answered = 0;
       
       Object.entries(answers).forEach(([qId, selectedIdx]) => {
          answered++;
          const q = exam.questions.find(ques => ques.id === qId);
          if (q && q.correctOptionIndex === selectedIdx) {
            correct++;
          } else {
            wrong++;
          }
       });

       // Calc temporary score
       const tempScore = answered > 0 ? (correct / exam.questions.length) * 10 : 0;
       
       updateLiveParticipantProgress(liveSessionId, user.id, {
          answeredCount: answered,
          correctCount: correct,
          wrongCount: wrong,
          score: tempScore
       });
    }
  }, [answers, liveSessionId, user, exam, isSubmitted, updateLiveParticipantProgress]);

  if (!exam) return <div className="p-8 text-center text-red-500">Không tìm thấy đề thi.</div>;

  if (accessDenied) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ban className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Không thể truy cập</h2>
                  <p className="text-gray-600 mb-6">{accessDenied}</p>
                  <button 
                    onClick={() => navigate('/exams')}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                      <ChevronLeft className="h-4 w-4" /> Quay về danh sách
                  </button>
              </div>
          </div>
      );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    
    // Calculate Score
    let correctCount = 0;
    exam.questions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) {
        correctCount++;
      }
    });
    
    const finalScore = (correctCount / exam.questions.length) * 10;
    setScore(finalScore);
    setIsSubmitted(true);

    // Final Update for Live Session
    if (liveSessionId && user) {
        updateLiveParticipantProgress(liveSessionId, user.id, {
          answeredCount: Object.keys(answers).length,
          correctCount: correctCount,
          wrongCount: Object.keys(answers).length - correctCount,
          score: finalScore
       });
    }

    // Save Attempt
    const attempt: Attempt = {
      id: `att_${Date.now()}`,
      examId: exam.id,
      assignmentId: assignment?.id,
      studentId: user?.id || 'guest',
      answers,
      score: finalScore,
      submittedAt: new Date().toISOString()
    };
    addAttempt(attempt);
  };

  const handleAIAnalyze = async () => {
    if (isAnalyzing || aiAnalysis) return;
    setIsAnalyzing(true);
    try {
      const feedback = await analyzeStudentAttempt(exam.title, exam.questions, answers, score || 0);
      setAiAnalysis(feedback);
    } catch (e) {
      setAiAnalysis("Có lỗi xảy ra khi phân tích.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Live Mode Indicator */}
      {liveSessionId && !isSubmitted && (
         <div className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-between animate-fade-in shadow-md">
            <span className="font-bold flex items-center gap-2"><Radio className="h-4 w-4 animate-pulse" /> Đang thi trực tiếp (Live)</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Tiến độ của bạn đang được giáo viên theo dõi</span>
         </div>
      )}

      {/* Header Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm mb-6 -mx-4 px-4 md:-mx-8 md:px-8 py-3 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{exam.title}</h1>
          <div className="text-xs text-gray-500">Thí sinh: {user?.name}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${(timeLeft || 0) < 300 ? 'text-red-600' : 'text-indigo-600'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          {!isSubmitted && (
             <button 
             onClick={handleSubmit}
             className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
           >
             Nộp bài
           </button>
          )}
        </div>
      </div>

      {isSubmitted && (
        <div className="space-y-6 mb-8">
          <div className="bg-white border border-gray-200 text-gray-900 p-6 rounded-xl shadow-lg text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-indigo-700">Đã Nộp Bài Thành Công</h2>
            <div className="text-5xl font-extrabold mb-2 text-gray-900">{score?.toFixed(1)}</div>
            <p className="text-gray-600">Bạn đã trả lời đúng <span className="font-bold">{Math.round(((score || 0) / 10) * exam.questions.length)}</span> / {exam.questions.length} câu hỏi</p>
            <div className="mt-6 flex justify-center gap-3">
               <button 
                  onClick={handleAIAnalyze}
                  disabled={isAnalyzing}
                  className={`px-6 py-2 rounded-full font-bold text-sm shadow flex items-center gap-2 transition-all
                    ${aiAnalysis ? 'bg-gray-100 text-gray-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105'}
                  `}
               >
                  <Sparkles className="h-4 w-4" /> {isAnalyzing ? 'Đang phân tích...' : 'AI Phân Tích (Trợ giảng)'}
               </button>
               <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 border px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-all shadow">
                  Quay về Dashboard
               </button>
            </div>
          </div>

          {/* AI Analysis Result */}
          {aiAnalysis && (
             <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl shadow-sm animate-fade-in">
                <h3 className="font-bold text-indigo-800 text-lg flex items-center gap-2 mb-4">
                   <Sparkles className="h-5 w-5 text-purple-600" /> Nhận xét từ Trợ giảng AI
                </h3>
                <div className="prose prose-sm max-w-none text-gray-800">
                   <ReactMarkdown 
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                   >
                      {aiAnalysis}
                   </ReactMarkdown>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {exam.questions.map((q, index) => {
          return (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="text-gray-900 font-medium text-lg leading-relaxed">{q.content}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                {q.options.map((opt, i) => {
                  let optionClass = "border-gray-200 hover:bg-gray-50 bg-white";
                  
                  if (isSubmitted) {
                      if (i === q.correctOptionIndex) {
                        optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
                      } else if (answers[q.id] === i) {
                        optionClass = "bg-red-50 border-red-500 text-red-700";
                      } else {
                        optionClass = "opacity-50 bg-white";
                      }
                  } else if (answers[q.id] === i) {
                    optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(q.id, i)}
                      disabled={isSubmitted}
                      className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${optionClass}`}
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                        answers[q.id] === i ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-500'
                      } ${isSubmitted && i === q.correctOptionIndex ? '!bg-green-500 !border-green-500 !text-white' : ''}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-gray-800">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {isSubmitted && q.solution && (
                <div className="mt-4 ml-11 p-4 bg-white rounded-lg border border-indigo-200 text-indigo-900 text-sm shadow-sm">
                  <strong className="block mb-1 text-indigo-700">Lời giải chi tiết:</strong>
                  {q.solution}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};