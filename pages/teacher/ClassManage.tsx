import React, { useState } from 'react';
import { useStore } from '../../store';
import { Class } from '../../types';
import { School, Plus, Users, ChevronDown, UserPlus } from 'lucide-react';

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

  const selectedClassData = classes.find(c => c.id === selectedClassId);
  const studentsInClass = allStudents.filter(s => selectedClassData?.studentIds.includes(s.id));

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
             <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-xl">
                <div>
                   <h2 className="text-xl font-bold text-gray-900">{selectedClassData.name}</h2>
                   <p className="text-sm text-gray-500">Danh sách học sinh</p>
                </div>
                <div className="flex gap-2">
                   <select 
                     className="border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
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
                     className="bg-indigo-600 text-white px-3 py-2 rounded-lg disabled:bg-gray-300 hover:bg-indigo-700"
                   >
                     <UserPlus className="h-5 w-5" />
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 bg-white">
               <table className="w-full text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-gray-700 uppercase">
                    <tr>
                      <th className="px-4 py-2">Học sinh</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Kết quả thi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {studentsInClass.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-8 text-gray-400">Lớp chưa có học sinh nào.</td></tr>
                    )}
                    {studentsInClass.map(s => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3">{s.email}</td>
                        <td className="px-4 py-3">--</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
           </>
         )}
      </div>
    </div>
  );
};