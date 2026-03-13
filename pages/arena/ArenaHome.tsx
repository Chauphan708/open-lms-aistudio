
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { AvatarClass } from '../../types';
import { Brain, Trophy, GraduationCap, BookOpen, Sparkles, Target, Heart, ArrowLeft, Star, Zap, HelpCircle, X } from 'lucide-react';

const AVATAR_CLASSES: { id: AvatarClass; name: string; icon: any; color: string; desc: string; emoji: string; lore: string }[] = [
    { id: 'scholar', name: 'Nhà Thông Thái', icon: BookOpen, color: '#6366f1', desc: 'Trí tuệ uyên bác', emoji: '📖', lore: '"Đọc vạn quyển sách, hiểu vạn lẽ đời"' },
    { id: 'scientist', name: 'Nhà Khoa Học', icon: Sparkles, color: '#8b5cf6', desc: 'Khám phá & sáng tạo', emoji: '🔬', lore: '"Khám phá bí ẩn của tự nhiên"' },
    { id: 'artist', name: 'Nghệ Sĩ', icon: Target, color: '#10b981', desc: 'Sáng tạo vô hạn', emoji: '🎨', lore: '"Sáng tạo là sức mạnh vô hạn"' },
    { id: 'explorer', name: 'Nhà Thám Hiểm', icon: Heart, color: '#f59e0b', desc: 'Dũng cảm khám phá', emoji: '🌍', lore: '"Mỗi câu hỏi là một vùng đất mới"' },
];

export const ArenaHome: React.FC = () => {
    const { user, arenaProfile, fetchArenaProfile, createArenaProfile } = useStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const [selectedClass, setSelectedClass] = useState<AvatarClass | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (user) {
            fetchArenaProfile(user.id).then(() => setLoading(false));
        }
    }, [user]);

    const handleCreateProfile = async () => {
        if (!user || !selectedClass) return;
        setLoading(true);
        await createArenaProfile(user.id, selectedClass);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }}></div>
                    <p className="mt-4 text-gray-500">Đang tải Đấu Trí...</p>
                </div>
            </div>
        );
    }

    // Chưa có Arena Profile → Chọn nhân vật
    if (!arenaProfile) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 70% { box-shadow: 0 0 0 15px rgba(139,92,246,0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
                <div className="w-full max-w-2xl px-4" style={{ animation: 'fadeIn 0.6s ease-out' }}>
                    <div className="text-center mb-4">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">🧠 Chọn Vai Trò Học Tập</h1>
                        <p className="text-gray-500">Hãy chọn vai trò để bắt đầu Hành Trình Tri Thức!</p>
                    </div>

                    {/* Lore intro */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6 text-center" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <p className="text-sm text-indigo-700 italic">
                            ✨ Trên đỉnh núi Thông Thái, có một ngôi trường huyền thoại nơi các học giả từ khắp nơi đến để thi tài kiến thức...
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {AVATAR_CLASSES.map((cls, idx) => {
                            const Icon = cls.icon;
                            const isSelected = selectedClass === cls.id;
                            return (
                                <button
                                    key={cls.id}
                                    onClick={() => setSelectedClass(cls.id)}
                                    className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${isSelected
                                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100 scale-[1.02]'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.1}s both` }}
                                >
                                    {isSelected && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    )}
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 text-white text-2xl"
                                        style={{ backgroundColor: cls.color, animation: isSelected ? 'float 2s ease-in-out infinite' : 'none' }}
                                    >
                                        {cls.emoji}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{cls.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{cls.desc}</p>
                                    <p className="text-xs text-indigo-500 mt-2 italic">{cls.lore}</p>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleCreateProfile}
                        disabled={!selectedClass}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${selectedClass
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-200 hover:-translate-y-0.5'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        🚀 Bắt đầu Hành Trình Tri Thức!
                    </button>
                </div>
            </div>
        );
    }

    // Đã có profile → Trang chủ Arena
    const avatarInfo = AVATAR_CLASSES.find(c => c.id === arenaProfile.avatar_class) || AVATAR_CLASSES[0];

    return (
        <div className="max-w-4xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 40px rgba(139,92,246,0.6); } }
      `}</style>

            {/* Hero Card */}
            <div
                className="relative overflow-hidden rounded-2xl mb-6 p-8 text-white"
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                    animation: 'fadeIn 0.5s ease-out'
                }}
            >
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)'
                }}></div>

                {/* Help button */}
                <button onClick={() => setShowHelp(true)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all" title="Hướng dẫn">
                    <HelpCircle className="h-5 w-5 text-white/80" />
                </button>

                <div className="relative flex items-center gap-6">
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg"
                        style={{ backgroundColor: avatarInfo.color, animation: 'float 3s ease-in-out infinite' }}
                    >
                        {avatarInfo.emoji}
                    </div>
                    <div className="flex-1">
                        <p className="text-purple-300 text-sm font-medium mb-1">{avatarInfo.name}</p>
                        <h1 className="text-2xl font-black mb-2">{user?.name}</h1>
                        <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                <span className="font-bold text-yellow-400">{arenaProfile.elo_rating}</span> Elo
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                                <Star className="h-4 w-4 text-emerald-400" />
                                <span className="font-bold text-emerald-400">{arenaProfile.total_xp}</span> XP
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                                <Zap className="h-4 w-4 text-blue-400" />
                                {arenaProfile.wins}W / {arenaProfile.losses}L
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Modes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PvP */}
                <button
                    onClick={() => navigate('/arena/pvp')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-indigo-100"
                    style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', animation: 'fadeIn 0.5s ease-out 0.1s both' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Brain className="w-full h-full text-indigo-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            🧠
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">Đấu Trí 1v1</h3>
                        <p className="text-sm text-gray-500">Thách đấu kiến thức realtime</p>
                    </div>
                </button>

                {/* Tower */}
                <button
                    onClick={() => navigate('/arena/tower')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-amber-100"
                    style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', animation: 'fadeIn 0.5s ease-out 0.2s both' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <GraduationCap className="w-full h-full text-amber-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">Leo Cấp Kiến Thức</h3>
                        <p className="text-sm text-gray-500">Tầng {arenaProfile.tower_floor} • Luyện tập PvE</p>
                    </div>
                </button>

                {/* Leaderboard */}
                <button
                    onClick={() => navigate('/arena/leaderboard')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-emerald-100"
                    style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', animation: 'fadeIn 0.5s ease-out 0.3s both' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Trophy className="w-full h-full text-emerald-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                            🏆
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">Bảng Xếp Hạng</h3>
                        <p className="text-sm text-gray-500">Xem Top học giả</p>
                    </div>
                </button>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h3 className="font-bold text-lg flex items-center gap-2"><HelpCircle className="h-5 w-5 text-purple-500" /> Hướng dẫn Đấu Trí</h3>
                            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Elo */}
                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    <h4 className="font-bold text-gray-900">Elo — Điểm Xếp Hạng</h4>
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Bắt đầu với <strong className="text-yellow-600">1000 Elo</strong></li>
                                    <li>• <span className="text-emerald-600 font-bold">Thắng PvP</span> → Elo tăng · <span className="text-red-500 font-bold">Thua</span> → Elo giảm</li>
                                    <li className="text-xs text-gray-400 italic">💡 Thắng đối thủ Elo cao hơn → nhận nhiều điểm hơn!</li>
                                </ul>
                            </div>

                            {/* XP */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star className="h-5 w-5 text-emerald-500" />
                                    <h4 className="font-bold text-gray-900">XP — Điểm Kinh Nghiệm</h4>
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Trả lời đúng → +XP · Chỉ <strong>tăng, không giảm</strong></li>
                                    <li>• Leo Cấp: +10 XP + bonus tầng · PvP: thắng trận → +XP</li>
                                </ul>
                            </div>

                            {/* W/L */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-5 w-5 text-blue-500" />
                                    <h4 className="font-bold text-gray-900">W / L — Thắng / Thua</h4>
                                </div>
                                <p className="text-sm text-gray-600"><strong className="text-emerald-600">W</strong> = Số trận thắng · <strong className="text-red-500">L</strong> = Số trận thua PvP 1v1</p>
                            </div>

                            {/* Streak Combo */}
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔥</span>
                                    <h4 className="font-bold text-gray-900">Streak Combo — Chuỗi đúng</h4>
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 2 câu đúng liên tiếp → 🔥 <strong className="text-orange-600">Combo x1.5</strong> sát thương</li>
                                    <li>• 3 câu đúng liên tiếp → 🔥🔥 <strong className="text-orange-700">Combo x2</strong></li>
                                    <li>• 4+ câu đúng liên tiếp → ⚡ <strong className="text-red-600">ULTIMATE x3!</strong></li>
                                    <li className="text-xs text-gray-400 italic">💡 Tập trung trả lời đúng liên tiếp để gây sát thương khủng!</li>
                                </ul>
                            </div>

                            {/* Speed Bonus */}
                            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⚡</span>
                                    <h4 className="font-bold text-gray-900">Speed Bonus — Tốc độ</h4>
                                </div>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Trả lời dưới 3s → ⚡ <strong className="text-cyan-700">"Tia Chớp!" x2.0</strong></li>
                                    <li>• Trả lời dưới 5s → 🏃 <strong>"Nhanh Trí!" x1.5</strong></li>
                                    <li>• Trả lời sau 10s → sát thương <strong className="text-red-500">giảm 20%</strong></li>
                                </ul>
                            </div>

                            {/* Skill theo vai trò */}
                            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🃏</span>
                                    <h4 className="font-bold text-gray-900">Kỹ năng đặc biệt (1 lần/trận)</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span>📖</span>
                                        <span><strong>Nhà Thông Thái</strong> → <span className="text-indigo-600 font-bold">50/50</span>: Loại 2 đáp án sai</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🔬</span>
                                        <span><strong>Nhà Khoa Học</strong> → <span className="text-purple-600 font-bold">+5 giây</span>: Thêm thời gian</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🎨</span>
                                        <span><strong>Nghệ Sĩ</strong> → <span className="text-emerald-600 font-bold">Lá Chắn</span>: Sai không mất HP</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🌍</span>
                                        <span><strong>Nhà Thám Hiểm</strong> → <span className="text-amber-600 font-bold">Hồi HP</span>: Hồi 15 HP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Game Modes */}
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-5 w-5 text-purple-500" />
                                    <h4 className="font-bold text-gray-900">Các chế độ chơi</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1.5">
                                    <p><strong className="text-indigo-700">🧠 Đấu Trí 1v1</strong> — Thách đấu trực tiếp, gây sát thương bằng trí tuệ!</p>
                                    <p><strong className="text-amber-700">🎓 Leo Cấp</strong> — 3 mạng ❤️, sai mất mạng, hết mạng quay tầng 1</p>
                                    <p><strong className="text-emerald-700">🏆 Bảng Xếp Hạng</strong> — Xem top học giả có Elo cao nhất</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
