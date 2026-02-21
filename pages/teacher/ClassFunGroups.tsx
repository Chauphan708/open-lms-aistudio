import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore, ClassGroup } from '../../services/classFunStore';
import {
    Users, Plus, Trash2, Edit2, Save, X, GripVertical, UserPlus, UserMinus, Palette
} from 'lucide-react';

const GROUP_COLORS = [
    'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500',
];

export const ClassFunGroups: React.FC = () => {
    const { user, classes, users } = useStore();
    const {
        groups, groupMembers, isLoading, fetchClassFunData,
        addGroup, updateGroup, deleteGroup, addStudentToGroup, removeStudentFromGroup
    } = useClassFunStore();

    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState(myClasses[0]?.id || '');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newGroupName, setNewGroupName] = useState('Tổ 1');
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [assigningGroupId, setAssigningGroupId] = useState<string | null>(null);

    // Load data
    useEffect(() => {
        if (selectedClassId && user?.id) fetchClassFunData(selectedClassId, user.id);
    }, [selectedClassId, user?.id, fetchClassFunData]);

    useEffect(() => {
        if (!selectedClassId && myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    }, [myClasses, selectedClassId]);

    // Students
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClass, users]);

    // Members per group
    const getMembersOfGroup = (groupId: string) => {
        const memberIds = groupMembers.filter(m => m.group_id === groupId).map(m => m.student_id);
        return classStudents.filter(s => memberIds.includes(s.id));
    };

    // Unassigned students
    const assignedIds = new Set(groupMembers.map(m => m.student_id));
    const unassignedStudents = classStudents.filter(s => !assignedIds.has(s.id));

    // Add group
    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;
        await addGroup({
            class_id: selectedClassId,
            name: newGroupName,
            color: newGroupColor,
            sort_order: groups.length,
        });
        setNewGroupName('');
        setShowAddForm(false);
    };

    // Delete group
    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Xóa tổ này? Học sinh sẽ trở thành chưa phân tổ.')) return;
        await deleteGroup(id);
    };

    // Save edit
    const handleSaveEdit = async () => {
        if (!editingGroupId || !editName.trim()) return;
        await updateGroup(editingGroupId, { name: editName });
        setEditingGroupId(null);
    };

    // Auto-assign (random shuffle)
    const autoAssign = async () => {
        if (groups.length === 0 || unassignedStudents.length === 0) return;
        const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i++) {
            const group = groups[i % groups.length];
            await addStudentToGroup(group.id, shuffled[i].id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Users className="h-8 w-8 text-violet-600" />
                        Quản Lý Tổ / Nhóm
                    </h1>
                    <p className="text-gray-500 mt-1">Tạo tổ và phân công học sinh</p>
                </div>
                <div className="flex gap-3">
                    {myClasses.length > 1 && (
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    <button onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition">
                        <Plus className="h-4 w-4" /> Thêm Tổ
                    </button>
                </div>
            </div>

            {/* Add Group Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h3 className="font-bold text-gray-800 mb-3">Tạo tổ mới</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {[...Array(10)].map((_, i) => (
                                <option key={i} value={`Tổ ${i + 1}`}>Tổ {i + 1}</option>
                            ))}
                        </select>
                        <div className="flex gap-1 items-center">
                            {GROUP_COLORS.map(c => (
                                <button key={c} onClick={() => setNewGroupColor(c)}
                                    className={`w-7 h-7 rounded-full ${c} transition-all ${newGroupColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-400' : 'hover:scale-110'}`} />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddGroup} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                                <Save className="h-4 w-4" /> Lưu
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-assign bar */}
            {unassignedStudents.length > 0 && groups.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className="text-sm text-amber-800">
                        <strong>{unassignedStudents.length}</strong> học sinh chưa được phân tổ.
                    </p>
                    <button onClick={autoAssign}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition">
                        <UserPlus className="h-4 w-4" /> Tự động phân tổ (ngẫu nhiên)
                    </button>
                </div>
            )}

            {/* Groups Grid */}
            {groups.length === 0 ? (
                <div className="text-center p-16 text-gray-400 bg-white rounded-xl border">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold">Chưa có tổ nào.</p>
                    <p className="text-sm mt-1">Nhấn "Thêm Tổ" để bắt đầu.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {groups.map(g => {
                        const members = getMembersOfGroup(g.id);
                        const isEditing = editingGroupId === g.id;
                        const isAssigning = assigningGroupId === g.id;

                        return (
                            <div key={g.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                {/* Group header */}
                                <div className={`${g.color} p-4 text-white`}>
                                    <div className="flex items-center justify-between">
                                        {isEditing ? (
                                            <div className="flex gap-2 flex-1">
                                                <input value={editName} onChange={e => setEditName(e.target.value)}
                                                    className="flex-1 px-2 py-1 rounded text-gray-800 text-sm" autoFocus />
                                                <button onClick={handleSaveEdit} className="p-1 bg-white/20 rounded hover:bg-white/30"><Save className="h-4 w-4" /></button>
                                                <button onClick={() => setEditingGroupId(null)} className="p-1 bg-white/20 rounded hover:bg-white/30"><X className="h-4 w-4" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-lg font-bold">{g.name}</h3>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setEditingGroupId(g.id); setEditName(g.name); }}
                                                        className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition"><Edit2 className="h-4 w-4" /></button>
                                                    <button onClick={() => setAssigningGroupId(isAssigning ? null : g.id)}
                                                        className={`p-1.5 rounded-lg transition ${isAssigning ? 'bg-white text-gray-800' : 'bg-white/20 hover:bg-white/30'}`}>
                                                        <UserPlus className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteGroup(g.id)}
                                                        className="p-1.5 bg-white/20 rounded-lg hover:bg-red-400 transition"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-white/80 text-sm mt-1">{members.length} thành viên</p>
                                </div>

                                {/* Assign students UI */}
                                {isAssigning && (
                                    <div className="p-3 bg-indigo-50 border-b max-h-48 overflow-y-auto">
                                        <p className="text-xs font-bold text-indigo-700 mb-2">Thêm học sinh chưa phân tổ:</p>
                                        {unassignedStudents.length === 0 ? (
                                            <p className="text-xs text-gray-400">Tất cả đã có tổ.</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {unassignedStudents.map(s => (
                                                    <button key={s.id} onClick={() => addStudentToGroup(g.id, s.id)}
                                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-100 text-left text-sm transition">
                                                        <UserPlus className="h-3.5 w-3.5 text-indigo-500" />
                                                        <span className="font-medium text-gray-700">{s.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Members list */}
                                <div className="p-3 space-y-1">
                                    {members.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-4">Chưa có thành viên</p>
                                    ) : members.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group">
                                            <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff&size=32`}
                                                alt="" className="w-8 h-8 rounded-full" />
                                            <span className="flex-1 text-sm font-medium text-gray-800">{m.name}</span>
                                            <button onClick={() => removeStudentFromGroup(g.id, m.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition">
                                                <UserMinus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
