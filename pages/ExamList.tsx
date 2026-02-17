import React, { useState } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, ChevronRight, Send, Radio } from 'lucide-react';
import { AssignModal } from '../components/AssignModal';
import { Exam, LiveSession } from '../types';

export const ExamList: React.FC = () => {
  const { exams, assignments, user, classes, createLiveSession } = useStore();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const navigate = useNavigate();

  const handleOpenAssign = (exam: Exam) => {
    setSelectedExam(exam);
    setAssignModalOpen(true);
  };

  const handleHostLive = (exam: Exam) => {
     const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit PIN
     const newSession: LiveSession = {
        id: pin,
        examId: exam.id,
        teacherId: user?.id || '',
        status: 'WAITING',
        participants: [],
        createdAt: new Date().toISOString()
     };
     createLiveSession(newSession);
     navigate(`/live/host/${pin}`);
  };

  // --- STUDENT VIEW: Show Assignments ---
  if (user?.role === 'STUDENT') {
    // 1. Get student's classes
    const myClassIds = classes
      .filter(c => c.studentIds.includes(user.id))
      .map(c => c.id);

    // 2. Filter assignments for these classes
    const myAssignments = assignments
      .filter(a => myClassIds.includes(a.classId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-gray-900">Bài tập & Thi cử</h1>
           <Link to="/live/join" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2">
              <Radio className="h-4 w-4" /> Nhập mã PIN (Thi Live)
           </Link>
        </div>
        
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {myAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Bạn chưa có bài tập nào được giao.
            </div>
          ) : (
            <div className="divide-y">
              {myAssignments.map((assign) => {
                const exam = exams.find(e => e.id === assign.examId);
                const cls = classes.find(c => c.id === assign.classId);
                if (!exam) return null;

                // Check Time
                const now = new Date();
                const start = assign.startTime ? new Date(assign.startTime) : null;
                const end = assign.endTime ? new Date(assign.endTime) : null;
                
                const isUpcoming = start && now < start;
                const isExpired = end && now > end;
                const isAvailable = !isUpcoming && !isExpired;

                return (
                  <div key={assign.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0
                        ${isAvailable ? 'bg-indigo-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-400'}
                      `}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{exam.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {assign.durationMinutes || exam.durationMinutes} phút
                          </span>
                          <span>• Lớp {cls?.name}</span>
                          {assign.endTime && (
                            <span className={isExpired ? 'text-red-500 font-medium' : ''}>
                              • Hạn chót: {new Date(assign.endTime).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAvailable ? (
                      <Link 
                        to={`/exam/${exam.id}/take?assign=${assign.id}`}
                        className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                      >
                        Làm bài ngay <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button disabled className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-400 rounded-lg whitespace-nowrap">
                        {isUpcoming ? 'Chưa mở' : 'Đã kết thúc'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TEACHER / ADMIN VIEW: Show Question Bank + Assign Button ---
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ngân hàng đề thi</h1>
      
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {exams.length === 0 ? (
           <div className="p-8 text-center text-gray-500">
             Chưa có đề thi nào trong hệ thống.
           </div>
        ) : (
          <div className="divide-y">
            {exams.map((exam) => (
              <div key={exam.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                <div className="flex gap-4">
                  <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{exam.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.durationMinutes} phút
                      </span>
                      <span>• {exam.questionCount} câu hỏi</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {user?.role === 'TEACHER' && (
                    <>
                        <button 
                        onClick={() => handleHostLive(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-pink-700 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                        title="Tổ chức thi Live (Tại lớp)"
                        >
                        <Radio className="h-4 w-4" /> Tổ chức thi
                        </button>
                        <button 
                        onClick={() => handleOpenAssign(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Giao bài tập về nhà"
                        >
                        <Send className="h-4 w-4" /> Giao bài
                        </button>
                    </>
                  )}
                  {/* Teachers/Admins can preview/try the exam */}
                  <Link 
                    to={`/exam/${exam.id}/take`}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Xem thử
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedExam && (
        <AssignModal 
          exam={selectedExam} 
          isOpen={assignModalOpen} 
          onClose={() => setAssignModalOpen(false)} 
        />
      )}
    </div>
  );
};