import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { Trophy, Star, TrendingUp, TrendingDown, Users, Award, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Helper: Format date ---
const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const ClassFunDashboard: React.FC = () => {
    const { user, classes, users } = useStore();
    const { groups, logs, behaviors, groupMembers, isLoading, fetchClassFunData } = useClassFunStore();

    // Chọn lớp (nếu giáo viên có nhiều lớp)
    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || '');

    // View mode
    const [viewMode, setViewMode] = useState<'week' | 'all'>('week');
    const [weekOffset, setWeekOffset] = useState(0);

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

    // Top students
    const topStudents = useMemo(() => {
        return classStudents.map(s => ({
            ...s,
            score: studentScores.get(s.id) || 0,
        })).sort((a, b) => b.score - a.score).slice(0, 10);
    }, [classStudents, studentScores]);

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
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Top 10 Học Sinh
                </h2>
                {topStudents.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Chưa có dữ liệu điểm.</p>
                ) : (
                    <div className="space-y-2">
                        {topStudents.map((s, idx) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-indigo-400'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-semibold text-gray-800">{s.name}</span>
                                </div>
                                <span className={`font-bold text-lg ${s.score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {s.score > 0 ? '+' : ''}{s.score}
                                </span>
                            </div>
                        ))}
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
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredLogs.slice(0, 20).map(l => {
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
                )}
            </div>
        </div>
    );
};
