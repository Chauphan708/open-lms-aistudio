import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Clock, CheckCircle, AlertTriangle, Lock, Ban, ChevronLeft, Radio, Sparkles, MessageSquareQuote, RotateCcw, Lightbulb, BrainCircuit, Book } from 'lucide-react';
import { Attempt } from '../types';
import { analyzeStudentAttempt } from '../services/geminiService';
import { DictionaryWidget } from '../components/DictionaryWidget'; // IMPORT WIDGET
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

  // AI Analysis State (Only for Teacher view now mostly)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Widget State
  const [showDictionary, setShowDictionary] = useState(false);

  // Shuffle State: Map of QuestionId -> Array of Original Indices [2, 0, 3, 1]
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, number[]>>({});

  // VISIBILITY SETTINGS LOGIC
  const defaultSettings = {
      viewScore: true,
      viewPassFail: true,
      viewSolution: true,
      viewHint: true,
      maxAttempts: 0
  };
  const assignmentSettings = assignment?.settings || defaultSettings;

  // Check for existing attempts
  const myAttempts = user ? attempts.filter(a => a.examId === id && a.studentId === user.id) : [];
  const latestAttempt = myAttempts.length > 0 ? myAttempts[myAttempts.length - 1] : null; // Get latest

  // Retake Logic
  const attemptCount = myAttempts.length;
  const canRetake = !assignment || assignmentSettings.maxAttempts === 0 || attemptCount < assignmentSettings.maxAttempts;

  // --- CRITICAL VISIBILITY LOGIC ---
  // If feedback exists, the feedback's specific setting OVERRIDES assignment settings.
  const hasFeedback = !!latestAttempt?.teacherFeedback;
  
  const viewScore = assignmentSettings.viewScore; // Score is usually fine to show if configured
  const viewPassFail = assignmentSettings.viewPassFail; // Generally always show P/F if enabled
  
  // Logic: Show solution if:
  // 1. Feedback exists AND teacher specifically ALLOWED it in that feedback.
  // 2. Feedback does NOT exist AND assignment setting allows it.
  const canViewSolution = useMemo(() => {
      if (hasFeedback) {
          // If teacher has graded/given feedback, use the specific flag stored with feedback
          return !!latestAttempt?.feedbackAllowViewSolution;
      }
      // Otherwise fallback to assignment default
      return assignmentSettings.viewSolution;
  }, [hasFeedback, latestAttempt, assignmentSettings]);

  // Helper to shuffle array (Fisher-Yates)
  const shuffleArray = (array: number[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Generate shuffles for all questions
  const generateShuffles = useCallback(() => {
      if (!exam) return {};
      const map: Record<string, number[]> = {};
      exam.questions.forEach(q => {
          const indices = q.options.map((_, i) => i);
          map[q.id] = shuffleArray(indices);
      });
      return map;
  }, [exam]);

  // On mount or new attempt, initialize state
  useEffect(() => {
    if (!exam) return;

    if (latestAttempt) {
        // View existing attempt result
        setIsSubmitted(true);
        setScore(latestAttempt.score || 0);
        
        // Restore answers
        const numAnswers: Record<string, number> = {};
        Object.entries(latestAttempt.answers).forEach(([k, v]) => {
            if (typeof v === 'number') numAnswers[k] = v;
        });
        setAnswers(numAnswers);

        // NOTE: For reviewed attempts, use Standard Order to avoid confusion
        const standardMap: Record<string, number[]> = {};
        exam.questions.forEach(q => {
            standardMap[q.id] = q.options.map((_, i) => i);
        });
        setShuffledOptionsMap(standardMap);

    } else {
        // New attempt -> Shuffle!
        setShuffledOptionsMap(generateShuffles());
        
        // Timer
        const duration = assignment?.durationMinutes || exam.durationMinutes;
        setTimeLeft(duration * 60);
    }
  }, [exam, latestAttempt, assignment, generateShuffles]);

  // Handle Retake
  const handleRetake = () => {
      if (!canRetake) return;
      setIsSubmitted(false);
      setScore(null);
      setAnswers({});
      setAiAnalysis(null);
      // Re-shuffle for new attempt
      setShuffledOptionsMap(generateShuffles());
      // Reset Timer
      const duration = assignment?.durationMinutes || exam!.durationMinutes;
      setTimeLeft(duration * 60);
  };

  // Initialize Access Control
  useEffect(() => {
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
  }, [liveSessionId, liveSession, navigate]);

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

  // LIVE UPDATE EFFECT
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

  const handleSelectOption = (questionId: string, originalIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: originalIndex }));
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

  const formatScore = (val: number | null) => {
    if (val === null) return '--';
    return val.toFixed(1).replace('.', ',');
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 relative">
      {/* External Widget Button */}
      <button 
        onClick={() => setShowDictionary(!showDictionary)}
        className="fixed bottom-4 right-4 bg-white p-3 rounded-full shadow-lg border border-indigo-100 z-40 hover:bg-indigo-50 transition-colors group"
        title="Tra từ điển"
      >
        <Book className="h-6 w-6 text-indigo-600" />
        <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap top-1/2 -translate-y-1/2">
            Từ điển
        </span>
      </button>

      <DictionaryWidget isOpen={showDictionary} onClose={() => setShowDictionary(false)} />

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
            <h2 className="text-2xl font-bold mb-2 text-indigo-700">Kết Quả Bài Làm</h2>
            
            {viewScore ? (
                <>
                    <div className="text-5xl font-extrabold mb-2 text-gray-900">{formatScore(score)}</div>
                    <p className="text-gray-600">Bạn đã trả lời đúng <span className="font-bold">{Math.round(((score || 0) / 10) * exam.questions.length)}</span> / {exam.questions.length} câu hỏi</p>
                </>
            ) : (
                <div className="py-4 text-gray-500 italic">
                    Điểm số đã được ẩn bởi giáo viên.
                </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
               {canRetake && (
                   <button 
                      onClick={handleRetake}
                      className="px-6 py-2 rounded-full font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow transition-all"
                   >
                      <RotateCcw className="h-4 w-4" /> Làm bài lại ({attemptCount}/{assignmentSettings.maxAttempts === 0 ? '∞' : assignmentSettings.maxAttempts})
                   </button>
               )}
               <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 border px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-all shadow">
                  Quay về Dashboard
               </button>
            </div>
          </div>

          {/* Teacher Feedback */}
          {latestAttempt?.teacherFeedback && (
              <div className="bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm animate-fade-in">
                 <h3 className="font-bold text-green-800 text-lg flex items-center gap-2 mb-4">
                    <MessageSquareQuote className="h-5 w-5" /> Nhận xét của giáo viên
                 </h3>
                 <div className="prose prose-sm max-w-none text-gray-800 bg-white p-4 rounded-lg border border-green-100">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                       {latestAttempt.teacherFeedback}
                    </ReactMarkdown>
                 </div>
                 {!latestAttempt.feedbackAllowViewSolution && (
                     <div className="mt-2 text-xs text-red-600 italic">
                        * Giáo viên đã tắt tính năng xem đáp án chi tiết cho bài làm này.
                     </div>
                 )}
              </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {exam.questions.map((q, index) => {
          // Get the shuffled indices for this question
          const shuffledIndices = shuffledOptionsMap[q.id] || q.options.map((_, i) => i);

          return (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="text-gray-900 font-medium text-lg leading-relaxed prose prose-p:my-0">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {q.content}
                    </ReactMarkdown>
                  </div>
                  {q.imageUrl && (
                      <img 
                        src={q.imageUrl} 
                        alt="Question Image" 
                        className="mt-4 rounded-lg border border-gray-100 shadow-sm max-h-80 object-contain max-w-full"
                      />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                {shuffledIndices.map((originalIndex, displayIndex) => {
                  const optContent = q.options[originalIndex];
                  let optionClass = "border-gray-200 hover:bg-gray-50 bg-white";
                  
                  // Visual Logic
                  if (isSubmitted) {
                      // Logic check for Pass/Fail View
                      if (viewPassFail) {
                          if (originalIndex === q.correctOptionIndex) {
                             // Correct Option
                             if (canViewSolution) {
                                 // Show Green if Solution is Allowed
                                 optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
                             } else if (answers[q.id] === originalIndex) {
                                 // Student selected correct option -> Show Green (Confirm they were right)
                                 optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
                             } else {
                                 // Student was wrong, and solution HIDDEN -> Keep neutral/hidden
                                 optionClass = "opacity-50 bg-white";
                             }
                          } else if (answers[q.id] === originalIndex) {
                             // User picked wrong
                             optionClass = "bg-red-50 border-red-500 text-red-700";
                          } else {
                             optionClass = "opacity-50 bg-white";
                          }
                      } else {
                          // Pass/Fail OFF -> Neutral
                          if (answers[q.id] === originalIndex) {
                              optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
                          } else {
                              optionClass = "opacity-50 bg-white";
                          }
                      }
                  } else if (answers[q.id] === originalIndex) {
                    optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
                  }

                  // Force override for non-PassFail View (just show selection)
                  if (isSubmitted && !viewPassFail && answers[q.id] === originalIndex) {
                      optionClass = "bg-gray-100 border-gray-400 text-gray-800 font-bold";
                  }

                  return (
                    <button
                      key={originalIndex}
                      onClick={() => handleSelectOption(q.id, originalIndex)}
                      disabled={isSubmitted}
                      className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${optionClass}`}
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${
                        answers[q.id] === originalIndex ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-500'
                      } ${isSubmitted && viewPassFail && originalIndex === q.correctOptionIndex && canViewSolution ? '!bg-green-500 !border-green-500 !text-white' : ''}
                        ${isSubmitted && !viewPassFail && answers[q.id] === originalIndex ? '!bg-gray-600 !border-gray-600 !text-white' : ''}
                      `}>
                        {String.fromCharCode(65 + displayIndex)}
                      </div>
                      <span className="text-gray-800 prose prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {optContent}
                          </ReactMarkdown>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* HINT BOX: Check viewHint setting */}
              {isSubmitted && q.hint && assignmentSettings.viewHint && (
                  <div className="mt-4 ml-11 p-4 bg-orange-50 rounded-lg border border-orange-200 text-orange-900 text-sm shadow-sm animate-fade-in flex gap-2 items-start">
                      <Lightbulb className="h-5 w-5 flex-shrink-0 text-orange-500" />
                      <div>
                          <strong className="block mb-1 text-orange-700">Gợi ý làm bài:</strong>
                          <div className="prose prose-sm prose-p:my-0 text-orange-800">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {q.hint}
                              </ReactMarkdown>
                          </div>
                      </div>
                  </div>
              )}

              {/* SOLUTION BOX: STRICTLY Check calculated canViewSolution setting */}
              {isSubmitted && q.solution && canViewSolution && (
                <div className="mt-4 ml-11 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm shadow-sm animate-fade-in flex gap-2 items-start">
                  <BrainCircuit className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div className="flex-1">
                      <strong className="block mb-1 text-blue-700">Lời giải chi tiết:</strong>
                      <div className="prose prose-sm prose-p:my-0 text-blue-900">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q.solution}
                        </ReactMarkdown>
                      </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
