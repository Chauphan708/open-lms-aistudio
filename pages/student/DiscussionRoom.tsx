import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Send, Image as ImageIcon, Hand, Smile, LogOut, PieChart, Lock, Layers, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../../types';

export const StudentDiscussionRoom: React.FC = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { discussionSessions, user, sendDiscussionMessage, toggleHandRaise, votePoll } = useStore();
  const session = discussionSessions.find(s => s.id === pin);
  
  const [msgText, setMsgText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewing State
  const [viewedRoundId, setViewedRoundId] = useState<string | null>(null);
  const [isRoundMenuOpen, setIsRoundMenuOpen] = useState(false);
  const roundMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || !user) {
        navigate('/discussion/join');
    }
  }, [session, user, navigate]);

  // Click Outside to Close Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roundMenuRef.current && !roundMenuRef.current.contains(event.target as Node)) {
        setIsRoundMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-switch to active round when it changes (unless explicitly browsing?)
  useEffect(() => {
    if (session?.activeRoundId) {
        setViewedRoundId(session.activeRoundId);
    }
  }, [session?.activeRoundId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, viewedRoundId]);

  if (!session || !user) return null;

  // Identify current room (Main or Breakout)
  const participant = session.participants.find(p => p.studentId === user.id);
  const currentRoomId = participant?.currentRoomId || 'MAIN';
  const currentRoomName = currentRoomId === 'MAIN' ? 'Phòng Chính' : session.breakoutRooms.find(r => r.id === currentRoomId)?.name || 'Nhóm nhỏ';
  
  const currentRoundId = viewedRoundId || session.activeRoundId;
  const activeRound = session.rounds.find(r => r.id === session.activeRoundId);
  const viewingRoundData = session.rounds.find(r => r.id === currentRoundId);

  // Filter messages based on Round and Room
  const currentMessages = session.messages.filter(m => 
    m.roomId === currentRoomId && m.roundId === currentRoundId
  );
  
  const activePolls = session.polls.filter(p => p.isActive);

  // Check if we can chat: Must be active session AND viewing the active round
  const canChat = session.status === 'ACTIVE' && currentRoundId === session.activeRoundId;

  const handleSendMessage = () => {
    if (!msgText.trim() || !canChat) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content: msgText,
      type: 'TEXT',
      timestamp: new Date().toISOString(),
      roomId: currentRoomId,
      roundId: session.activeRoundId
    };
    sendDiscussionMessage(session.id, msg);
    setMsgText('');
  };

  const handleSendSticker = (sticker: string) => {
    if (!canChat) return;
    const msg: ChatMessage = {
      id: `sticker_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content: sticker,
      type: 'STICKER',
      timestamp: new Date().toISOString(),
      roomId: currentRoomId,
      roundId: session.activeRoundId
    };
    sendDiscussionMessage(session.id, msg);
    setShowStickers(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canChat) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
       const base64 = reader.result as string;
       const msg: ChatMessage = {
          id: `img_${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          content: base64,
          type: 'IMAGE',
          timestamp: new Date().toISOString(),
          roomId: currentRoomId,
          roundId: session.activeRoundId
       };
       sendDiscussionMessage(session.id, msg);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTriggerImageUpload = () => {
     fileInputRef.current?.click();
  };

  const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '✅', '❌', '🤔', '👋', '💪', '🙏', '🔥', '✨'];

  // Helper to render message content based on Visibility Settings
  const renderMessageContent = (m: ChatMessage) => {
      // 1. My messages -> Always show full
      if (m.senderId === user.id) {
          return (
             <div className="flex flex-col max-w-[75%] items-end">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-2 shadow-sm">
                    {m.type === 'STICKER' ? (
                        <div className="text-4xl">{m.content}</div>
                    ) : m.type === 'IMAGE' ? (
                        <img src={m.content} alt="Sent" className="max-w-full rounded-lg my-1 border border-white/20" />
                    ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                </div>
             </div>
          );
      }

      // 2. Others messages -> Check visibility
      const visibility = session.visibility;

      if (visibility === 'HIDDEN_ALL') {
          return null; 
      }

      let displayName = m.senderName;
      let displayContent: React.ReactNode = m.type === 'STICKER' ? <div className="text-4xl">{m.content}</div> : <div className="whitespace-pre-wrap">{m.content}</div>;
      
      if (m.type === 'IMAGE') {
          displayContent = <img src={m.content} alt="Sent" className="max-w-full rounded-lg my-1 border border-gray-100" />;
      }

      let bubbleClass = "bg-white text-gray-800 border rounded-bl-none";

      if (visibility === 'NAME_ONLY') {
          displayContent = <div className="italic text-gray-400 flex items-center gap-1"><Lock className="h-3 w-3" /> Nội dung bị ẩn</div>;
      } else if (visibility === 'CONTENT_ONLY') {
          displayName = "Người bí ẩn";
      }

      return (
         <div className="flex flex-col max-w-[75%]">
            <span className="text-[10px] text-gray-500 ml-1 mb-0.5">{displayName}</span>
            <div className={`rounded-2xl px-4 py-2 shadow-sm ${bubbleClass}`}>
               {displayContent}
            </div>
         </div>
      );
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row max-w-6xl mx-auto md:shadow-2xl md:my-4 md:rounded-2xl overflow-hidden md:border">
       
       {/* Left: Chat Area */}
       <div className="flex-1 flex flex-col bg-white relative">
          {/* Header */}
          <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-10">
             <div>
                <h1 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                   {session.title}
                   {session.status === 'FINISHED' && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">Đã kết thúc</span>}
                </h1>
                <div className="flex items-center gap-3 text-xs mt-1">
                    <span className="text-indigo-600 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {currentRoomName}
                    </span>
                    <span className="text-gray-400">|</span>
                    
                    {/* Round Selector (Click to Open) */}
                    <div className="relative" ref={roundMenuRef}>
                       <button 
                          onClick={() => setIsRoundMenuOpen(!isRoundMenuOpen)}
                          className="flex items-center gap-1 text-gray-700 font-medium bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                       >
                          <Layers className="h-3 w-3" />
                          <span>{viewingRoundData?.name}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${isRoundMenuOpen ? 'rotate-180' : ''}`} />
                       </button>
                       {/* Dropdown to switch view */}
                       {isRoundMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 w-56 bg-white border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                             <div className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Vòng thảo luận</div>
                             {session.rounds.map(r => (
                                <button
                                   key={r.id}
                                   onClick={() => { setViewedRoundId(r.id); setIsRoundMenuOpen(false); }}
                                   className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-colors ${viewedRoundId === r.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                   {r.name}
                                   {session.activeRoundId === r.id && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded font-bold">Active</span>}
                                </button>
                             ))}
                          </div>
                       )}
                    </div>
                </div>
             </div>
             <div className="flex gap-2">
                 <button 
                   onClick={() => toggleHandRaise(session.id, user.id)}
                   disabled={session.status === 'FINISHED'}
                   className={`p-2 rounded-full transition-all ${participant?.isHandRaised ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                 >
                    <Hand className="h-5 w-5" />
                 </button>
                 <button onClick={() => navigate('/')} className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100">
                    <LogOut className="h-5 w-5" />
                 </button>
             </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" onClick={() => setShowStickers(false)}>
             
             {session.visibility === 'HIDDEN_ALL' && currentMessages.length > 0 && (
                <div className="flex items-center justify-center h-full">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                        <div className="text-4xl font-bold text-indigo-600 mb-2">{currentMessages.length}</div>
                        <p className="text-gray-500">Tin nhắn đã được gửi trong vòng này.</p>
                        <p className="text-xs text-gray-400 mt-2">Nội dung đang bị ẩn bởi giáo viên.</p>
                    </div>
                </div>
             )}

             {currentMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                   <p>Chưa có tin nhắn nào trong vòng <strong>{viewingRoundData?.name}</strong>.</p>
                   <p>Hãy gửi lời chào đến mọi người!</p>
                </div>
             )}

             {session.visibility !== 'HIDDEN_ALL' && currentMessages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                   {m.type === 'SYSTEM' ? (
                      <div className="w-full text-center my-2">
                         <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">{m.content}</span>
                      </div>
                   ) : (
                      renderMessageContent(m)
                   )}
                </div>
             ))}
             <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white relative">
             {/* Overlay for Read-Only Mode */}
             {!canChat && (
                <div className="absolute inset-0 bg-gray-100/80 z-10 flex items-center justify-center text-gray-500 font-medium text-sm">
                   {session.status === 'FINISHED' ? 'Phòng thảo luận đã đóng.' : 'Bạn đang xem lịch sử. Chuyển sang vòng hiện tại để chat.'}
                </div>
             )}

             {/* Hidden File Input */}
             <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload} 
             />

             {showStickers && (
                <div className="absolute bottom-full left-2 mb-2 bg-white border shadow-xl rounded-xl p-3 grid grid-cols-5 gap-2 w-64 animate-fade-in">
                   {STICKERS.map(s => (
                      <button key={s} onClick={() => handleSendSticker(s)} className="text-2xl hover:bg-gray-100 p-2 rounded transition">{s}</button>
                   ))}
                </div>
             )}
             <div className="flex gap-2 items-center">
                <button onClick={() => setShowStickers(!showStickers)} className="p-2 text-gray-500 hover:bg-yellow-50 hover:text-yellow-500 rounded-full transition"><Smile className="h-6 w-6" /></button>
                <button 
                   onClick={handleTriggerImageUpload}
                   className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-500 rounded-full transition"
                >
                   <ImageIcon className="h-6 w-6" />
                </button>
                <input 
                   value={msgText}
                   onChange={e => setMsgText(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                   placeholder={`Nhập tin nhắn (${viewingRoundData?.name})...`}
                   className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-full px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button onClick={handleSendMessage} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg transform hover:scale-105 transition"><Send className="h-5 w-5" /></button>
             </div>
          </div>
       </div>

       {/* Right: Polls (Visible if active) */}
       {activePolls.length > 0 && (
          <div className="w-full md:w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
             <div className="p-4 border-b bg-white">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <PieChart className="h-5 w-5 text-indigo-600" /> Bình chọn đang mở
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activePolls.map(poll => {
                   const hasVoted = poll.options.some(o => o.voterIds.includes(user.id));
                   return (
                      <div key={poll.id} className="bg-white p-4 rounded-xl shadow-sm border animate-fade-in">
                         <h4 className="font-bold text-gray-900 mb-3">{poll.question}</h4>
                         <div className="space-y-2">
                            {poll.options.map(opt => {
                               const totalVotes = poll.options.reduce((a, b) => a + b.voteCount, 0);
                               const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                               const isSelected = opt.voterIds.includes(user.id);
                               
                               return (
                                  <button 
                                     key={opt.id}
                                     disabled={hasVoted}
                                     onClick={() => votePoll(session.id, poll.id, opt.id, user.id)}
                                     className={`w-full text-left relative overflow-hidden border rounded-lg p-3 transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'hover:border-indigo-300'}`}
                                  >
                                     {hasVoted && (
                                        <div className="absolute left-0 top-0 bottom-0 bg-indigo-50 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                     )}
                                     <div className="relative flex justify-between z-10">
                                        <span className={isSelected ? 'font-bold text-indigo-700' : 'text-gray-700'}>{opt.text}</span>
                                        {hasVoted && <span className="text-xs font-bold text-gray-500">{percent}%</span>}
                                     </div>
                                  </button>
                               );
                            })}
                         </div>
                         {hasVoted && <div className="mt-2 text-center text-xs text-green-600 font-medium">Bạn đã bình chọn</div>}
                      </div>
                   );
                })}
             </div>
          </div>
       )}
    </div>
  );
};