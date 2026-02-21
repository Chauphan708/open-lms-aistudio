import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore, Behavior } from '../../services/classFunStore';
import {
    ThumbsUp, ThumbsDown, Search, Plus, X, CheckSquare, Square, Zap,
    Edit2, Trash2, Save, ChevronDown, ChevronUp, Users, Sparkles, Dices
} from 'lucide-react';

// --- Default behaviors for seeding ---
const DEFAULT_POSITIVE: Omit<Behavior, 'id' | 'teacher_id'>[] = [
    { description: 'Phát biểu xây dựng bài', type: 'POSITIVE', points: 5 },
    { description: 'Hoàn thành bài tập tốt', type: 'POSITIVE', points: 5 },
    { description: 'Giúp đỡ bạn bè', type: 'POSITIVE', points: 3 },
    { description: 'Giữ trật tự tốt', type: 'POSITIVE', points: 3 },
    { description: 'Tham gia tích cực', type: 'POSITIVE', points: 5 },
    { description: 'Sáng tạo, đổi mới', type: 'POSITIVE', points: 10 },
];
const DEFAULT_NEGATIVE: Omit<Behavior, 'id' | 'teacher_id'>[] = [
    { description: 'Nói chuyện riêng', type: 'NEGATIVE', points: -3 },
    { description: 'Không làm bài tập', type: 'NEGATIVE', points: -5 },
    { description: 'Đi trễ', type: 'NEGATIVE', points: -3 },
    { description: 'Thiếu tập trung', type: 'NEGATIVE', points: -2 },
    { description: 'Vi phạm nội quy', type: 'NEGATIVE', points: -5 },
];

export const ClassFunRecord: React.FC = () => {
    const { user, classes, users } = useStore();
    const {
        behaviors, logs, groupMembers, groups, isLoading,
        fetchClassFunData, addBehavior, updateBehavior, deleteBehavior, batchAddBehaviorLogs,
        attendance, fetchAttendance, deleteBehaviorLog
    } = useClassFunStore();

    // --- States ---
    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState(myClasses[0]?.id || '');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [showManageBehaviors, setShowManageBehaviors] = useState(false);
    const [showSuccess, setShowSuccess] = useState<{ points: number; count: number } | null>(null);

    // New behavior form
    const [newBehavior, setNewBehavior] = useState({ description: '', type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE', points: 5 });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Load data
    useEffect(() => {
        if (selectedClassId && user?.id) {
            fetchClassFunData(selectedClassId, user.id);
        }
    }, [selectedClassId, user?.id, fetchClassFunData]);

    const todayStr = new Date().toLocaleDateString('en-CA');
    useEffect(() => {
        if (selectedClassId) {
            fetchAttendance(selectedClassId, todayStr);
        }
    }, [selectedClassId, todayStr, fetchAttendance]);

    useEffect(() => {
        if (!selectedClassId && myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    }, [myClasses, selectedClassId]);

    // Students in class
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id));
    }, [selectedClass, users]);

    // Check attendance status
    const currentAttendance = useMemo(() => {
        const map: Record<string, 'present' | 'excused' | 'unexcused'> = {};
        attendance.forEach(a => map[a.student_id] = a.status);
        return map;
    }, [attendance]);

    // Filter students
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return classStudents;
        const q = searchQuery.toLowerCase();
        return classStudents.filter(s => s.name.toLowerCase().includes(q));
    }, [classStudents, searchQuery]);

    // Student scores
    const studentScores = useMemo(() => {
        const scores = new Map<string, number>();
        logs.forEach(l => { scores.set(l.student_id, (scores.get(l.student_id) || 0) + l.points); });
        return scores;
    }, [logs]);

    // Toggle student selection
    const toggleStudent = (id: string) => {
        if (currentAttendance[id] === 'excused' || currentAttendance[id] === 'unexcused') return;
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const selectAll = () => setSelectedStudentIds(classStudents.filter(s => currentAttendance[s.id] !== 'excused' && currentAttendance[s.id] !== 'unexcused').map(s => s.id));
    const deselectAll = () => setSelectedStudentIds([]);
    const selectGroup = (groupId: string) => {
        const memberIds = groupMembers.filter(m => m.group_id === groupId).map(m => m.student_id);
        const validIds = memberIds.filter(id => currentAttendance[id] !== 'excused' && currentAttendance[id] !== 'unexcused');
        setSelectedStudentIds(validIds);
        // Note: Replacing instead of adding is more convenient when clicking 'Chọn Tổ 1'
    };

    const randomSelect = (poolIds: string[], count: number) => {
        const validIds = poolIds.filter(id => currentAttendance[id] !== 'excused' && currentAttendance[id] !== 'unexcused');
        const shuffled = [...validIds].sort(() => 0.5 - Math.random());
        setSelectedStudentIds(shuffled.slice(0, count));
    };

    // Group students by group
    const groupedStudents = useMemo(() => {
        const result = {
            groups: groups.map(g => ({ ...g, students: [] as typeof filteredStudents })).sort((a, b) => a.sort_order - b.sort_order),
            ungrouped: [] as typeof filteredStudents
        };

        filteredStudents.forEach(s => {
            const member = groupMembers.find(m => m.student_id === s.id);
            if (member) {
                const groupIndex = result.groups.findIndex(g => g.id === member.group_id);
                if (groupIndex !== -1) {
                    result.groups[groupIndex].students.push(s);
                } else {
                    result.ungrouped.push(s);
                }
            } else {
                result.ungrouped.push(s);
            }
        });

        return result;
    }, [filteredStudents, groups, groupMembers]);

    // Apply behavior
    const applyBehavior = async (behavior: Behavior) => {
        if (selectedStudentIds.length === 0) return;
        const logsToAdd = selectedStudentIds.map(sid => ({
            student_id: sid,
            class_id: selectedClassId,
            behavior_id: behavior.id,
            points: behavior.points,
            reason: customReason || behavior.description,
            recorded_by: user?.id || null,
        }));
        await batchAddBehaviorLogs(logsToAdd);
        setShowSuccess({ points: behavior.points, count: selectedStudentIds.length });
        setSelectedStudentIds([]);
        setCustomReason('');
        setTimeout(() => setShowSuccess(null), 2000);
    };

    // Add custom behavior
    const handleAddBehavior = async () => {
        if (!newBehavior.description.trim() || !user?.id) return;
        await addBehavior({
            teacher_id: user.id,
            description: newBehavior.description,
            type: newBehavior.type,
            points: newBehavior.type === 'NEGATIVE' ? -Math.abs(newBehavior.points) : Math.abs(newBehavior.points),
        });
        setNewBehavior({ description: '', type: 'POSITIVE', points: 5 });
    };

    // Seed default behaviors
    const seedDefaults = async () => {
        if (!user?.id) return;
        for (const b of [...DEFAULT_POSITIVE, ...DEFAULT_NEGATIVE]) {
            await addBehavior({ ...b, teacher_id: user.id });
        }
    };

    const positiveBehaviors = behaviors.filter(b => b.type === 'POSITIVE');
    const negativeBehaviors = behaviors.filter(b => b.type === 'NEGATIVE');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Toast */}
            {showSuccess && (
                <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-bounce ${showSuccess.points > 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                    <Sparkles className="h-6 w-6" />
                    {showSuccess.points > 0 ? '+' : ''}{showSuccess.points} điểm cho {showSuccess.count} học sinh!
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Zap className="h-8 w-8 text-amber-500" />
                        Ghi Nhận Hành Vi
                    </h1>
                    <p className="text-gray-500 mt-1">Chọn học sinh → Chọn hành vi → Cộng/trừ điểm</p>
                </div>
                <div className="flex gap-3">
                    {myClasses.length > 1 && (
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    <button onClick={() => setShowManageBehaviors(!showManageBehaviors)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                        <Edit2 className="h-4 w-4" /> Quản lý hành vi
                    </button>
                </div>
            </div>

            {/* Manage Behaviors Panel */}
            {showManageBehaviors && (
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Danh sách hành vi</h2>
                        {behaviors.length === 0 && (
                            <button onClick={seedDefaults} className="text-sm text-indigo-600 hover:underline font-medium">
                                + Dùng mẫu mặc định
                            </button>
                        )}
                    </div>

                    {/* Add new */}
                    <div className="flex flex-col sm:flex-row gap-2 p-4 bg-gray-50 rounded-lg border">
                        <input value={newBehavior.description} onChange={e => setNewBehavior(p => ({ ...p, description: e.target.value }))}
                            placeholder="Mô tả hành vi..." className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <select value={newBehavior.type} onChange={e => setNewBehavior(p => ({ ...p, type: e.target.value as 'POSITIVE' | 'NEGATIVE' }))}
                            className="px-3 py-2 border rounded-lg text-sm">
                            <option value="POSITIVE">Tích cực</option>
                            <option value="NEGATIVE">Tiêu cực</option>
                        </select>
                        <input type="number" value={newBehavior.points} onChange={e => setNewBehavior(p => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                            className="w-20 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={handleAddBehavior}
                            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                            <Plus className="h-4 w-4" /> Thêm
                        </button>
                    </div>

                    {/* List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> Tích cực</h3>
                            {positiveBehaviors.map(b => (
                                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 group">
                                    <span className="text-sm">{b.description} <span className="text-emerald-600 font-bold">+{b.points}</span></span>
                                    <button onClick={() => deleteBehavior(b.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> Tiêu cực</h3>
                            {negativeBehaviors.map(b => (
                                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-red-50 group">
                                    <span className="text-sm">{b.description} <span className="text-red-600 font-bold">{b.points}</span></span>
                                    <button onClick={() => deleteBehavior(b.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Student Selection Panel */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Chọn Học Sinh</h2>
                        <span className="text-sm text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full">
                            {selectedStudentIds.length} đã chọn
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm học sinh..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* Quick select */}
                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <button onClick={selectAll} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 transition whitespace-nowrap">
                            Chọn tất cả
                        </button>
                        <button onClick={deselectAll} className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-gray-100 transition whitespace-nowrap">
                            Bỏ chọn
                        </button>

                        <div className="h-4 w-px bg-gray-300 mx-1"></div>

                        <div className="flex items-center gap-1 bg-purple-50 rounded-full px-2 py-1">
                            <Dices className="h-3 w-3 text-purple-600" />
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Cả lớp:</span>
                            <button onClick={() => randomSelect(classStudents.map(s => s.id), 1)} className="text-xs text-purple-700 px-2 py-0.5 rounded-full hover:bg-purple-100 font-medium">1 HS</button>
                            <button onClick={() => randomSelect(classStudents.map(s => s.id), 2)} className="text-xs text-purple-700 px-2 py-0.5 rounded-full hover:bg-purple-100 font-medium">2 HS</button>
                            <button onClick={() => randomSelect(classStudents.map(s => s.id), 4)} className="text-xs text-purple-700 px-2 py-0.5 rounded-full hover:bg-purple-100 font-medium">4 HS</button>
                        </div>
                    </div>

                    {/* Student list */}
                    <div className="max-h-[500px] overflow-y-auto space-y-4 pr-1">
                        {groupedStudents.groups.map(g => g.students.length > 0 && (
                            <div key={g.id} className="space-y-1 relative">
                                <div className="sticky top-0 bg-white/95 backdrop-blur z-10 py-2 border-b mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }}></div>
                                        <h3 className="font-bold text-gray-800 text-sm">{g.name} <span className="text-gray-400 font-normal">({g.students.length})</span></h3>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 rounded text-xs">
                                        <button onClick={() => selectGroup(g.id)} className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded font-medium">Chọn Tổ</button>
                                        <div className="w-px h-3 bg-gray-300"></div>
                                        <button onClick={() => randomSelect(g.students.map(s => s.id), 1)} className="px-2 py-1 text-purple-600 hover:bg-purple-100 rounded font-medium" title="Chọn ngẫu nhiên 1 người">🎲 1</button>
                                        <button onClick={() => randomSelect(g.students.map(s => s.id), 2)} className="px-2 py-1 text-purple-600 hover:bg-purple-100 rounded font-medium" title="Chọn ngẫu nhiên 2 người">🎲 2</button>
                                        <button onClick={() => randomSelect(g.students.map(s => s.id), 4)} className="px-2 py-1 text-purple-600 hover:bg-purple-100 rounded font-medium" title="Chọn ngẫu nhiên 4 người">🎲 4</button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {g.students.map(s => {
                                        const selected = selectedStudentIds.includes(s.id);
                                        const score = studentScores.get(s.id) || 0;
                                        const isAbsent = currentAttendance[s.id] === 'excused' || currentAttendance[s.id] === 'unexcused';

                                        return (
                                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                                                disabled={isAbsent}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left border ${isAbsent ? 'opacity-50 cursor-not-allowed bg-gray-50 border-transparent' :
                                                    (selected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'hover:bg-gray-50 border-gray-100')
                                                    }`}>
                                                {selected ? <CheckSquare className="h-5 w-5 text-indigo-600 flex-shrink-0" /> : <Square className={`h-5 w-5 flex-shrink-0 ${isAbsent ? 'text-gray-200' : 'text-gray-300'}`} />}
                                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=40`}
                                                    alt="" className={`w-8 h-8 rounded-full flex-shrink-0 ${isAbsent ? 'grayscale' : ''}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-gray-800'}`}>{s.name} {isAbsent && '(Vắng)'}</span>
                                                </div>
                                                <span className={`text-sm font-bold ${score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {score > 0 ? '+' : ''}{score}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Ungrouped */}
                        {groupedStudents.ungrouped.length > 0 && (
                            <div className="space-y-1 relative mt-4 pt-2 border-t border-dashed">
                                <div className="sticky top-0 bg-white/95 backdrop-blur z-10 py-2 mb-2 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-500 text-sm italic">Chưa phân tổ <span className="font-normal">({groupedStudents.ungrouped.length})</span></h3>
                                </div>
                                <div className="space-y-1">
                                    {groupedStudents.ungrouped.map(s => {
                                        const selected = selectedStudentIds.includes(s.id);
                                        const score = studentScores.get(s.id) || 0;
                                        const isAbsent = currentAttendance[s.id] === 'excused' || currentAttendance[s.id] === 'unexcused';

                                        return (
                                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                                                disabled={isAbsent}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left border ${isAbsent ? 'opacity-50 cursor-not-allowed bg-gray-50 border-transparent' :
                                                    (selected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'hover:bg-gray-50 border-gray-100')
                                                    }`}>
                                                {selected ? <CheckSquare className="h-5 w-5 text-indigo-600 flex-shrink-0" /> : <Square className={`h-5 w-5 flex-shrink-0 ${isAbsent ? 'text-gray-200' : 'text-gray-300'}`} />}
                                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=40`}
                                                    alt="" className={`w-8 h-8 rounded-full flex-shrink-0 ${isAbsent ? 'grayscale' : ''}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-gray-800'}`}>{s.name} {isAbsent && '(Vắng)'}</span>
                                                </div>
                                                <span className={`text-sm font-bold ${score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {score > 0 ? '+' : ''}{score}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Behavior Selection Panel */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Custom reason */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú riêng (không bắt buộc)</label>
                        <input value={customReason} onChange={e => setCustomReason(e.target.value)}
                            placeholder="VD: Hăng hái phát biểu tiết Toán"
                            className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* Positive behaviors */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                            <ThumbsUp className="h-5 w-5" /> Hành vi tích cực
                        </h2>
                        {positiveBehaviors.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">Chưa có hành vi nào. Nhấn "Quản lý hành vi" để thêm.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {positiveBehaviors.map(b => (
                                    <button key={b.id} onClick={() => applyBehavior(b)}
                                        disabled={selectedStudentIds.length === 0}
                                        className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedStudentIds.length > 0
                                            ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:scale-[1.02] active:scale-95 bg-emerald-50/50'
                                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            }`}>
                                        <div className="text-2xl font-extrabold text-emerald-600">+{b.points}</div>
                                        <div className="text-sm font-medium text-gray-700 mt-1 line-clamp-2">{b.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Negative behaviors */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                            <ThumbsDown className="h-5 w-5" /> Hành vi cần nhắc nhở
                        </h2>
                        {negativeBehaviors.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">Chưa có hành vi nào.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {negativeBehaviors.map(b => (
                                    <button key={b.id} onClick={() => applyBehavior(b)}
                                        disabled={selectedStudentIds.length === 0}
                                        className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedStudentIds.length > 0
                                            ? 'border-red-200 hover:border-red-400 hover:shadow-md hover:scale-[1.02] active:scale-95 bg-red-50/50'
                                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            }`}>
                                        <div className="text-2xl font-extrabold text-red-600">{b.points}</div>
                                        <div className="text-sm font-medium text-gray-700 mt-1 line-clamp-2">{b.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent History */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            Lịch sử cộng/trừ điểm (Hôm nay)
                        </h2>
                        {logs.filter(l => l.created_at.startsWith(todayStr)).length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">Chưa có bản ghi nào.</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {logs.filter(l => l.created_at.startsWith(todayStr)).map(log => {
                                    const student = users.find(u => u.id === log.student_id);
                                    return (
                                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 border gap-2 hover:bg-gray-100 transition">
                                            <div className="flex items-center gap-3">
                                                <img src={student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || '')}&background=6366f1&color=fff&size=32`} className="w-8 h-8 rounded-full" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{student?.name}</p>
                                                    <p className="text-xs text-gray-500">{log.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                                <span className={`text-sm font-bold ${log.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {log.points > 0 ? '+' : ''}{log.points}
                                                </span>
                                                <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <button onClick={() => deleteBehaviorLog(log.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Xóa lịch sử này">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
