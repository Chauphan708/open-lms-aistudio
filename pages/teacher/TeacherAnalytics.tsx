import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import {
  TrendingUp, TrendingDown, Minus, BookOpen, Brain, Target, AlertTriangle,
  Star, Zap, Clock, ChevronDown, Sparkles, RefreshCw, Award, BarChart3, Printer, Users, School, ArrowLeft, MessageSquare
} from 'lucide-react';
import { computeStudentAnalytics, TIME_PERIODS, TimePeriod, StudentAnalytics } from '../../utils/analyticsEngine';
import { getRecommendations, getRecentExamIds } from '../../utils/recommendationEngine';
import { generateTeacherStudentAnalysis } from '../../services/geminiService';

// ============================================================
// SUB COMPONENTS (Reused from LearningAnalytics or adapted)
// ============================================================

const ComboChart: React.FC<{ data: { label: string; avg: number; count: number; max: number; min: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
        Chưa có đủ dữ liệu để vẽ biểu đồ.
      </div>
    );
  }

  const W = 600;
  const H = 220;
  const padL = 36, padR = 16, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = 10;
  const barWidth = Math.max(8, Math.min(40, chartW / data.length - 6));

  const xPos = (i: number) => padL + (i + 0.5) * (chartW / data.length);
  const yPos = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const linePoints = data.map((d, i) => `${xPos(i)},${yPos(d.avg)}`).join(' ');
  const maxPoints = data.map((d, i) => `${xPos(i)},${yPos(d.max)}`).join(' ');

  const getBarColor = (avg: number) => {
    if (avg >= 8.5) return '#10b981';
    if (avg >= 6.5) return '#6366f1';
    if (avg >= 5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(300, data.length * 60) + 'px' }}>
        {[0, 2, 4, 6, 8, 10].map(v => (
          <g key={v}>
            <line x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padL - 4} y={yPos(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bx = xPos(i) - barWidth / 2;
          const bh = (d.avg / maxVal) * chartH;
          return (
            <g key={i}>
              <rect x={bx} y={yPos(d.avg)} width={barWidth} height={bh} fill={getBarColor(d.avg)} rx="3" opacity="0.85" />
              {d.count > 0 && <text x={xPos(i)} y={yPos(d.avg) - 3} textAnchor="middle" fontSize="8" fill="#6b7280">{d.count} bài</text>}
            </g>
          );
        })}
        <polyline points={maxPoints} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        <polyline points={linePoints} fill="none" stroke="#6366f1" strokeWidth="2.5" />
        {data.map((d, i) => <circle key={i} cx={xPos(i)} cy={yPos(d.avg)} r="4" fill="#6366f1" stroke="white" strokeWidth="1.5" />)}
        {data.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

const RateBar: React.FC<{ label: string; rate: number; color: string }> = ({ label, rate, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-gray-900">{rate}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${rate}%` }} />
    </div>
  </div>
);

const WeakTopicCard: React.FC<{ topic: string; subject: string; rate: number; attempts: number }> = ({ topic, subject, rate, attempts }) => (
  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
    <div className="min-w-0">
      <div className="font-bold text-red-800 text-sm truncate">{topic}</div>
      <div className="text-xs text-red-600">{subject} • {attempts} lần làm</div>
    </div>
    <div className="ml-3 flex-shrink-0">
      <span className="inline-block bg-red-100 text-red-700 font-bold text-xs px-2 py-1 rounded-full">{rate}% sai</span>
    </div>
  </div>
);

// ============================================================
// MAIN PAGE
// ============================================================

export const TeacherAnalytics: React.FC = () => {
  const { user: currentUser, classes, users, attempts, exams, questionBank } = useStore();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TIME_PERIODS[1]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [teacherComment, setTeacherComment] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { addNotification } = useStore();

  // Filter classes taught by this teacher
  const myClasses = useMemo(() => classes.filter(c => c.teacherId === currentUser?.id), [classes, currentUser]);

  // Students in selected class
  const studentsInClass = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return [];
    return users.filter(u => cls.studentIds.includes(u.id));
  }, [selectedClassId, classes, users]);

  // Selected student object
  const selectedStudent = useMemo(() => users.find(u => u.id === selectedStudentId), [selectedStudentId, users]);

  // Reset student selection when class changes
  useEffect(() => {
    setSelectedStudentId('');
    setAiInsight(null);
  }, [selectedClassId]);

  // Formatting helper
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  // Analytics calculation
  const analytics: StudentAnalytics | null = useMemo(() => {
    if (!selectedStudentId) return null;
    return computeStudentAnalytics(selectedStudentId, attempts, exams, questionBank, selectedPeriod.days);
  }, [selectedStudentId, attempts, exams, questionBank, selectedPeriod]);

  // Recommendation calculation
  const recommendations = useMemo(() => {
    if (!analytics || !selectedStudentId) return null;
    const recentExamIds = getRecentExamIds(selectedStudentId, attempts, 7);
    return getRecommendations(analytics, exams, questionBank, recentExamIds, 6, 8);
  }, [analytics, selectedStudentId, attempts, exams, questionBank]);

  // AI Insight handle
  const handleGetAIInsight = useCallback(async () => {
    if (!analytics || !selectedStudent) return;
    setIsLoadingAI(true);
    try {
      const result = await generateTeacherStudentAnalysis(selectedStudent.name, analytics);
      setAiInsight(result);
      setTeacherComment(result); // Auto-fill comment with AI insight
    } catch (e: any) {
      setAiInsight(`Lỗi AI: ${e.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [analytics, selectedStudent]);

  const handleSendComment = useCallback(async () => {
    if (!selectedStudentId || !teacherComment.trim()) return;
    setIsSending(true);
    try {
      await addNotification({
        id: `notif_ana_${Date.now()}`,
        userId: selectedStudentId,
        type: 'INFO',
        title: 'Nhận xét từ Giáo viên (Phân tích học tập)',
        message: teacherComment.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/student/analytics'
      });
      alert('Đã gửi nhận xét đến học sinh thành công!');
    } catch (e: any) {
      alert(`Lỗi khi gửi: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  }, [selectedStudentId, teacherComment, addNotification]);

  if (!currentUser || currentUser.role !== 'TEACHER') {
    return <div className="p-8 text-center text-gray-500">Trang này dành cho giáo viên.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* SELECTION HEADER */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <School className="h-4 w-4" /> Chọn Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Chọn lớp --</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" /> Chọn Học sinh
            </label>
            <select
              disabled={!selectedClassId}
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50"
            >
              <option value="">-- Chọn học sinh --</option>
              {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
            </select>
          </div>

          <div className="flex-shrink-0 space-y-2 min-w-[150px]">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Thời gian
            </label>
            <select
              value={selectedPeriod.days}
              onChange={e => {
                const p = TIME_PERIODS.find(t => t.days === Number(e.target.value));
                if (p) setSelectedPeriod(p);
              }}
              className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {TIME_PERIODS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-600">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400">Vui lòng chọn lớp và học sinh để bắt đầu xem báo cáo phân tích.</p>
        </div>
      ) : analytics && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          
          {/* STUDENT INFO HEADER */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                {selectedStudent?.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedStudent?.name}</h1>
                <p className="text-indigo-100 text-sm flex items-center gap-2">
                  {selectedStudent?.email} • {selectedPeriod.label} qua
                </p>
              </div>
            </div>
            <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl border border-white/30 transition-all no-print">
              <Printer className="h-5 w-5" />
            </button>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Target, label: 'Bài đã nộp', value: analytics.totalAttempts, color: 'bg-indigo-100 text-indigo-600' },
              { icon: Star, label: 'Điểm TB', value: `${fmt(analytics.avgScore)}/10`, color: 'bg-amber-100 text-amber-600' },
              { icon: TrendingUp, label: 'Điểm cao nhất', value: `${fmt(analytics.maxScore)}/10`, color: 'bg-emerald-100 text-emerald-600' },
              { icon: Zap, label: 'Chuỗi ngày học', value: `${analytics.studyStreak} ngày`, color: 'bg-purple-100 text-purple-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">{card.label}</div>
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Chart & AI */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CHART */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Tiến độ học tập
                </h2>
                <ComboChart data={analytics.chartData} />
              </div>

              {/* AI ANALYSIS */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 border-l-4 border-l-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" /> AI Nhận xét Sư phạm
                  </h2>
                  <button
                    onClick={handleGetAIInsight}
                    disabled={isLoadingAI}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all"
                  >
                    {isLoadingAI ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Phân tích qua AI
                  </button>
                </div>
                {aiInsight ? (
                  <div className="bg-purple-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed italic">
                    {aiInsight}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6 border border-dashed rounded-xl">
                    Nhấn nút "Phân tích qua AI" để xem nhận xét chuyên sâu về học sinh này.
                  </p>
                )}

                {/* TEACHER COMMENT BOX */}
                <div className="mt-6 pt-6 border-t space-y-3">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" /> Nhận xét & Gợi ý gửi học sinh
                  </label>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Nhập nhận xét hoặc chỉnh sửa gợi ý từ AI để gửi cho học sinh..."
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendComment}
                      disabled={isSending || !teacherComment.trim()}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                      {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Gửi nhận xét cho học sinh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Weak Topics & Subjects */}
            <div className="space-y-6">
              
              {/* WEAK TOPICS */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" /> Kiến thức cần lưu ý
                </h2>
                {analytics.weakTopics.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">Học sinh này đang làm rất tốt, chưa có chủ đề yếu cụ thể.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.weakTopics.slice(0, 5).map((t, i) => (
                      <WeakTopicCard key={i} topic={t.topic} subject={t.subject} rate={t.incorrectRate} attempts={t.attempts} />
                    ))}
                  </div>
                )}
              </div>

              {/* SUBJECT BREAKDOWN */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Kết quả theo môn
                </h2>
                <div className="space-y-4">
                  {analytics.bySubject.map(s => (
                    <div key={s.subject}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-bold text-gray-700">{s.subject}</span>
                        <span className="font-bold">{fmt(s.avgScore)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${s.avgScore >= 8 ? 'bg-emerald-500' : s.avgScore >= 5 ? 'bg-indigo-500' : 'bg-red-500'}`}
                          style={{ width: `${(s.avgScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RECOMMENDATIONS */}
          {recommendations && recommendations.recommendedExams.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" /> Bài tập can thiệp đề xuất
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.recommendedExams.slice(0, 3).map((rec, i) => (
                  <div key={rec.exam.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 italic mb-2">
                      "{rec.reasons[0]}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
