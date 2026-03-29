import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { Trophy, Star, TrendingUp, TrendingDown, Users, Award, Clock, ChevronLeft, ChevronRight, Search, X, LayoutGrid } from 'lucide-react';

// --- Helper: Format date ---
const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const ClassFunDashboard: React.FC = () => {
    const { user, classes, users } = useStore();
    const { groups, logs, behaviors, groupMembers, isLoading, hasMoreLogs, fetchClassFunData, loadMoreBehaviorLogs } = useClassFunStore();
    const navigate = useNavigate();
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isStudentListModalOpen, setIsStudentListModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Chọn lớp (nếu giáo viên có nhiều lớp)
    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || '');

    // View mode
    const [viewMode, setViewMode] = useState<'week' | 'all'>('week');
    const [weekOffset, setWeekOffset] = useState(0);

    // Leaderboard Tab
    const [leaderboardTab, setLeaderboardTab] = useState<'top10' | 'all'>('top10');

    // Load data khi chọn lớp
    useEffect(() => {
        if (selectedClassId && user?.id) {
            fetchClassFunData(selectedClassId, user.id);
        }
    }, [selectedClassId, user?.id, fetchClassFunData]);

    // Auto-select first class
    useEffect(() => {
        if (!selectedClassId && myClasses.length > 0) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    // Lấy danh sách học sinh từ class
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id));
    }, [selectedClass, users]);

    // Tính tuần
    const { startDate, endDate, label } = useMemo(() => {
        const now = new Date();
        const target = new Date(now);
        target.setDate(target.getDate() + (weekOffset * 7));
        const day = target.getDay();
        const diff = target.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(target);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        let lbl = '';
        if (weekOffset === 0) lbl = 'Tuần Này';
        else if (weekOffset === -1) lbl = 'Tuần Trước';
        else lbl = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;

        return { startDate: start, endDate: end, label: lbl };
    }, [weekOffset]);

    // Lọc logs theo tuần
    const filteredLogs = useMemo(() => {
        if (viewMode === 'all') return logs;
        return logs.filter(l => {
            const t = new Date(l.created_at).getTime();
            return t >= startDate.getTime() && t <= endDate.getTime();
        });
    }, [logs, viewMode, startDate, endDate]);

    // Tính điểm từng học sinh
    const studentScores = useMemo(() => {
        const scores = new Map<string, number>();
        filteredLogs.forEach(l => {
            scores.set(l.student_id, (scores.get(l.student_id) || 0) + l.points);
        });
        return scores;
    }, [filteredLogs]);

    // Tính điểm tổ
    const groupScores = useMemo(() => {
        return groups.map(g => {
            const memberIds = groupMembers.filter(m => m.group_id === g.id).map(m => m.student_id);
            const totalPoints = memberIds.reduce((sum, id) => sum + (studentScores.get(id) || 0), 0);
            return { ...g, totalPoints, memberCount: memberIds.length };
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [groups, groupMembers, studentScores]);

    // Rank calculation and Top students
    const rankedStudents = useMemo(() => {
        const sorted = classStudents.map(s => ({
            ...s,
            score: studentScores.get(s.id) || 0,
        })).sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // Tie-breaker: if scores are equal, sort alphabetically for Top 10, but randomly for "All" to reduce pressure
            if (leaderboardTab === 'top10') {
                return a.name.localeCompare(b.name);
            } else {
                return Math.random() - 0.5;
            }
        });

        // Calculate actual rank (same score = same rank)
        let currentRank = 1;
        let lastScore = sorted.length > 0 ? sorted[0].score : 0;

        return sorted.map((s, index) => {
            if (s.score < lastScore) {
                currentRank = index + 1;
                lastScore = s.score;
            }
            return { ...s, rank: currentRank };
        });
    }, [classStudents, studentScores]);

    const topStudents = useMemo(() => rankedStudents.slice(0, 10), [rankedStudents]);

    // Max score for progress bar scaling
    const maxScore = useMemo(() => {
        return Math.max(1, ...rankedStudents.map(s => s.score));
    }, [rankedStudents]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-center">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Đang tải dữ liệu thi đua...</p>
                </div>
            </div>
        );
    }

    if (myClasses.length === 0) {
        return (
            <div className="text-center p-20 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold">Bạn chưa có lớp học nào.</p>
                <p className="text-sm mt-2">Vui lòng tạo lớp học trước khi sử dụng tính năng Thi Đua.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-amber-500" />
                        Bảng Thi Đua Lớp
                    </h1>
                    <p className="text-gray-500 mt-1">Theo dõi và quản lý hành vi học sinh</p>
                </div>

                {/* Class Selector */}
                {myClasses.length > 1 && (
                    <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                <button
                    onClick={() => setIsStudentListModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <LayoutGrid className="h-5 w-5" />
                    HỒ SƠ HS
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Theo Tuần
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Tất Cả
                    </button>
                </div>

                {viewMode === 'week' && (
                    <div className="flex items-center gap-4 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                        <button onClick={() => setWeekOffset(p => p - 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center min-w-[140px]">
                            <span className="block text-indigo-800 font-bold text-lg">{label}</span>
                            <span className="block text-indigo-500 text-xs font-medium">
                                {startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <button onClick={() => setWeekOffset(p => p + 1)} className="p-1 hover:bg-indigo-200 rounded-full text-indigo-600 transition" disabled={weekOffset >= 0}>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Điểm tốt</p>
                            <p className="text-xl font-bold text-emerald-600">
                                +{filteredLogs.filter(l => l.points > 0).reduce((s, l) => s + l.points, 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Điểm trừ</p>
                            <p className="text-xl font-bold text-red-600">
                                {filteredLogs.filter(l => l.points < 0).reduce((s, l) => s + l.points, 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Sĩ số</p>
                            <p className="text-xl font-bold text-blue-600">{classStudents.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Lượt ghi nhận</p>
                            <p className="text-xl font-bold text-amber-600">{filteredLogs.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group Leaderboard */}
            {groupScores.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Award className="h-6 w-6 text-amber-500" />
                        Bảng Xếp Hạng Tổ
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {groupScores.map((g, idx) => (
                            <div key={g.id} className={`rounded-xl p-4 text-white ${g.color} shadow-md relative overflow-hidden`}>
                                {idx === 0 && (
                                    <div className="absolute top-2 right-2 bg-white/20 rounded-full p-1">
                                        <Trophy className="h-5 w-5" />
                                    </div>
                                )}
                                <p className="font-bold text-lg">{g.name}</p>
                                <p className="text-3xl font-extrabold mt-2">{g.totalPoints} <span className="text-sm font-normal opacity-80">điểm</span></p>
                                <p className="text-sm opacity-80 mt-1">{g.memberCount} thành viên</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Individual Leaderboard */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Star className="h-6 w-6 text-amber-500" />
                        Bảng Xếp Hạng Học Sinh
                    </h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setLeaderboardTab('top10')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${leaderboardTab === 'top10' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Top 10
                        </button>
                        <button
                            onClick={() => setLeaderboardTab('all')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${leaderboardTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Cả Lớp
                        </button>
                    </div>
                </div>

                {(leaderboardTab === 'top10' ? topStudents : rankedStudents).length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Chưa có dữ liệu điểm.</p>
                ) : (
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${leaderboardTab === 'all' ? 'max-h-[600px] overflow-y-auto pr-2 p-1' : 'p-1'}`}>
                        {(leaderboardTab === 'top10' ? topStudents : rankedStudents).map((s) => {
                            const isTop3 = s.rank <= 3;
                            const percentage = Math.max(0, Math.min(100, (s.score / maxScore) * 100));

                            return (
                                <div key={s.id} className={`flex flex-col p-4 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1
                                    ${s.rank === 1 ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200' :
                                        s.rank === 2 ? 'bg-gradient-to-br from-gray-50 to-white border-gray-200' :
                                            s.rank === 3 ? 'bg-gradient-to-br from-orange-50 to-white border-orange-200' : 'bg-white border-gray-100'}`}>

                                    <div className="flex items-start justify-between mb-3">
                                        <div className="relative">
                                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm
                                                ${s.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-100' :
                                                    s.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 ring-2 ring-gray-100' :
                                                        s.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-orange-100' :
                                                            'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                }`}>
                                                #{s.rank}
                                            </span>
                                            {s.rank === 1 && <Trophy className="absolute -top-3 -right-3 h-6 w-6 text-amber-500 drop-shadow-sm" />}
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-black text-2xl leading-none ${s.score >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {s.score > 0 ? '+' : ''}{s.score}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">điểm</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <span onClick={() => navigate(`/teacher/portfolio/${s.id}`)} className={`block font-bold mb-2 truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors ${isTop3 ? 'text-gray-900' : 'text-gray-700'}`} title={`Xem Hồ Sơ ${s.name}`}>{s.name}</span>

                                        {/* Progress Bar representing score visually */}
                                        {s.score > 0 && (
                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all duration-1000 ease-out
                                                        ${s.rank === 1 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                                            s.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                                                s.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        )}
                                        {s.score <= 0 && (
                                            <div className="w-full bg-gray-50 rounded-full h-2.5 border border-dashed border-gray-200"></div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-indigo-500" />
                    Hoạt Động Gần Đây
                </h2>
                {filteredLogs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Chưa có hoạt động nào.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredLogs.slice(0, viewMode === 'week' ? filteredLogs.length : 50).map(l => {
                                const student = classStudents.find(s => s.id === l.student_id);
                                return (
                                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div>
                                            <span className="font-semibold text-gray-800">{student?.name || 'Không rõ'}</span>
                                            <span className="text-gray-500 text-sm ml-2">— {l.reason || 'Không có ghi chú'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold ${l.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {l.points > 0 ? '+' : ''}{l.points}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(l.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {viewMode === 'all' && hasMoreLogs && (
                            <div className="text-center pt-2 border-t border-gray-100">
                                <button
                                    onClick={async () => {
                                        setIsLoadingMore(true);
                                        await loadMoreBehaviorLogs(selectedClassId);
                                        setIsLoadingMore(false);
                                    }}
                                    disabled={isLoadingMore}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition disabled:opacity-50"
                                >
                                    {isLoadingMore ? 'Đang tải...' : 'Tải thêm lịch sử'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Student List Modal (Grid View) */}
            {isStudentListModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                            <div>
                                <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
                                    <Users className="h-6 w-6" />
                                    Hồ Sơ Học Sinh
                                </h2>
                                <p className="text-indigo-600 text-sm font-medium">Lớp: {selectedClass?.name}</p>
                            </div>
                            <button 
                                onClick={() => setIsStudentListModalOpen(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors text-indigo-900"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b bg-white">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm tên học sinh..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Student Grid */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {classStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Search className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Không tìm thấy học sinh nào khớp với "{searchTerm}"</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {classStudents
                                        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    navigate(`/teacher/portfolio/${s.id}`);
                                                    setIsStudentListModalOpen(false);
                                                }}
                                                className="group flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl transition-all hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1"
                                            >
                                                <div className="relative mb-3">
                                                    <img 
                                                        src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff`} 
                                                        alt="" 
                                                        className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:ring-4 ring-indigo-50 transition-all"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm text-center line-clamp-2 min-h-[40px] group-hover:text-indigo-600 transition-colors">
                                                    {s.name}
                                                </span>
                                                <div className="mt-2 text-[10px] font-bold text-indigo-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                                                    Xem Hồ Sơ →
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 bg-white border-t text-center text-xs text-gray-400">
                            Tổng số: {classStudents.length} học sinh
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
