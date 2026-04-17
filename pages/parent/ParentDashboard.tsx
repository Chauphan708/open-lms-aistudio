import React, { useState, useEffect } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { User, Users, Activity, FileText, CheckCircle, AlertTriangle, Medal, Layers } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export const ParentDashboard = () => {
  const { currentParent, linkedStudents } = useParentStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [stats, setStats] = useState({
    attemptsCount: 0,
    tt27Comment: '',
    behaviorPoints: 0,
    weeklyBehaviorPoints: 0,
    arenaRank: '--',
    isLoading: false
  });
  const [recentBehaviors, setRecentBehaviors] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    if (linkedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentStats(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchStudentStats = async (studentId: string) => {
    setStats(prev => ({ ...prev, isLoading: true }));
    try {
      // 1. Số bài nộp
      const { count: attemptsCount } = await supabase
        .from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      // 2. Nhận xét TT27 mới nhất
      const { data: evalData } = await supabase
        .from('daily_evaluations')
        .select('general_comment')
        .eq('student_id', studentId)
        .order('evaluation_date', { ascending: false })
        .limit(1);

      // 3. XP tích lũy từ profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', studentId)
        .single();

      // 4. Nhật ký hành vi gần đây
      const { data: behaviorData } = await supabase
        .from('behavior_logs')
        .select('*, behaviors(description, type, points)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Tính điểm hành vi tuần này (7 ngày gần nhất)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: weeklyBehavior } = await supabase
        .from('behavior_logs')
        .select('points')
        .eq('student_id', studentId)
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const weeklyPoints = (weeklyBehavior || []).reduce((sum, log) => sum + (log.points || 0), 0);

      // 6. Bài làm gần đây
      const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('*, exams(title, subject)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(3);

      setRecentBehaviors(behaviorData || []);
      setRecentExams(recentAttempts || []);
      setStats({
        attemptsCount: attemptsCount || 0,
        tt27Comment: evalData?.[0]?.general_comment || 'Chưa có nhận xét gần đây',
        behaviorPoints: profile?.xp || 0,
        weeklyBehaviorPoints: weeklyPoints,
        arenaRank: profile?.level ? `Cấp ${profile.level}` : '--',
        isLoading: false
      });
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const activeStudent = linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0];

  return (
    <ParentLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header & Multi-child selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tổng quan học tập</h1>
            <p className="text-gray-500">Xem tiến độ và thông báo mới nhất</p>
          </div>

          {linkedStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-500 px-2">Chọn hồ sơ con:</span>
              {linkedStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedStudentId === student.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {student.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeStudent ? (
          <>
            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-lg">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 shrink-0">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold mb-1">{activeStudent.name}</h2>
                <div className="flex flex-wrap gap-4 text-emerald-100">
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                    Mã HS: {activeStudent.id.substring(0,8).toUpperCase()}
                  </span>
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                    Lớp: {activeStudent.className || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">Nhận xét TT27</p>
                    <p className="text-sm font-bold text-gray-900 truncate" title={stats.tt27Comment}>
                      {stats.isLoading ? '...' : stats.tt27Comment}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Bài đã nộp</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.attemptsCount}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">XP tích lũy</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.behaviorPoints}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Danh hiệu</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.arenaRank}
                    </p>
                  </div>
               </div>
            </div>

            {/* Content Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <Activity className="text-emerald-500 w-5 h-5" /> Nhật ký hành vi mới nhất
                 </h3>
                 <div className="flex-1 space-y-3">
                   {stats.isLoading ? (
                     <div className="animate-pulse space-y-2">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
                     </div>
                   ) : recentBehaviors.length > 0 ? (
                     recentBehaviors.map((log) => (
                       <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              log.points >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.points >= 0 ? `+${log.points}` : log.points}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{log.reason || log.behaviors?.description || 'Ghi nhận hành vi'}</p>
                              <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                       <Layers className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm">Chưa có nhật ký hành vi</p>
                     </div>
                   )}
                 </div>
                 {recentBehaviors.length > 0 && (
                   <button 
                    onClick={() => window.location.href = '/parent/behavior'}
                    className="mt-4 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-2 border-t border-gray-100 w-full"
                   >
                     Xem tất cả nhật ký
                   </button>
                 )}
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <FileText className="text-blue-500 w-5 h-5" /> Bài làm gần đây
                 </h3>
                 <div className="flex-1 space-y-3">
                   {stats.isLoading ? (
                     <div className="animate-pulse space-y-2">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
                     </div>
                   ) : recentExams.length > 0 ? (
                     recentExams.map((attempt) => (
                       <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="min-w-0 mr-2">
                            <p className="text-sm font-bold text-gray-800 truncate">{attempt.exams?.title}</p>
                            <p className="text-[10px] text-gray-400">{attempt.exams?.subject} • {new Date(attempt.submitted_at).toLocaleDateString('vi-VN')}</p>
                         </div>
                         <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
                           {attempt.score !== null ? attempt.score : '--'}đ
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                       <Layers className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm">Chưa có bài làm nào</p>
                     </div>
                   )}
                 </div>
                 {recentExams.length > 0 && (
                   <button 
                    onClick={() => window.location.href = '/parent/exams'}
                    className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 border-t border-gray-100 w-full"
                   >
                     Xem lịch sử học tập
                   </button>
                 )}
               </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-gray-100">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Users className="w-10 h-10 text-gray-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có dữ liệu học sinh</h3>
             <p className="text-gray-500">Giáo viên chủ nhiệm chưa tạo liên kết nào cho tài khoản của bạn.</p>
          </div>
        )}

      </div>
    </ParentLayout>
  );
};
