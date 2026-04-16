import React, { useState, useEffect } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { User, Activity, FileText, CheckCircle, AlertTriangle, Medal, Layers } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export const ParentDashboard = () => {
  const { currentParent, linkedStudents } = useParentStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (linkedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

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
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flexitems-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Nhận xét TT27</p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Bài đã nộp</p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Cảnh báo vi phạm</p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Hạng Arena</p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
               </div>
            </div>

            {/* Content Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <Activity className="text-emerald-500 w-5 h-5" /> Điểm hành vi tuần này
                 </h3>
                 <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                   <Layers className="w-12 h-12 mb-3 opacity-20" />
                   <p>Tính năng đang được cập nhật</p>
                 </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <FileText className="text-blue-500 w-5 h-5" /> Bài tập gần nhất
                 </h3>
                 <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                   <Layers className="w-12 h-12 mb-3 opacity-20" />
                   <p>Tính năng đang được cập nhật</p>
                 </div>
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
