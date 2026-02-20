
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion } from '../../types';
import { ArrowLeft, Heart, HeartOff, Star, Zap, Castle, CheckCircle, XCircle } from 'lucide-react';

export const TowerMode: React.FC = () => {
    const { user, arenaProfile, arenaQuestions, fetchArenaQuestions, updateArenaProfile } = useStore();
    const navigate = useNavigate();

    const [lives, setLives] = useState(3);
    const [floor, setFloor] = useState(1);
    const [currentQ, setCurrentQ] = useState<ArenaQuestion | null>(null);
    const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [xpGained, setXpGained] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timer, setTimer] = useState(30);

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (arenaProfile) {
            setFloor(arenaProfile.tower_floor);
        }
    }, [arenaProfile]);

    useEffect(() => {
        if (!loading && arenaQuestions.length > 0 && !currentQ && !gameOver) {
            pickNextQuestion();
        }
    }, [loading, arenaQuestions, gameOver]);

    // Timer countdown
    useEffect(() => {
        if (!currentQ || showResult || gameOver) return;
        if (timer <= 0) {
            handleAnswer(-1); // timeout
            return;
        }
        const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [timer, currentQ, showResult, gameOver]);

    const pickNextQuestion = () => {
        const available = arenaQuestions.filter(q => !usedIds.has(q.id));
        if (available.length === 0) {
            // Reset used questions
            setUsedIds(new Set());
            const shuffled = arenaQuestions.sort(() => Math.random() - 0.5);
            setCurrentQ(shuffled[0]);
            setUsedIds(new Set([shuffled[0].id]));
        } else {
            const shuffled = available.sort(() => Math.random() - 0.5);
            setCurrentQ(shuffled[0]);
            setUsedIds(prev => new Set([...prev, shuffled[0].id]));
        }
        setSelected(null);
        setShowResult(false);
        setTimer(30);
    };

    const handleAnswer = (idx: number) => {
        if (showResult || !currentQ) return;
        setSelected(idx);
        const correct = idx === currentQ.correct_index;
        setIsCorrect(correct);
        setShowResult(true);

        if (correct) {
            const xp = 10 + floor * 2;
            setXpGained(xp);
            // Update profile
            if (arenaProfile) {
                updateArenaProfile({
                    id: arenaProfile.id,
                    tower_floor: floor + 1,
                    total_xp: arenaProfile.total_xp + xp
                });
            }
        } else {
            setXpGained(0);
            const newLives = lives - 1;
            setLives(newLives);
            if (newLives <= 0) {
                setGameOver(true);
                if (arenaProfile) {
                    updateArenaProfile({ id: arenaProfile.id, tower_floor: 1 });
                }
            }
        }
    };

    const handleNext = () => {
        pickNextQuestion();
    };

    const handleRestart = () => {
        setLives(3);
        setFloor(1);
        setGameOver(false);
        setUsedIds(new Set());
        setCurrentQ(null);
        setXpGained(0);
        // Will trigger pickNextQuestion via useEffect
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }}></div>
                    <p className="mt-4 text-gray-500">Đang tải câu hỏi...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (arenaQuestions.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Castle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có câu hỏi</h2>
                    <p className="text-gray-500 mb-4">Giáo viên cần thêm câu hỏi vào hệ thống Arena trước.</p>
                    <button onClick={() => navigate('/arena')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                        ← Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/arena')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-5 w-5" /> Quay lại
                </button>
                <div className="flex items-center gap-4">
                    {/* Lives */}
                    <div className="flex items-center gap-1">
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                className={`h-6 w-6 transition-all duration-300 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300'}`}
                                style={i >= lives ? { animation: 'shake 0.3s ease-in-out' } : {}}
                            />
                        ))}
                    </div>
                    {/* Floor */}
                    <div className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full font-bold text-sm flex items-center gap-1.5">
                        <Castle className="h-4 w-4" />
                        Tầng {floor}
                    </div>
                </div>
            </div>

            {/* Game Over */}
            {gameOver ? (
                <div className="text-center py-16" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="text-6xl mb-4">💀</div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Hết mạng!</h2>
                    <p className="text-gray-500 mb-2">Bạn đã leo đến tầng <strong className="text-amber-600">{floor}</strong></p>
                    <p className="text-gray-500 mb-6">Tổng XP kiếm được: <strong className="text-emerald-600">{xpGained}</strong></p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleRestart}
                            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
                        >
                            🔄 Thử lại
                        </button>
                        <button
                            onClick={() => navigate('/arena')}
                            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            ) : currentQ ? (
                <>
                    {/* Timer Bar */}
                    <div className="mb-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-linear"
                                style={{
                                    width: `${(timer / 30) * 100}%`,
                                    backgroundColor: timer > 15 ? '#10b981' : timer > 5 ? '#f59e0b' : '#ef4444'
                                }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>⏱️ {timer}s</span>
                            <span className="text-gray-300">Câu hỏi cho tầng {floor}</span>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div className="flex items-start gap-3 mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0">
                                {currentQ.subject === 'math' ? '📐 Toán' : currentQ.subject === 'science' ? '🔬 Khoa học' : '💻 Công nghệ'}
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {currentQ.difficulty === 1 ? 'Dễ' : currentQ.difficulty === 2 ? 'TB' : 'Khó'}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mt-3 leading-relaxed">{currentQ.content}</h2>
                    </div>

                    {/* Answers */}
                    <div className="space-y-3">
                        {currentQ.answers.map((answer, idx) => {
                            let btnClass = 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700';
                            if (showResult) {
                                if (idx === currentQ.correct_index) {
                                    btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                                } else if (idx === selected && !isCorrect) {
                                    btnClass = 'bg-red-50 border-red-500 text-red-700';
                                } else {
                                    btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                                }
                            }
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={showResult}
                                    className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 flex items-center gap-3 ${btnClass} ${!showResult ? 'hover:shadow-md active:scale-[0.98]' : ''
                                        }`}
                                    style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both` }}
                                >
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${showResult && idx === currentQ.correct_index ? 'bg-emerald-500 text-white' :
                                        showResult && idx === selected && !isCorrect ? 'bg-red-500 text-white' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                        {showResult && idx === currentQ.correct_index ? <CheckCircle className="h-4 w-4" /> :
                                            showResult && idx === selected && !isCorrect ? <XCircle className="h-4 w-4" /> :
                                                String.fromCharCode(65 + idx)}
                                    </span>
                                    <span>{answer}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Result & Next */}
                    {showResult && !gameOver && (
                        <div className="mt-6 text-center" style={{ animation: 'pop 0.3s ease-out' }}>
                            {isCorrect ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                                    <span className="text-2xl">🎉</span>
                                    <p className="text-emerald-700 font-bold mt-1">Chính xác! +{10 + floor * 2} XP</p>
                                </div>
                            ) : (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4" style={{ animation: 'shake 0.5s ease-in-out' }}>
                                    <span className="text-2xl">💔</span>
                                    <p className="text-red-700 font-bold mt-1">Sai rồi! Mất 1 mạng ({lives} mạng còn lại)</p>
                                </div>
                            )}
                            <button
                                onClick={handleNext}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                {isCorrect ? `Lên tầng ${floor + 1} →` : 'Câu tiếp →'}
                            </button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
};
