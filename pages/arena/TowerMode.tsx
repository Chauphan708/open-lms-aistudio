
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion, ArenaMatchFilters } from '../../types';
import { ArrowLeft, Heart, HeartOff, Star, Zap, GraduationCap, CheckCircle, XCircle, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathText from '../../components/MathText';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';



const TOWER_FLOORS = [
    { range: [1, 5], name: 'Sân Trường', emoji: '🏫', color: '#10b981' },
    { range: [6, 10], name: 'Thư Viện Cổ', emoji: '📚', color: '#6366f1' },
    { range: [11, 15], name: 'Phòng Thí Nghiệm', emoji: '🧪', color: '#8b5cf6' },
    { range: [16, 20], name: 'Đỉnh Trí Tuệ', emoji: '🏔️', color: '#f59e0b' },
    { range: [21, Infinity], name: 'Vùng Đất Huyền Thoại', emoji: '✨', color: '#ef4444' },
];

const getFloorInfo = (floor: number) => {
    return TOWER_FLOORS.find(f => floor >= f.range[0] && floor <= f.range[1]) || TOWER_FLOORS[0];
};

const SUBJECTS = [
    { value: '', label: '🎲 Tất cả' },
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
];

export const TowerMode: React.FC = () => {
    const { user, arenaProfile, arenaQuestions, fetchArenaQuestions, updateArenaProfile, exams } = useStore();
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

    // Setup state
    const [started, setStarted] = useState(false);
    const [sourceType, setSourceType] = useState<'arena' | 'exam' | 'ai_adaptive'>('arena');
    const [filterSubject, setFilterSubject] = useState('');
    const [allQuestions, setAllQuestions] = useState<ArenaQuestion[]>([]);
    const [aiReasoning, setAiReasoning] = useState<string>('');

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);

    const initialized = useRef(false);

    useEffect(() => {
        if (arenaProfile && !initialized.current) {
            setFloor(arenaProfile.tower_floor);
            initialized.current = true;
        }
    }, [arenaProfile]);

    const { attempts, questionBank } = useStore();

    const buildQuestionPool = () => {
        let pool: ArenaQuestion[] = [];

        if (sourceType === 'ai_adaptive') {
            // Compute student's weak points real-time
            const analytics = computeStudentAnalytics(user?.id || '', attempts, exams, questionBank, 30);
            const weakTopics = analytics.weakTopics;
            
            if (weakTopics.length > 0) {
                const weakest = weakTopics[0];
                setAiReasoning(`AI phát hiện bạn đang yếu môn ${weakest.subject} (Tỉ lệ sai: ${weakest.incorrectRate}%). Tháp đã được cấu hình với các câu hỏi khó nhất thuộc chủ đề này để bạn rèn luyện!`);
                
                // Pick questions matching the weak subject/topic, prioritizing higher difficulty
                exams.forEach(exam => {
                    if (exam.status === 'PUBLISHED' && (exam.subject === weakest.subject || exam.topic === weakest.topic)) {
                        exam.questions.filter(q => q.type === 'MCQ').forEach(q => {
                            pool.push({
                                id: `exam_${exam.id}_${q.id}`,
                                content: q.content,
                                answers: q.options.slice(0, 4),
                                correct_index: q.correctOptionIndex || 0,
                                difficulty: q.level === 'VAN_DUNG' ? 3 : q.level === 'KET_NOI' ? 2 : 1,
                                subject: exam.subject || ''
                            });
                        });
                    }
                });
                // Sort to put harder questions at the higher floors
                pool.sort((a, b) => b.difficulty - a.difficulty);
            } else {
                setAiReasoning('AI chưa tìm thấy điểm yếu rõ rệt. Đang tổng hợp toàn bộ câu hỏi khó từ các môn để thử thách bạn!');
                // Fallback: just hard questions
                exams.forEach(exam => {
                    exam.questions.filter(q => q.level === 'VAN_DUNG').forEach(q => {
                        pool.push({
                            id: `ai_${exam.id}_${q.id}`, content: q.content, answers: q.options.slice(0, 4), correct_index: q.correctOptionIndex || 0, difficulty: 3, subject: exam.subject || ''
                        });
                    });
                });
            }
        } else if (sourceType === 'exam') {
            exams
                .filter(e => e.status === 'PUBLISHED')
                .filter(e => !filterSubject || e.subject === filterSubject)
                .forEach(exam => {
                    exam.questions
                        .filter(q => q.type === 'MCQ' && q.options.length >= 4 && q.correctOptionIndex !== undefined)
                        .forEach(q => {
                            pool.push({
                                id: `exam_${exam.id}_${q.id}`,
                                content: q.content,
                                answers: q.options.slice(0, 4),
                                correct_index: q.correctOptionIndex!,
                                difficulty: exam.difficulty === 'NHAN_BIET' ? 1 : exam.difficulty === 'KET_NOI' ? 2 : 3,
                                subject: exam.subject || ''
                            });
                        });
                });
        } else {
            pool = arenaQuestions.filter(q => !filterSubject || q.subject === filterSubject);
        }

        return pool;
    };

    const handleStart = () => {
        const pool = buildQuestionPool();
        if (pool.length === 0) {
            alert("Không đủ câu hỏi trong ngân hàng dữ liệu để bắt đầu!");
            return;
        }
        setAllQuestions(pool);
        setStarted(true);
        pickNextQuestion(pool, new Set());
    };

    // Timer countdown
    useEffect(() => {
        if (!currentQ || showResult || gameOver || !started) return;
        if (timer <= 0) { handleAnswer(-1); return; }
        const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [timer, currentQ, showResult, gameOver, started]);

    const pickNextQuestion = (pool?: ArenaQuestion[], used?: Set<string>) => {
        const qPool = pool || allQuestions;
        const usedSet = used || usedIds;
        const available = qPool.filter(q => !usedSet.has(q.id));
        if (available.length === 0) {
            setUsedIds(new Set());
            const shuffled = qPool.sort(() => Math.random() - 0.5);
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
            if (arenaProfile) {
                updateArenaProfile({ id: arenaProfile.id, tower_floor: floor + 1, total_xp: arenaProfile.total_xp + xp });
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
        if (!showResult) return;
        if (isCorrect) setFloor(prev => prev + 1);
        pickNextQuestion();
    };

    const handleRestart = () => {
        setLives(3);
        setFloor(1);
        setGameOver(false);
        setUsedIds(new Set());
        setCurrentQ(null);
        setXpGained(0);
        setStarted(false);
    };

    const floorInfo = getFloorInfo(floor);

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

    // Setup screen
    if (!started) {
        const pool = buildQuestionPool();
        return (
            <div className="max-w-md mx-auto">
                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/arena')} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-amber-500" /> Leo Cấp Kiến Thức
                    </h1>
                </div>

                <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    {/* Lore */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 text-center">
                        <p className="text-4xl mb-2">{floorInfo.emoji}</p>
                        <h3 className="font-bold text-amber-800">{floorInfo.name}</h3>
                        <p className="text-xs text-amber-600 mt-1">Bạn đang ở tầng {floor}</p>
                    </div>

                    {/* Source */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nguồn câu hỏi</label>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setSourceType('ai_adaptive')}
                                className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-3 justify-center ${sourceType === 'ai_adaptive' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md transform scale-[1.02]' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                                <Sparkles className={`h-5 w-5 ${sourceType === 'ai_adaptive' ? 'text-purple-600 animate-pulse' : 'text-gray-400'}`} /> 
                                Phân tích & Gợi ý điểm yếu (AI Adaptive)
                            </button>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <button onClick={() => setSourceType('exam')}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${sourceType === 'exam' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-amber-200'}`}>
                                    📋 Ngân hàng bài tập
                                </button>
                                <button onClick={() => setSourceType('arena')}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${sourceType === 'arena' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-amber-200'}`}>
                                    🧠 Bộ ngẫu nhiên
                                </button>
                            </div>
                        </div>
                    </div>

                    {sourceType === 'ai_adaptive' && (
                        <div className="bg-purple-100 text-purple-800 p-3 rounded-lg text-sm italic flex items-start gap-2 animate-in fade-in">
                            <Bot className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            {aiReasoning || "Hệ thống đang trích xuất dữ liệu bài nộp của bạn để tìm ra các chủ đề bạn hay làm sai nhất..."}
                        </div>
                    )}

                    {/* Subject (Only for standard modes) */}
                    {sourceType !== 'ai_adaptive' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Môn học màng lọc</label>
                            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                                {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Question count */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-2xl font-black text-gray-800">{pool.length}</span>
                        <span className="text-sm text-gray-500 ml-2">câu hỏi có sẵn</span>
                    </div>

                    <button onClick={handleStart} disabled={pool.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${pool.length > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                        🚀 Bắt đầu leo cấp!
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
                            <Heart key={i} className={`h-6 w-6 transition-all duration-300 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300'}`}
                                style={i >= lives ? { animation: 'shake 0.3s ease-in-out' } : {}} />
                        ))}
                    </div>
                    {/* Floor */}
                    <div className="px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-1.5"
                        style={{ backgroundColor: floorInfo.color + '20', color: floorInfo.color }}>
                        <span>{floorInfo.emoji}</span>
                        {floorInfo.name} • Tầng {floor}
                    </div>
                </div>
            </div>

            {/* Game Over */}
            {gameOver ? (
                <div className="text-center py-16" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="text-6xl mb-4">😔</div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Hết mạng!</h2>
                    <p className="text-gray-500 mb-2">Bạn đã leo đến <strong className="text-amber-600">{floorInfo.name} - Tầng {floor}</strong></p>
                    <p className="text-gray-500 mb-6">Tổng XP kiếm được: <strong className="text-emerald-600">{xpGained}</strong></p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleRestart} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all">
                            🔄 Thử lại
                        </button>
                        <button onClick={() => navigate('/arena')} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all">
                            Quay lại
                        </button>
                    </div>
                </div>
            ) : currentQ ? (
                <>
                    {/* Timer Bar */}
                    <div className="mb-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${(timer / 30) * 100}%`, backgroundColor: timer > 15 ? '#10b981' : timer > 5 ? '#f59e0b' : '#ef4444' }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>⏱️ {timer}s</span>
                            <span className="text-gray-300">{floorInfo.emoji} {floorInfo.name} - Tầng {floor}</span>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div className="flex items-start gap-3 mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0">
                                {currentQ.subject === 'math' ? '📐 Toán' : currentQ.subject === 'science' ? '🔬 Khoa học' : currentQ.subject === 'technology' ? '💻 Công nghệ' : '📋 ' + currentQ.subject}
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {currentQ.difficulty === 1 ? 'Dễ' : currentQ.difficulty === 2 ? 'TB' : 'Khó'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 mt-3 leading-relaxed">
                            <MathText>{currentQ.content}</MathText>
                        </div>
                    </div>

                    {/* Answers */}
                    <div className="space-y-3">
                        {currentQ.answers.map((answer, idx) => {
                            let btnClass = 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700';
                            if (showResult) {
                                if (idx === currentQ.correct_index) btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                                else if (idx === selected && !isCorrect) btnClass = 'bg-red-50 border-red-500 text-red-700';
                                else btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                            }
                            return (
                                <button key={idx} onClick={() => handleAnswer(idx)} disabled={showResult}
                                    className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 flex items-center gap-3 ${btnClass} ${!showResult ? 'hover:shadow-md active:scale-[0.98]' : ''}`}
                                    style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both` }}>
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${showResult && idx === currentQ.correct_index ? 'bg-emerald-500 text-white' : showResult && idx === selected && !isCorrect ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {showResult && idx === currentQ.correct_index ? <CheckCircle className="h-4 w-4" /> : showResult && idx === selected && !isCorrect ? <XCircle className="h-4 w-4" /> : String.fromCharCode(65 + idx)}
                                    </span>
                                    <MathText>{answer}</MathText>
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
                            <button onClick={handleNext} disabled={!showResult} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50">
                                {isCorrect ? `Lên tầng ${floor + 1} →` : 'Câu tiếp →'}
                            </button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
};
