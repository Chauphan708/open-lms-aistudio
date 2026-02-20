
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { AvatarClass } from '../../types';
import { Swords, Trophy, Castle, Shield, Wand2, Target, Heart, ArrowLeft, Star, Zap } from 'lucide-react';

const AVATAR_CLASSES: { id: AvatarClass; name: string; icon: any; color: string; desc: string; emoji: string }[] = [
    { id: 'warrior', name: 'Chiến Binh', icon: Shield, color: '#ef4444', desc: 'Mạnh mẽ, dũng cảm', emoji: '🗡️' },
    { id: 'mage', name: 'Phù Thủy', icon: Wand2, color: '#8b5cf6', desc: 'Thông minh, bí ẩn', emoji: '🔮' },
    { id: 'archer', name: 'Cung Thủ', icon: Target, color: '#10b981', desc: 'Nhanh nhẹn, chính xác', emoji: '🏹' },
    { id: 'healer', name: 'Thầy Thuốc', icon: Heart, color: '#f59e0b', desc: 'Nhân hậu, khôn ngoan', emoji: '💚' },
];

export const ArenaHome: React.FC = () => {
    const { user, arenaProfile, fetchArenaProfile, createArenaProfile } = useStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const [selectedClass, setSelectedClass] = useState<AvatarClass | null>(null);

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
                    <p className="mt-4 text-gray-500">Đang tải Arena...</p>
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
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">⚔️ Chọn Nhân Vật</h1>
                        <p className="text-gray-500">Hãy chọn lớp nhân vật của bạn để bắt đầu cuộc phiêu lưu!</p>
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
                        🚀 Bắt đầu phiêu lưu!
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
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-red-100"
                    style={{ background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', animation: 'fadeIn 0.5s ease-out 0.1s both' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Swords className="w-full h-full text-red-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-red-200 group-hover:scale-110 transition-transform">
                            ⚔️
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">Đấu Trường PvP</h3>
                        <p className="text-sm text-gray-500">Thách đấu 1v1 realtime</p>
                    </div>
                </button>

                {/* Tower */}
                <button
                    onClick={() => navigate('/arena/tower')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-amber-100"
                    style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', animation: 'fadeIn 0.5s ease-out 0.2s both' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Castle className="w-full h-full text-amber-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                            🗼
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">Leo Tháp</h3>
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
                        <p className="text-sm text-gray-500">Xem Top chiến binh</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
