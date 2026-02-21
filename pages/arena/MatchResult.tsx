import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import { Brain, Home, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

const RESULT_LORE = {
    win: [
        'Trí tuệ của bạn đã chinh phục đỉnh cao!',
        'Kiến thức là sức mạnh - và bạn đã chứng minh điều đó!',
        'Nhà vô địch tri thức hôm nay là bạn!',
    ],
    lose: [
        'Mỗi trận đấu là một bài học quý giá.',
        'Đừng nản, kiến thức cần thời gian để tích lũy!',
        'Lần sau sẽ khác - hãy tiếp tục học hỏi!',
    ],
    draw: [
        'Hai bộ óc ngang tài ngang sức!',
        'Trận đấu cân bằng - cả hai đều xuất sắc!',
    ],
};

export const MatchResult: React.FC = () => {
    const { id: matchId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, arenaProfile } = useStore();

    const winner = searchParams.get('winner');
    const myHp = parseInt(searchParams.get('myHp') || '0');
    const opHp = parseInt(searchParams.get('opHp') || '0');

    const isWin = winner === user?.id;
    const isDraw = winner === 'draw' || winner === null;

    const lorePool = isDraw ? RESULT_LORE.draw : isWin ? RESULT_LORE.win : RESULT_LORE.lose;
    const lore = lorePool[Math.floor(Math.random() * lorePool.length)];

    return (
        <div className="max-w-md mx-auto text-center py-12">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-100px) rotate(720deg); opacity: 0; } }
      `}</style>

            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {/* Result Icon */}
                <div className="text-7xl mb-4" style={{ animation: 'pop 0.6s ease-out' }}>
                    {isDraw ? '🤝' : isWin ? '🏆' : '📚'}
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-2">
                    {isDraw ? 'HÒA!' : isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
                </h1>

                {/* Lore */}
                <p className="text-indigo-600 italic text-sm mb-6">✨ {lore}</p>

                {/* Stats Card */}
                <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6" style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">HP còn lại</p>
                            <p className="text-2xl font-black text-gray-900">{myHp}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">HP đối thủ</p>
                            <p className="text-2xl font-black text-gray-900">{opHp}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                                {isWin ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                                Elo thay đổi
                            </span>
                            <span className={`font-bold ${isWin ? 'text-emerald-600' : isDraw ? 'text-gray-500' : 'text-red-500'}`}>
                                {isWin ? '+16 ~ +32' : isDraw ? '±0' : '-16 ~ -32'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">🌟 XP kiếm được</span>
                            <span className="font-bold text-amber-600">+{isWin ? 50 : 10} XP</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">📊 Elo hiện tại</span>
                            <span className="font-bold text-indigo-600">{arenaProfile?.elo_rating || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3" style={{ animation: 'fadeIn 0.5s ease-out 0.4s both' }}>
                    <button onClick={() => navigate('/arena/pvp')} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <Brain className="h-5 w-5" /> Chơi lại
                    </button>
                    <button onClick={() => navigate('/arena')} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                        <Home className="h-5 w-5" /> Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};
