import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { Class, User } from '../../types';
import { School, Plus, Users, ChevronDown, UserPlus, Dices, CheckSquare, Square, Zap } from 'lucide-react';
import { DuckRace } from '../../components/classfun/DuckRace';
import { RandomRoulette } from '../../components/classfun/RandomRoulette';
import { GroupManageModal } from '../../components/classfun/GroupManageModal';

export const ClassManage: React.FC = () => {
  const { classes, academicYears, users, user: currentUser, addClass, updateClass } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Filter lists
  const myClasses = classes.filter(c => c.teacherId === currentUser?.id);
  const allStudents = users.filter(u => u.role === 'STUDENT');

  // Form State
  const [newClassName, setNewClassName] = useState('');
  const [selectedYear, setSelectedYear] = useState(academicYears[0]?.id || '');

  // Add Student State
  const [studentToAdd, setStudentToAdd] = useState('');

  const handleCreateClass = () => {
    if (!newClassName || !selectedYear) return;
    const newClass: Class = {
      id: `cls_${Date.now()}`,
      name: newClassName,
      academicYearId: selectedYear,
      teacherId: currentUser?.id || '',
      studentIds: []
    };
    addClass(newClass);
    setIsCreating(false);
    setNewClassName('');
  };

  const handleAddStudentToClass = (classId: string) => {
    if (!studentToAdd) return;
    const cls = classes.find(c => c.id === classId);
    if (cls && !cls.studentIds.includes(studentToAdd)) {
      const updated = { ...cls, studentIds: [...cls.studentIds, studentToAdd] };
      updateClass(updated);
      setStudentToAdd('');
    }
  };

  const { groups, groupMembers, fetchClassFunData } = useClassFunStore();
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showDuckRace, setShowDuckRace] = useState(false);
  const [duckRacePool, setDuckRacePool] = useState<User[]>([]);

  useEffect(() => {
    if (selectedClassId && currentUser?.id) {
      fetchClassFunData(selectedClassId, currentUser.id);
    }
  }, [selectedClassId, currentUser?.id, fetchClassFunData]);

  const selectedClassData = classes.find(c => c.id === selectedClassId);
  const studentsInClass = allStudents.filter(s => selectedClassData?.studentIds.includes(s.id));

  // Random Selection Logic
  const [showRoulette, setShowRoulette] = useState(false);

  const handleRouletteComplete = (winners: User[]) => {
    setSelectedStudentIds(winners.map(w => w.id));
    setShowRoulette(false);
  };

  const startDuckRace = () => {
    if (studentsInClass.length > 0) {
      setDuckRacePool(studentsInClass);
      setShowDuckRace(true);
    }
  };

  const handleDuckRaceComplete = (winner: User) => {
    setSelectedStudentIds([winner.id]);
    setShowDuckRace(false);
  };

  const [showGroupModal, setShowGroupModal] = useState(false);

  // Group students
  const groupedStudents = React.useMemo(() => {
    const result = {
      groups: groups.map(g => ({ ...g, students: [] as User[] })).sort((a, b) => a.sort_order - b.sort_order),
      ungrouped: [] as User[]
    };

    studentsInClass.forEach(s => {
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
  }, [studentsInClass, groups, groupMembers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-100px)]">

      {/* List Classes */}
      <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-xl">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <School className="h-5 w-5" /> Lớp của tôi
          </h2>
          <button onClick={() => setIsCreating(true)} className="p-1 hover:bg-gray-100 rounded">
            <Plus className="h-5 w-5 text-indigo-600" />
          </button>
        </div>

        {isCreating && (
          <div className="p-4 border-b bg-white border-indigo-100 space-y-3 shadow-inner">
            <label className="block text-xs font-bold text-gray-700">Tên lớp mới</label>
            <input
              className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
              placeholder="VD: 10A1"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
            />
            <label className="block text-xs font-bold text-gray-700">Năm học</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-2 rounded font-medium">Hủy</button>
              <button onClick={handleCreateClass} className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded font-medium">Lưu Lớp</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
          {myClasses.length === 0 && <p className="text-center text-gray-400 text-sm mt-4">Chưa có lớp nào</p>}
          {myClasses.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-colors
                  ${selectedClassId === c.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white hover:border-indigo-300'}
                `}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">{c.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">
                  <Users className="h-3 w-3" /> {c.studentIds.length}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {academicYears.find(y => y.id === c.academicYearId)?.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class Details */}
      <div className="md:col-span-2 bg-white rounded-xl border shadow-sm flex flex-col h-full">
        {!selectedClassData ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
            <School className="h-12 w-12 mb-2 opacity-50" />
            <p>Chọn một lớp để quản lý</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-xl flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedClassData.name}</h2>
                <p className="text-sm text-gray-500">Danh sách học sinh</p>
              </div>

              {/* Random Controls & Group Manage */}
              <div className="flex items-center flex-wrap gap-2 mt-2 md:mt-0">
                <button onClick={() => setShowGroupModal(true)} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 font-bold transition border border-indigo-100 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Quản lý Tổ
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={() => setShowRoulette(true)} className="text-sm bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold transition border border-purple-100 flex items-center gap-2">
                  <Dices className="h-4 w-4" /> Gọi Ngẫu Nhiên
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={startDuckRace} className="text-sm bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 font-bold flex items-center gap-2 transition shadow-sm border border-amber-200">
                  <span className="text-lg leading-none">🦆</span> Đua Vịt
                </button>
              </div>

              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <select
                  className="border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 flex-1 md:w-48"
                  value={studentToAdd}
                  onChange={e => setStudentToAdd(e.target.value)}
                >
                  <option value="">Chọn học sinh để thêm...</option>
                  {allStudents
                    .filter(s => !selectedClassData.studentIds.includes(s.id))
                    .map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)
                  }
                </select>
                <button
                  disabled={!studentToAdd}
                  onClick={() => handleAddStudentToClass(selectedClassData.id)}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg disabled:bg-gray-300 hover:bg-indigo-700 flex-shrink-0"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {studentsInClass.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Lớp chưa có học sinh nào.</div>
              ) : (
                <div className="space-y-6">
                  {groupedStudents.groups.map(g => g.students.length > 0 && (
                    <div key={g.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }}></div>
                          <h3 className="font-bold text-gray-800">{g.name} <span className="text-gray-500 font-normal">({g.students.length})</span></h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 font-medium">Chọn để cập nhật</span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {g.students.map(s => {
                          const selected = selectedStudentIds.includes(s.id);
                          return (
                            <div key={s.id} onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])}
                              className={`p-3 flex items-center gap-4 cursor-pointer transition-colors ${selected ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                              {selected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <div className="h-5 w-5 border-2 rounded text-transparent" />}
                              <div className="flex-1">
                                <p className={`font-semibold ${selected ? 'text-indigo-900' : 'text-gray-800'}`}>{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Ungrouped */}
                  {groupedStudents.ungrouped.length > 0 && (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm border-dashed">
                      <div className="px-4 py-3 bg-gray-50/50 border-b">
                        <h3 className="font-bold text-gray-500 italic">Chưa phân tổ <span className="font-normal">({groupedStudents.ungrouped.length})</span></h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {groupedStudents.ungrouped.map(s => {
                          const selected = selectedStudentIds.includes(s.id);
                          return (
                            <div key={s.id} onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])}
                              className={`p-3 flex items-center gap-4 cursor-pointer transition-colors ${selected ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                              {selected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <div className="h-5 w-5 border-2 rounded text-transparent" />}
                              <div className="flex-1">
                                <p className={`font-semibold ${selected ? 'text-indigo-900' : 'text-gray-800'}`}>{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showRoulette && (
        <RandomRoulette
          students={studentsInClass}
          groups={groups}
          groupMembers={groupMembers}
          onComplete={handleRouletteComplete}
          onClose={() => setShowRoulette(false)}
        />
      )}

      {showDuckRace && (
        <DuckRace
          students={duckRacePool}
          onClose={() => setShowDuckRace(false)}
          onComplete={handleDuckRaceComplete}
        />
      )}

      {showGroupModal && selectedClassId && (
        <GroupManageModal classId={selectedClassId} onClose={() => setShowGroupModal(false)} />
      )}
    </div>
  );
};