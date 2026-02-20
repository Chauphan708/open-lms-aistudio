
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { ArrowLeft, Swords, Loader2, X, Shield, Wand2, Target, Heart } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
    warrior: '🗡️', mage: '🔮', archer: '🏹', healer: '💚'
};

export const PvPLobby: React.FC = () => {
    const { user, arenaProfile, findMatch, joinMatch, cancelMatchmaking, users } = useStore();
    const navigate = useNavigate();
    const [searching, setSearching] = useState(false);
    const [matchId, setMatchId] = useState<string | null>(null);
    const [opponentFound, setOpponentFound] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const channelRef = useRef<any>(null);

    const startSearch = async () => {
        if (!user) return;
        setSearching(true);
        const match = await findMatch(user.id);
        if (!match) { setSearching(false); return; }

        if (match.player2_id === null && match.player1_id === user.id) {
            // We created a new match, wait for opponent
            setMatchId(match.id);
            // Subscribe to match changes
            const channel = supabase.channel(`match-${match.id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'arena_matches',
                    filter: `id=eq.${match.id}`
                }, (payload: any) => {
                    if (payload.new.status === 'playing') {
                        setOpponentFound(true);
                    }
                })
                .subscribe();
            channelRef.current = channel;
        } else {
            // Found existing waiting match, join it
            setMatchId(match.id);
            await joinMatch(match.id, user.id);
            setOpponentFound(true);
        }
    };

    const cancelSearch = async () => {
        if (matchId) {
            await cancelMatchmaking(matchId);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        }
        setSearching(false);
        setMatchId(null);
    };

    // Countdown when opponent found
    useEffect(() => {
        if (!opponentFound) return;
        if (countdown <= 0) {
            navigate(`/arena/battle/${matchId}`);
            return;
        }
        const t = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [opponentFound, countdown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    return (
        <div className="max-w-xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes swords-clash { 
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => { cancelSearch(); navigate('/arena'); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-5 w-5" /> Quay lại
                </button>
                <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Swords className="h-6 w-6 text-red-500" /> Đấu Trường PvP
                </h1>
                <div></div>
            </div>

            {!searching ? (
                /* Ready Screen */
                <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="mb-8">
                        <div className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center text-7xl shadow-lg shadow-purple-200 mb-6"
                            style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)' }}
                        >
                            {AVATAR_EMOJIS[arenaProfile?.avatar_class || 'warrior']}
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">{user?.name}</h2>
                        <p className="text-yellow-600 font-bold mt-1">⭐ Elo: {arenaProfile?.elo_rating || 1000}</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
                        <p className="font-bold mb-1">⚔️ Luật chơi PvP</p>
                        <p>Trả lời 5 câu hỏi. Đúng = gây sát thương lên đối thủ. Nhanh hơn = sát thương cao hơn!</p>
                    </div>

                    <button
                        onClick={startSearch}
                        className="w-full py-5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-black text-xl hover:shadow-xl hover:shadow-red-200 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        ⚔️ Tìm Đối Thủ
                    </button>
                </div>
            ) : opponentFound ? (
                /* Opponent Found */
                <div className="text-center py-8" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)' }}
                        >
                            {AVATAR_EMOJIS[arenaProfile?.avatar_class || 'warrior']}
                        </div>
                        <div style={{ animation: 'swords-clash 0.5s ease-in-out infinite' }}>
                            <Swords className="h-12 w-12 text-red-500" />
                        </div>
                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl bg-gray-800 shadow-lg"
                            style={{ animation: 'bounce-in 0.5s ease-out' }}
                        >
                            ❓
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-2">Đối thủ đã tìm thấy!</h2>
                    <div className="text-6xl font-black text-red-500 my-6" style={{ animation: 'pulse 1s ease-in-out infinite' }}>
                        {countdown}
                    </div>
                    <p className="text-gray-500">Trận đấu bắt đầu trong...</p>
                </div>
            ) : (
                /* Searching */
                <div className="text-center py-12" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-4 border-purple-200" style={{ animation: 'spin-slow 3s linear infinite' }}></div>
                        <div className="absolute inset-2 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent" style={{ animation: 'spin-slow 1.5s linear infinite' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-5xl">
                            {AVATAR_EMOJIS[arenaProfile?.avatar_class || 'warrior']}
                        </div>
                    </div>

                    <h2 className="text-xl font-black text-gray-900 mb-2" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                        Đang tìm đối thủ...
                    </h2>
                    <p className="text-gray-500 text-sm mb-8">Elo: {arenaProfile?.elo_rating || 1000}</p>

                    <button
                        onClick={cancelSearch}
                        className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto"
                    >
                        <X className="h-4 w-4" /> Hủy tìm trận
                    </button>
                </div>
            )}
        </div>
    );
};
