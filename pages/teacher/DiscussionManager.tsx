import React from 'react';
import { useStore } from '../../store';
import { MessageSquare, Plus, Clock, CheckCircle, StopCircle, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { DiscussionSession, DiscussionRound } from '../../types';

export const DiscussionManager: React.FC = () => {
  const { user, createDiscussion, discussionSessions } = useStore();
  const navigate = useNavigate();

  // Filter sessions created by this teacher
  const mySessions = discussionSessions.filter(s => s.teacherId === user?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCreateDiscussion = () => {
     if (!user) return;
     const pin = Math.floor(100000 + Math.random() * 900000).toString();
     
     const defaultRound: DiscussionRound = {
        id: 'round_init',
        name: 'Thảo luận chung',
        createdAt: new Date().toISOString()
     };

     const newSession: DiscussionSession = {
        id: pin,
        title: `Phòng thảo luận - ${new Date().toLocaleDateString('vi-VN')}`,
        teacherId: user.id,
        status: 'ACTIVE',
        participants: [],
        messages: [],
        polls: [],
        breakoutRooms: [],
        createdAt: new Date().toISOString(),
        rounds: [defaultRound],
        activeRoundId: defaultRound.id,
        visibility: 'FULL'
     };
     createDiscussion(newSession);
     navigate(`/discussion/room/${pin}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <MessageSquare className="text-indigo-600" /> Quản lý Phòng Thảo Luận
            </h1>
            <p className="text-gray-500 mt-1">Tổ chức thảo luận nhóm, tranh biện và bình chọn trực tiếp.</p>
         </div>
         <button 
            onClick={handleCreateDiscussion}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all transform hover:scale-105"
         >
            <Plus className="h-5 w-5" /> Tạo Phòng Mới
         </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
         {mySessions.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center text-gray-500">
               <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
               <p className="text-lg font-medium">Bạn chưa tạo phòng thảo luận nào.</p>
               <p className="text-sm">Hãy bắt đầu bằng cách tạo một phòng mới cho lớp học.</p>
            </div>
         ) : (
            <div className="divide-y">
               {mySessions.map(session => (
                  <div key={session.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <h3 className="font-bold text-gray-900 text-lg">{session.title}</h3>
                           <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {session.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <StopCircle className="h-3 w-3" />}
                              {session.status === 'ACTIVE' ? 'Đang mở' : 'Đã kết thúc'}
                           </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                           <span className="font-mono bg-gray-100 px-2 rounded border">PIN: {session.id}</span>
                           <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(session.createdAt).toLocaleDateString('vi-VN')}</span>
                           <span>• {session.participants.length} thành viên</span>
                           <span>• {session.messages.length} tin nhắn</span>
                        </div>
                     </div>
                     <Link 
                        to={`/discussion/room/${session.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-white border text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all font-medium shadow-sm"
                     >
                        Vào phòng <ArrowRight className="h-4 w-4" />
                     </Link>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};
