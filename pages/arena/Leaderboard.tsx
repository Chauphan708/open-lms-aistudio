
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaProfile } from '../../types';
import { ArrowLeft, Trophy, Medal, Crown, Star, Swords, TrendingUp } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
    warrior: '🗡️',
    mage: '🔮',
    archer: '🏹',
    healer: '💚'
};

const RANK_COLORS = ['#fbbf24', '#9ca3af', '#cd7f32']; // gold, silver, bronze

export const Leaderboard: React.FC = () => {
    const { user, fetchLeaderboard, users } = useStore();
    const navigate = useNavigate();
    const [rankings, setRankings] = useState<(ArenaProfile & { name?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        const data = await fetchLeaderboard();
        // Merge with user names
        const enriched = data.map(p => {
            const u = users.find(u => u.id === p.id);
            return { ...p, name: u?.name || 'Unknown' };
        });
        setRankings(enriched);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="inline-block w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/arena')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-5 w-5" /> Quay lại
                </button>
                <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-500" /> Bảng Xếp Hạng
                </h1>
                <div></div>
            </div>

            {/* Top 3 Podium */}
            {rankings.length >= 3 && (
                <div className="flex justify-center items-end gap-3 mb-8" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    {/* 2nd Place */}
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl bg-gray-100 mb-2" style={{ animation: 'float 3s ease-in-out infinite 0.5s' }}>
                            {AVATAR_EMOJIS[rankings[1].avatar_class] || '🗡️'}
                        </div>
                        <p className="text-sm font-bold text-gray-700 truncate max-w-[100px]">{rankings[1].name}</p>
                        <div className="mt-2 w-20 mx-auto rounded-t-lg flex flex-col items-center justify-center" style={{ height: '80px', background: 'linear-gradient(180deg, #e5e7eb, #d1d5db)' }}>
                            <Medal className="h-6 w-6 text-gray-500 mb-1" />
                            <span className="text-xs font-bold text-gray-600">{rankings[1].elo_rating}</span>
                        </div>
                    </div>

                    {/* 1st Place */}
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-4xl mb-2 shadow-lg shadow-yellow-200" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', animation: 'float 3s ease-in-out infinite' }}>
                            {AVATAR_EMOJIS[rankings[0].avatar_class] || '🗡️'}
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[100px]">{rankings[0].name}</p>
                        <div className="mt-2 w-24 mx-auto rounded-t-lg flex flex-col items-center justify-center" style={{ height: '110px', background: 'linear-gradient(180deg, #fbbf24, #f59e0b)' }}>
                            <Crown className="h-7 w-7 text-yellow-800 mb-1" />
                            <span className="text-sm font-black text-yellow-800">{rankings[0].elo_rating}</span>
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl bg-orange-100 mb-2" style={{ animation: 'float 3s ease-in-out infinite 1s' }}>
                            {AVATAR_EMOJIS[rankings[2].avatar_class] || '🗡️'}
                        </div>
                        <p className="text-sm font-bold text-gray-700 truncate max-w-[100px]">{rankings[2].name}</p>
                        <div className="mt-2 w-20 mx-auto rounded-t-lg flex flex-col items-center justify-center" style={{ height: '60px', background: 'linear-gradient(180deg, #fdba74, #f97316)' }}>
                            <Medal className="h-5 w-5 text-orange-800 mb-1" />
                            <span className="text-xs font-bold text-orange-800">{rankings[2].elo_rating}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Full List */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Chiến binh</div>
                    <div className="col-span-2 text-center">Elo</div>
                    <div className="col-span-2 text-center">W/L</div>
                    <div className="col-span-2 text-center">XP</div>
                </div>

                {rankings.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Chưa có chiến binh nào</p>
                    </div>
                ) : (
                    rankings.map((p, idx) => {
                        const isMe = p.id === user?.id;
                        return (
                            <div
                                key={p.id}
                                className={`grid grid-cols-12 gap-2 p-3 items-center border-b last:border-b-0 transition-colors ${isMe ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                    }`}
                                style={{ animation: `fadeIn 0.3s ease-out ${Math.min(idx * 0.05, 0.5)}s both` }}
                            >
                                <div className="col-span-1 text-center">
                                    {idx < 3 ? (
                                        <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                                    )}
                                </div>
                                <div className="col-span-5 flex items-center gap-2">
                                    <span className="text-xl">{AVATAR_EMOJIS[p.avatar_class] || '🗡️'}</span>
                                    <span className={`text-sm font-bold truncate ${isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                                        {p.name} {isMe && <span className="text-xs text-indigo-500">(Bạn)</span>}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className="font-bold text-sm text-yellow-600">{p.elo_rating}</span>
                                </div>
                                <div className="col-span-2 text-center text-xs">
                                    <span className="text-emerald-600 font-bold">{p.wins}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-red-500 font-bold">{p.losses}</span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className="text-xs font-bold text-purple-600">{p.total_xp}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
