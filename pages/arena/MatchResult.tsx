
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import { Trophy, TrendingUp, TrendingDown, RotateCcw, Home, Swords, Minus } from 'lucide-react';

export const MatchResult: React.FC = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, arenaProfile, fetchArenaProfile } = useStore();

    const winner = searchParams.get('winner');
    const myHp = parseInt(searchParams.get('myHp') || '0');
    const opHp = parseInt(searchParams.get('opHp') || '0');

    const isWin = winner === user?.id;
    const isDraw = winner === 'draw';

    useEffect(() => {
        if (user) fetchArenaProfile(user.id);
    }, [user]);

    return (
        <div className="max-w-lg mx-auto text-center py-8">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100px) rotate(720deg); opacity: 0; } }
        @keyframes glow { 0%, 100% { text-shadow: 0 0 10px rgba(251,191,36,0.3); } 50% { text-shadow: 0 0 30px rgba(251,191,36,0.8); } }
      `}</style>

            {/* Result Icon */}
            <div style={{ animation: 'bounce 1s ease-in-out' }}>
                <div className="text-8xl mb-4">
                    {isDraw ? '🤝' : isWin ? '🏆' : '💀'}
                </div>
            </div>

            <h1 className={`text-4xl font-black mb-2 ${isDraw ? 'text-gray-600' : isWin ? 'text-yellow-500' : 'text-red-500'
                }`} style={isWin ? { animation: 'glow 2s ease-in-out infinite' } : {}}>
                {isDraw ? 'HÒA!' : isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
            </h1>

            <p className="text-gray-500 mb-8">
                {isDraw ? 'Hai chiến binh ngang tài ngang sức!' : isWin ? 'Xuất sắc! Bạn đã chiến thắng!' : 'Đừng nản, hãy thử lại!'}
            </p>

            {/* Score Summary */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6 text-left" style={{ animation: 'fadeIn 0.5s ease-out 0.3s both' }}>
                <h3 className="font-bold text-gray-700 mb-3">📊 Kết quả trận đấu</h3>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500">HP của bạn còn lại</span>
                    <span className="font-bold text-emerald-600">{myHp}/100</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500">HP đối thủ còn lại</span>
                    <span className="font-bold text-red-500">{opHp}/100</span>
                </div>
                <hr className="my-3" />
                <div className="flex items-center justify-between">
                    <span className="text-gray-500">Elo hiện tại</span>
                    <div className="flex items-center gap-1">
                        {isDraw ? (
                            <Minus className="h-4 w-4 text-gray-400" />
                        ) : isWin ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-black text-yellow-600 text-lg">
                            {arenaProfile?.elo_rating || '---'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500">Tổng XP</span>
                    <span className="font-bold text-purple-600">{arenaProfile?.total_xp || 0} XP</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3" style={{ animation: 'fadeIn 0.5s ease-out 0.5s both' }}>
                <button
                    onClick={() => navigate('/arena/pvp')}
                    className="flex-1 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                    <Swords className="h-5 w-5" /> Đấu tiếp
                </button>
                <button
                    onClick={() => navigate('/arena')}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                    <Home className="h-5 w-5" /> Trang chủ
                </button>
            </div>
        </div>
    );
};
