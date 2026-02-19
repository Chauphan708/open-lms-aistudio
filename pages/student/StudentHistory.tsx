import React from 'react';
import { useStore } from '../../store';
import { Clock, CheckCircle, Search, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentHistory: React.FC = () => {
  const { attempts, exams, user } = useStore();

  if (!user || user.role !== 'STUDENT') return <div>Truy cập bị từ chối</div>;

  // Filter attempts for this student
  const myAttempts = attempts
    .filter(a => a.studentId === user.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="max-w-5xl mx-auto">
       <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lịch sử làm bài</h1>
            <p className="text-gray-500 mt-1">Xem lại kết quả và nhận xét của giáo viên.</p>
          </div>
       </div>

       <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {myAttempts.length === 0 ? (
             <div className="p-12 text-center text-gray-500">
                <p>Bạn chưa hoàn thành bài thi nào.</p>
             </div>
          ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700 uppercase">
                     <tr>
                        <th className="px-6 py-4">Đề thi</th>
                        <th className="px-6 py-4">Thời gian nộp</th>
                        <th className="px-6 py-4 text-center">Điểm số</th>
                        <th className="px-6 py-4">Nhận xét</th>
                        <th className="px-6 py-4 text-center">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {myAttempts.map(att => {
                        const exam = exams.find(e => e.id === att.examId);
                        const hasFeedback = !!att.teacherFeedback;
                        
                        return (
                           <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="font-bold text-gray-900">{exam?.title || 'Đề thi đã xóa'}</div>
                                 <div className="text-xs text-gray-500">{exam?.subject || 'Tổng hợp'}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                 <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> 
                                    {new Date(att.submittedAt).toLocaleString('vi-VN')}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`inline-block w-10 py-1 rounded font-bold ${
                                    (att.score || 0) >= 8 ? 'bg-green-100 text-green-700' : 
                                    (att.score || 0) >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                 }`}>
                                    {(att.score || 0).toFixed(1)}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 {hasFeedback ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                                       <MessageSquareQuote className="h-3 w-3" /> Đã có nhận xét
                                    </span>
                                 ) : (
                                    <span className="text-xs text-gray-400 italic">Đang chờ chấm...</span>
                                 )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <Link 
                                    to={`/exam/${att.examId}/take`} 
                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center justify-center gap-1 group"
                                 >
                                    Xem chi tiết <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                 </Link>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
             </div>
          )}
       </div>
    </div>
  );
};