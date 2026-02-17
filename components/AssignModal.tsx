import React, { useState } from 'react';
import { X, Calendar, Clock, Eye, Repeat } from 'lucide-react';
import { useStore } from '../store';
import { Exam, Assignment } from '../types';

interface Props {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignModal: React.FC<Props> = ({ exam, isOpen, onClose }) => {
  const { classes, user, addAssignment } = useStore();
  
  // Form State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(exam.durationMinutes);
  
  // Settings
  const [viewScore, setViewScore] = useState(true);
  const [viewPassFail, setViewPassFail] = useState(true);
  const [viewSolution, setViewSolution] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1); // Default 1 attempt

  if (!isOpen) return null;

  // Filter classes taught by this teacher
  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

  const handleAssign = () => {
    if (!selectedClassId) {
      alert("Vui lòng chọn lớp!");
      return;
    }

    const newAssignment: Assignment = {
      id: `assign_${Date.now()}`,
      examId: exam.id,
      classId: selectedClassId,
      teacherId: user?.id || '',
      createdAt: new Date().toISOString(),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationMinutes: duration,
      settings: {
        viewScore,
        viewPassFail,
        viewSolution,
        maxAttempts
      }
    };

    addAssignment(newAssignment);
    onClose();
    alert("Đã giao bài thành công!");
  };

  const attemptOptions = [
    { label: '1 lần', value: 1 },
    { label: '2 lần', value: 2 },
    { label: '3 lần', value: 3 },
    { label: '5 lần', value: 5 },
    { label: '10 lần', value: 10 },
    { label: 'Không giới hạn', value: 0 },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in border border-gray-100">
        <div className="p-5 border-b flex justify-between items-center bg-white rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Giao bài: {exam.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-900" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-white">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Chọn lớp học</label>
            <select 
              value={selectedClassId} 
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            >
              <option value="">-- Chọn lớp để giao bài --</option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Time Config */}
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                 <Calendar className="h-4 w-4 text-indigo-600" /> Bắt đầu
               </label>
               <input 
                 type="datetime-local" 
                 className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500"
                 value={startTime}
                 onChange={e => setStartTime(e.target.value)}
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                 <Calendar className="h-4 w-4 text-indigo-600" /> Kết thúc
               </label>
               <input 
                 type="datetime-local" 
                 className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500"
                 value={endTime}
                 onChange={e => setEndTime(e.target.value)}
               />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                 <Clock className="h-4 w-4 text-indigo-600" /> Thời gian (Phút)
               </label>
               <input 
                 type="number"
                 className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                 value={duration}
                 onChange={e => setDuration(Number(e.target.value))}
               />
            </div>
            <div>
               <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                 <Repeat className="h-4 w-4 text-indigo-600" /> Số lần làm bài
               </label>
               <select 
                 value={maxAttempts} 
                 onChange={e => setMaxAttempts(Number(e.target.value))}
                 className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 outline-none focus:border-indigo-500"
               >
                 {attemptOptions.map(opt => (
                   <option key={opt.value} value={opt.value}>{opt.label}</option>
                 ))}
               </select>
            </div>
          </div>

          {/* Result Settings */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" /> Cấu hình xem kết quả
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={viewScore} onChange={e => setViewScore(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">Học sinh được xem điểm số</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={viewPassFail} onChange={e => setViewPassFail(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">Hiển thị đúng/sai từng câu</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={viewSolution} onChange={e => setViewSolution(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">Hiển thị lời giải chi tiết (Đáp án)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-5 border-t bg-white rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">Hủy bỏ</button>
          <button onClick={handleAssign} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all hover:shadow-lg">
            Giao bài ngay
          </button>
        </div>
      </div>
    </div>
  );
};