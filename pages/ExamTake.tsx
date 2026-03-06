import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Clock, CheckCircle, AlertTriangle, Lock, Ban, ChevronLeft, Radio, Sparkles, MessageSquareQuote, RotateCcw, Lightbulb, BrainCircuit, Book, Send } from 'lucide-react';
import { Attempt } from '../types';
import { analyzeStudentAttempt } from '../services/geminiService';
import { DictionaryWidget } from '../components/DictionaryWidget'; // IMPORT WIDGET
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../services/supabaseClient'; // BỔ SUNG ĐỂ GHI NHẬN HÀNH VI TỰ ĐỘNG

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

  const [answers, setAnswers] = useState<Record<string, any>>({});
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
      const parsedAnswers: Record<string, any> = {};
      Object.entries(latestAttempt.answers).forEach(([k, v]) => {
        parsedAnswers[k] = v;
      });
      setAnswers(parsedAnswers);

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

  if (!exam) return <div className="p-8 text-center text-red-500">Không tìm thấy bài tập.</div>;

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

  const handleSetAnswer = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;

    // Calculate Score
    let correctCount = 0;
    exam.questions.forEach(q => {
      const userAns = answers[q.id];
      if (q.type === 'MCQ') {
        if (userAns === q.correctOptionIndex) correctCount++;
      } else if (q.type === 'SHORT_ANSWER') {
        const sAns = String(userAns || '').trim().toLowerCase();
        const isCorrect = q.options && q.options.length > 0
          ? q.options.some(opt => String(opt).trim().toLowerCase() === sAns)
          : sAns === String(q.solution || '').trim().toLowerCase();
        if (isCorrect) correctCount++;
      } else if (['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(q.type)) {
        if (Array.isArray(userAns) && userAns.length === q.options.length) {
          let isAllCorrect = true;
          for (let i = 0; i < q.options.length; i++) {
            if (userAns[i] !== q.options[i]) {
              isAllCorrect = false;
              break;
            }
          }
          if (isAllCorrect) correctCount++;
        }
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

    // BỔ SUNG LOGIC: Tự động ghi nhận điểm hành vi
    if (user && user.id && assignment?.classId) {
      const percentage = (correctCount / exam.questions.length) * 100;
      let pointsToGive = 0;
      let reasonText = "";

      if (percentage === 100) {
        pointsToGive = 5;
        reasonText = "Làm đúng tất cả bài online";
      } else if (percentage >= 50) {
        pointsToGive = 3;
        reasonText = "Làm đúng từ 50% bài làm online";
      } else {
        pointsToGive = 1;
        reasonText = "Có làm bài online";
      }

      try {
        // Kiểm tra xem đã có log tự động nào cho bài này chưa (quy ước reason chứa chuỗi 'bài làm online' + assignment ID)
        const identifyKey = `[Tự động - ${assignment.id}]`;
        const finalReasonText = `${identifyKey} ${reasonText}`;

        const { data: existingLogs, error: checkError } = await supabase
          .from('behavior_logs')
          .select('*')
          .eq('student_id', user.id)
          .eq('class_id', assignment.classId)
          .like('reason', `${identifyKey}%`)
          .order('points', { ascending: false });

        if (!checkError) {
          if (existingLogs && existingLogs.length > 0) {
            const bestLog = existingLogs[0];
            // Nếu log mới có điểm lớn hơn log cũ (trường hợp retake), thì ta update/nâng điểm
            if (pointsToGive > bestLog.points) {
              await supabase.from('behavior_logs').update({
                points: pointsToGive,
                reason: finalReasonText
              }).eq('id', bestLog.id);
            }
          } else {
            // Chưa có log thì tạo mới
            const newLog = {
              id: `log_auto_${Date.now()}`,
              student_id: user.id,
              class_id: assignment.classId,
              points: pointsToGive,
              reason: finalReasonText,
              recorded_by: assignment.teacherId || 'system',
              created_at: new Date().toISOString()
            };
            await supabase.from('behavior_logs').insert(newLog);
          }
        }
      } catch (err) {
        console.error("Lỗi tự động ghi nhận điểm hành vi:", err);
      }
    }
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

      {/* Questions & Navigation Layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Navigation Sidebar (Desktop Left) */}
        {!isSubmitted && (
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[100px] bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 flex flex-col max-h-[calc(100vh-120px)]">
              <div className="flex items-center gap-3 mb-4 border-b pb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Thời gian còn lại</div>
                  <div className={`font-mono text-xl font-bold ${(timeLeft || 0) < 300 ? 'text-red-600' : 'text-indigo-700'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="text-sm font-bold text-gray-700 mb-3">Danh sách câu hỏi</div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-4 gap-2">
                  {exam.questions.map((q, idx) => {
                    // Check if question is answered
                    // For array types (Matching, Ordering, DragDrop), we check if at least one element is filled/selected
                    // For string/number types (MCQ, Short Answer), we check if value exists
                    const ans = answers[q.id];
                    let isAnswered = false;

                    if (ans !== undefined && ans !== null && ans !== '') {
                      if (Array.isArray(ans)) {
                        isAnswered = ans.some(a => a !== undefined && a !== null && a !== '');
                      } else {
                        isAnswered = true;
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const element = document.getElementById(`question-${q.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className={`
                          h-10 w-10 flex items-center justify-center rounded-lg font-bold text-sm transition-all
                          hover:scale-105 active:scale-95
                          ${isAnswered
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-transparent'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'}
                        `}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-4 h-4 rounded bg-indigo-600"></div> Đã làm
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div> Chưa làm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="flex-1 space-y-6">
          {exam.questions.map((q, index) => {
            // Get the shuffled indices for this question
            const shuffledIndices = shuffledOptionsMap[q.id] || q.options.map((_, i) => i);

            return (
              <div id={`question-${q.id}`} key={q.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm scroll-mt-24">
                <div className="flex gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium text-lg leading-relaxed prose prose-p:my-0">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {q.content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim()}
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

                <div className="pl-11 mt-4">
                  {q.type === 'MCQ' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
                              } else if (answers[q.id] === originalIndex) {
                                optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
                              } else {
                                optionClass = "opacity-50 bg-white";
                              }
                            } else if (answers[q.id] === originalIndex) {
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

                        if (isSubmitted && !viewPassFail && answers[q.id] === originalIndex) {
                          optionClass = "bg-gray-100 border-gray-400 text-gray-800 font-bold";
                        }

                        return (
                          <button
                            key={originalIndex}
                            onClick={() => handleSetAnswer(q.id, originalIndex)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${optionClass}`}
                          >
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${answers[q.id] === originalIndex ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-500'
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
                  )}

                  {q.type === 'SHORT_ANSWER' && (() => {
                    const sAns = String(answers[q.id] || '').trim().toLowerCase();
                    const isCorrect = q.options && q.options.length > 0
                      ? q.options.some(opt => String(opt).trim().toLowerCase() === sAns)
                      : sAns === String(q.solution || '').trim().toLowerCase();
                    return (
                      <div>
                        <textarea
                          disabled={isSubmitted}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                          placeholder="Nhập câu trả lời của bạn vào đây..."
                          className={`w-full p-4 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] ${isSubmitted ? 'bg-gray-50 text-gray-700 border-gray-300 relative' : 'bg-white border-gray-300 text-gray-900'} ${isSubmitted && viewPassFail ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : ''}`}
                        />
                        {isSubmitted && viewPassFail && (
                          <div className="mt-2 text-sm text-gray-600">
                            {isCorrect
                              ? <span className="text-green-600 font-bold">✓ Hệ thống tự chấm khớp đáp án</span>
                              : <span className="text-red-600 font-bold">✗ Sai (Không khớp với đáp án)</span>}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {q.type === 'MATCHING' && (() => {
                    const leftItems = q.options.map(o => o.split('|||')[0]?.trim() || o);
                    const rightItems = q.options.map(o => o.split('|||')[1]?.trim() || o);

                    // Create a consistent shuffled version of right items for the dropdowns
                    // We use shuffledIndices as a seed to ensure stable shuffle per question per attempt
                    const shuffledRightItems = shuffledIndices.map(i => rightItems[i]);

                    const currentAns = Array.isArray(answers[q.id]) ? answers[q.id] : Array(q.options.length).fill("");

                    const handleMatchChange = (index: number, val: string) => {
                      if (isSubmitted) return;
                      const newArr = [...currentAns];
                      newArr[index] = `${leftItems[index]} ||| ${val}`;
                      handleSetAnswer(q.id, newArr);
                    };

                    return (
                      <div className="space-y-3">
                        {leftItems.map((left, idx) => {
                          const isCorrect = isSubmitted && viewPassFail && currentAns[idx] === q.options[idx];
                          const isWrong = isSubmitted && viewPassFail && currentAns[idx] !== q.options[idx] && currentAns[idx];

                          return (
                            <div key={idx} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-center ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                              <div className="flex-1 font-medium text-gray-800 text-center md:text-left">{left}</div>
                              <div className="mx-2 text-gray-400 hidden md:block">→</div>
                              <div className="flex-1 w-full">
                                <select
                                  disabled={isSubmitted}
                                  className="w-full p-2 border rounded border-gray-300 bg-white"
                                  value={currentAns[idx]?.split('|||')[1]?.trim() || ''}
                                  onChange={(e) => handleMatchChange(idx, e.target.value)}
                                >
                                  <option value="">--- Chọn đáp án nối ---</option>
                                  {shuffledRightItems.map((r, i) => (
                                    <option key={i} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                              {isSubmitted && viewPassFail && canViewSolution && isWrong && (
                                <div className="text-xs text-green-700 font-bold mt-2 md:mt-0 w-full md:w-auto text-center md:text-left">
                                  (Đúng: {q.options[idx].split('|||')[1]?.trim()})
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {q.type === 'ORDERING' && (() => {
                    // For ORDERING, we just let them pick positions from dropdowns 1 to N
                    const currentAns = Array.isArray(answers[q.id]) ? answers[q.id] : Array(q.options.length).fill("");
                    // Provide options to pick from (the shuffled ones)
                    const availableOptions = shuffledIndices.map(i => q.options[i]);

                    const handleOrderChange = (index: number, val: string) => {
                      if (isSubmitted) return;
                      const newArr = [...currentAns];
                      newArr[index] = val;
                      handleSetAnswer(q.id, newArr);
                    };

                    return (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-2 italic">Chọn mục tương ứng cho từng vị trí theo đúng thứ tự (từ Trên xuống Dưới):</p>
                        {q.options.map((_, idx) => {
                          const isCorrect = isSubmitted && viewPassFail && currentAns[idx] === q.options[idx];
                          const isWrong = isSubmitted && viewPassFail && currentAns[idx] !== q.options[idx] && currentAns[idx];

                          return (
                            <div key={idx} className={`p-3 rounded-lg border flex gap-4 items-center ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="w-20 font-bold text-gray-600 text-sm">Vị trí {idx + 1}:</div>
                              <select
                                disabled={isSubmitted}
                                className="flex-1 p-2 border rounded border-gray-300 bg-white"
                                value={currentAns[idx] || ''}
                                onChange={(e) => handleOrderChange(idx, e.target.value)}
                              >
                                <option value="">--- Chọn nội dung ---</option>
                                {availableOptions.map((opt, i) => (
                                  <option key={i} value={opt}>{opt}</option>
                                ))}
                              </select>
                              {isSubmitted && viewPassFail && canViewSolution && isWrong && (
                                <div className="text-xs text-green-700 font-bold mt-2 md:mt-0 w-full md:w-auto">
                                  (Đúng: {q.options[idx]})
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {q.type === 'DRAG_DROP' && (() => {
                    const currentAns = Array.isArray(answers[q.id]) ? answers[q.id] : Array(q.options.length).fill("");
                    const availableOptions = shuffledIndices.map(i => q.options[i]);

                    const handleDropChange = (index: number, val: string) => {
                      if (isSubmitted) return;
                      const newArr = [...currentAns];
                      newArr[index] = val;
                      handleSetAnswer(q.id, newArr);
                    };

                    // Parse content to replace [__] with selects
                    // We do this visually by just providing a list of dropdowns for each blank
                    return (
                      <div className="space-y-4 bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300">
                        <p className="text-sm text-gray-700 font-medium">Bên dưới là các ô trống xuất hiện trong đề bài. Hãy chọn đáp án để điền vào:</p>
                        <div className="flex flex-wrap gap-4">
                          {Array(q.options.length).fill(0).map((_, idx) => {
                            const isCorrect = isSubmitted && viewPassFail && currentAns[idx] === q.options[idx];
                            const isWrong = isSubmitted && viewPassFail && currentAns[idx] !== q.options[idx] && currentAns[idx];

                            return (
                              <div key={idx} className={`flex flex-col gap-1 p-2 rounded border ${isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                <label className="text-xs font-bold text-gray-500">Ô trống {idx + 1}</label>
                                <select
                                  disabled={isSubmitted}
                                  className="p-1 border rounded min-w-[120px]"
                                  value={currentAns[idx] || ''}
                                  onChange={(e) => handleDropChange(idx, e.target.value)}
                                >
                                  <option value=""></option>
                                  {availableOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                {isSubmitted && viewPassFail && canViewSolution && isWrong && (
                                  <div className="text-[10px] text-green-700 font-bold mt-1">Đúng: {q.options[idx]}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Bottom Submit Button */}
      {!isSubmitted && (
        <div className="mt-12 flex justify-center pb-12">
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center gap-3 animate-bounce-subtle"
          >
            <Send className="h-6 w-6" />
            Nộp bài tập
          </button>
        </div>
      )}
    </div>
  );
};
