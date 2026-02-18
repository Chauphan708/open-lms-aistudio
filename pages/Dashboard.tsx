import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { 
  BookOpen, 
  Users, 
  Clock, 
  TrendingUp, 
  Bell, 
  CheckCircle, 
  School,
  Award,
  Crown,
  Zap,
  Star,
  Target,
  Briefcase,
  HelpCircle,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DiscussionSession, DiscussionRound } from '../types';

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { exams, user, attempts, users, classes } = useStore();
  const navigate = useNavigate();
  const [showGamificationGuide, setShowGamificationGuide] = useState(false);

  // --- LOGIC FOR STUDENTS (GAMIFICATION) ---
  const studentGamification = useMemo(() => {
    if (user?.role !== 'STUDENT') return null;

    const myAttempts = attempts.filter(a => a.studentId === user.id);
    
    // 1. Calculate XP & Level
    // Formula: Score * 10 XP. 
    const totalXP = myAttempts.reduce((acc, curr) => acc + ((curr.score || 0) * 10), 0);
    const level = Math.floor(totalXP / 100) + 1;
    const currentLevelXP = totalXP % 100; // Progress to next level (0-100)
    
    // 2. Badges System
    const badges = [
      {
        id: 'badge_first',
        name: 'Khởi hành',
        description: 'Hoàn thành bài thi đầu tiên',
        icon: Target,
        color: 'text-blue-600 bg-blue-100',
        unlocked: myAttempts.length > 0,
        condition: 'Hoàn thành 1 bài thi bất kỳ'
      },
      {
        id: 'badge_hardwork',
        name: 'Ong chăm chỉ',
        description: 'Hoàn thành 5 bài thi',
        icon: Briefcase,
        color: 'text-orange-600 bg-orange-100',
        unlocked: myAttempts.length >= 5,
        condition: 'Hoàn thành tích lũy 5 bài thi'
      },
      {
        id: 'badge_perfect',
        name: 'Xuất sắc',
        description: 'Đạt điểm 10 tuyệt đối',
        icon: Star,
        color: 'text-yellow-600 bg-yellow-100',
        unlocked: myAttempts.some(a => (a.score || 0) >= 10),
        condition: 'Đạt điểm 10 trong một bài thi'
      },
      {
        id: 'badge_pro',
        name: 'Thần đồng',
        description: 'Đạt cấp độ 5',
        icon: Crown,
        color: 'text-purple-600 bg-purple-100',
        unlocked: level >= 5,
        condition: 'Tích lũy XP để đạt Level 5'
      }
    ];

    // 3. Leaderboard Calculation (Top 5 Students)
    const allStudents = users.filter(u => u.role === 'STUDENT');
    const leaderboard = allStudents.map(student => {
      const sAttempts = attempts.filter(a => a.studentId === student.id);
      const totalScore = sAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
      return { ...student, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5); // Top 5

    return { totalXP, level, currentLevelXP, badges, leaderboard };
  }, [user, attempts, users]);

  // --- LOGIC FOR BASIC STATS ---
  const studentStats = useMemo(() => {
    if (user?.role !== 'STUDENT') return null;

    const myAttempts = attempts.filter(a => a.studentId === user.id);
    const examsTakenCount = myAttempts.length;
    
    const totalScore = myAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
    // Format average score with comma
    const avgScore = examsTakenCount > 0 ? (totalScore / examsTakenCount).toFixed(1).replace('.', ',') : 'N/A';

    const totalMinutes = myAttempts.reduce((acc, att) => {
        const exam = exams.find(e => e.id === att.examId);
        return acc + (exam?.durationMinutes || 0);
    }, 0);
    const studyHours = (totalMinutes / 60).toFixed(1).replace('.', ',');

    const myClass = classes.find(c => c.studentIds.includes(user.id || ''));

    return { examsTakenCount, avgScore, studyHours, className: myClass?.name || 'Chưa vào lớp' };
  }, [user, attempts, exams, classes]);

  // --- SHARED ACTIVITIES ---
  const recentActivities = useMemo(() => {
    const activities = [];

    // Exam Creation Events
    exams.forEach(exam => {
      activities.push({
        id: `new_${exam.id}`,
        type: 'NEW_EXAM',
        title: `Đề thi mới: "${exam.title}"`,
        time: new Date(exam.createdAt),
        user: null
      });
    });

    // Attempt Events
    attempts.forEach(att => {
        if (user?.role === 'STUDENT' && att.studentId !== user.id) return;

        const studentName = users.find(u => u.id === att.studentId)?.name || 'Học sinh';
        const examTitle = exams.find(e => e.id === att.examId)?.title || 'Đề thi';
        
        activities.push({
            id: `att_${att.id}`,
            type: 'SUBMISSION',
            title: user?.role === 'STUDENT' 
                ? `Bạn đã nộp bài "${examTitle}"` 
                : `${studentName} đã nộp bài "${examTitle}"`,
            time: new Date(att.submittedAt),
            user: att.studentId
        });
    });

    return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [exams, attempts, user, users]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vừa xong";
  };

  // --- RENDER FOR STUDENT ---
  if (user?.role === 'STUDENT') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user?.name} 👋</h1>
            <p className="text-gray-500 mt-1">Cố gắng thăng hạng và thu thập huy hiệu nhé!</p>
          </div>
          
          <div className="flex gap-2">
             <button 
                onClick={() => setShowGamificationGuide(true)}
                className="bg-white border text-indigo-600 px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-50 flex items-center gap-2 font-bold"
             >
                <HelpCircle className="h-5 w-5" /> Hướng dẫn thăng hạng
             </button>
             <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg">
                  <Zap className="h-5 w-5" />
               </div>
               <div>
                  <div className="text-xs font-medium opacity-90">Level {studentGamification?.level}</div>
                  <div className="font-bold text-lg">{studentGamification?.totalXP} XP</div>
               </div>
             </div>
          </div>
        </div>

        {/* Gamification Progress */}
        <div className="bg-white p-6 rounded-xl border shadow-sm relative overflow-hidden">
           <div className="flex justify-between text-sm font-medium mb-2 text-gray-600">
              <span>Tiến độ cấp độ {studentGamification?.level}</span>
              <span>{studentGamification?.currentLevelXP} / 100 XP</span>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${studentGamification?.currentLevelXP}%` }}
              ></div>
           </div>
           <p className="text-xs text-gray-400 mt-2">Hoàn thành thêm bài thi để nhận điểm kinh nghiệm.</p>
        </div>

        {/* Basic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Đề đã làm" value={studentStats?.examsTakenCount} color="bg-blue-500" />
          <StatCard icon={TrendingUp} label="Điểm trung bình" value={studentStats?.avgScore} color="bg-green-500" />
          <StatCard icon={Clock} label="Giờ học tích lũy" value={`${studentStats?.studyHours}h`} color="bg-orange-500" />
          <StatCard icon={School} label="Lớp hiện tại" value={studentStats?.className} color="bg-indigo-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Badges & Activities */}
           <div className="lg:col-span-2 space-y-6">
             {/* Badges */}
             <div className="bg-white p-6 rounded-xl border shadow-sm">
               <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <Award className="text-yellow-500" /> Bộ sưu tập huy hiệu
               </h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {studentGamification?.badges.map(badge => {
                   const BadgeIcon = badge.icon;
                   return (
                     <div key={badge.id} className={`p-4 rounded-lg border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-white border-indigo-100 hover:shadow-md' : 'bg-gray-50 opacity-60 grayscale'}`}>
                        <div className={`p-3 rounded-full mb-2 ${badge.unlocked ? badge.color : 'bg-gray-200 text-gray-500'}`}>
                           <BadgeIcon className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-sm text-gray-900">{badge.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                     </div>
                   );
                 })}
               </div>
             </div>

             {/* Recent Activity */}
             <div className="bg-white p-6 rounded-xl border shadow-sm">
               <h2 className="text-lg font-bold text-gray-900 mb-4">Hoạt động & Thông báo</h2>
               <div className="space-y-4">
                 {recentActivities.map(act => (
                   <div key={act.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 
                        ${act.type === 'NEW_EXAM' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                        {act.type === 'NEW_EXAM' ? <Bell className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{act.title}</p>
                        <p className="text-xs text-gray-500">{getTimeAgo(act.time)}</p>
                      </div>
                   </div>
                 ))}
                 {recentActivities.length === 0 && <p className="text-gray-500 text-sm">Chưa có hoạt động nào.</p>}
               </div>
             </div>
           </div>

           {/* Leaderboard */}
           <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="text-yellow-500 h-5 w-5" /> Bảng Xếp Hạng
                </h2>
              </div>
              <div className="space-y-4">
                 {studentGamification?.leaderboard.map((s, index) => (
                    <div key={s.id} className="flex items-center gap-3">
                       <div className={`
                         w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                         ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                           index === 1 ? 'bg-gray-100 text-gray-700' : 
                           index === 2 ? 'bg-orange-100 text-orange-800' : 'text-gray-500'}
                       `}>
                         {index + 1}
                       </div>
                       <img src={s.avatar} alt="" className="w-10 h-10 rounded-full border" />
                       <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${s.id === user.id ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {s.id === user.id ? 'Bạn' : s.name}
                          </p>
                          <p className="text-xs text-gray-500">{Math.floor(s.totalScore * 10)} XP</p>
                       </div>
                       {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                 ))}
                 <div className="pt-4 border-t text-center">
                    <Link to="/exams" className="text-xs text-indigo-600 font-medium hover:underline">
                      Làm thêm bài tập để leo rank!
                    </Link>
                 </div>
              </div>
           </div>
        </div>

        {/* GAMIFICATION GUIDE MODAL */}
        {showGamificationGuide && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Award className="text-indigo-600" /> Hệ thống thăng hạng & Huy hiệu
                     </h2>
                     <button onClick={() => setShowGamificationGuide(false)} className="hover:bg-gray-100 p-2 rounded-full"><X className="h-6 w-6" /></button>
                  </div>
                  <div className="p-6 space-y-6">
                     {/* Section 1: XP & Level */}
                     <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="font-bold text-indigo-800 text-lg mb-3 flex items-center gap-2"><Zap className="h-5 w-5" /> Cách tính điểm XP & Cấp độ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="bg-white p-4 rounded-lg shadow-sm">
                              <p className="font-bold text-gray-700 mb-1">Công thức tính XP</p>
                              <p className="text-3xl font-bold text-indigo-600">1 Điểm = 10 XP</p>
                              <p className="text-xs text-gray-500 mt-2">Ví dụ: Bài thi được 8.5 điểm => Bạn nhận được 85 XP.</p>
                           </div>
                           <div className="bg-white p-4 rounded-lg shadow-sm">
                              <p className="font-bold text-gray-700 mb-1">Cấp độ (Level)</p>
                              <p className="text-sm text-gray-600 mb-2">Mỗi 100 XP bạn sẽ tăng 1 cấp độ.</p>
                              <div className="w-full bg-gray-200 h-2 rounded-full mb-1">
                                 <div className="bg-indigo-500 h-2 rounded-full w-3/4"></div>
                              </div>
                              <p className="text-xs text-gray-400">Level hiện tại phụ thuộc vào tổng số bài tập bạn đã hoàn thành.</p>
                           </div>
                        </div>
                     </div>

                     {/* Section 2: Badges Table */}
                     <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" /> Danh hiệu & Huy hiệu</h3>
                        <div className="overflow-hidden border rounded-xl">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-700 font-bold uppercase">
                                 <tr>
                                    <th className="px-4 py-3">Huy hiệu</th>
                                    <th className="px-4 py-3">Tên danh hiệu</th>
                                    <th className="px-4 py-3">Điều kiện mở khóa</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y">
                                 {studentGamification?.badges.map((b) => {
                                    const BIcon = b.icon;
                                    return (
                                       <tr key={b.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3">
                                             <div className={`p-2 rounded-full w-fit ${b.unlocked ? b.color : 'bg-gray-200 text-gray-400 grayscale'}`}>
                                                <BIcon className="h-5 w-5" />
                                             </div>
                                          </td>
                                          <td className="px-4 py-3 font-bold text-gray-900">{b.name}</td>
                                          <td className="px-4 py-3 text-gray-600">{b.condition}</td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 text-center">
                     <button onClick={() => setShowGamificationGuide(false)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">Đã hiểu, tôi sẽ cố gắng!</button>
                  </div>
               </div>
            </div>
        )}
      </div>
    );
  }

  // --- RENDER FOR TEACHER / ADMIN ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Khu vực quản trị, {user?.name} 👋</h1>
            <p className="text-gray-500 mt-1">Tổng quan hệ thống và tình hình lớp học.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Tổng giáo viên" value={users.filter(u => u.role === 'TEACHER').length} color="bg-purple-500" />
        <StatCard icon={Users} label="Tổng học sinh" value={users.filter(u => u.role === 'STUDENT').length} color="bg-green-500" />
        <StatCard icon={BookOpen} label="Tổng số đề thi" value={exams.length} color="bg-blue-500" />
        <StatCard icon={TrendingUp} label="Lượt nộp bài" value={attempts.length} color="bg-indigo-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
           <h2 className="text-lg font-bold text-gray-900 mb-4">Hoạt động gần đây (Toàn hệ thống)</h2>
           <div className="space-y-4">
             {recentActivities.map(act => (
                 <div key={act.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 
                      ${act.type === 'NEW_EXAM' ? 'bg-blue-500' : 'bg-green-500'}`}>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{act.title}</p>
                      <p className="text-xs text-gray-500">{getTimeAgo(act.time)}</p>
                    </div>
                 </div>
               ))}
              {recentActivities.length === 0 && <p className="text-gray-500 text-sm">Chưa có hoạt động nào.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};