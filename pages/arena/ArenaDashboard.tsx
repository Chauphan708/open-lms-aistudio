import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { generateArenaStudyGuide } from '../../services/geminiService';
import { ArrowLeft, Sparkles, Brain, Target, Bot, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const ArenaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, attempts, exams, questionBank } = useStore();
    const [analytics, setAnalytics] = useState<any>(null);
    const [aiGuide, setAiGuide] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    useEffect(() => {
        if (!user) return;
        // Tính toán dựa trên 30 ngày gần nhất
        const result = computeStudentAnalytics(user.id, attempts, exams, questionBank, 30);
        setAnalytics(result);

        // Fetch AI Guide if there are weak topics
        if (result.weakTopics && result.weakTopics.length > 0) {
            const weakest = result.weakTopics[0];
            fetchAiGuide(weakest.topic, weakest.subject, weakest.incorrectRate);
        }
    }, [user, attempts, exams, questionBank]);

    const fetchAiGuide = async (topic: string, subject: string, incorrectRate: number) => {
        setIsLoadingAi(true);
        try {
            const guide = await generateArenaStudyGuide(topic, subject, incorrectRate);
            setAiGuide(guide);
        } catch (error) {
            console.error(error);
            setAiGuide("AI đang bận hoặc vượt quá giới hạn truy cập. Em vui lòng thử lại sau nhé!");
        } finally {
            setIsLoadingAi(false);
        }
    };

    if (!user || !analytics) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    const { weakTopics, avgScore, totalAttempts, byDifficulty } = analytics;

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
                .markdown-body ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                .markdown-body p { margin-bottom: 0.75rem !important; }
                .markdown-body strong { color: #4f46e5; }
            `}</style>
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <button onClick={() => navigate('/arena')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-600" />
                        Trạm Phân Tích AI
                    </h1>
                    <p className="text-sm text-gray-500">Phân tích năng lực chuyên sâu từ đấu trường</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Stats & Weaknesses */}
                <div className="col-span-1 space-y-6">
                    {/* Overview Stats */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg animate-slide-up">
                        <div className="text-purple-100 text-sm mb-4">Tổng quan Năng lực (30 ngày)</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-3xl font-black">{avgScore.toFixed(1)}</div>
                                <div className="text-xs text-purple-200 mt-1">Điểm Trung Bình</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black">{totalAttempts}</div>
                                <div className="text-xs text-purple-200 mt-1">Trận Đấu & Bài Tập</div>
                            </div>
                        </div>
                    </div>

                    {/* Weak Topics */}
                    <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5 text-red-500" />
                            <h2 className="font-bold text-gray-800">Cảnh báo Lỗ hổng</h2>
                        </div>
                        
                        {weakTopics.length > 0 ? (
                            <div className="space-y-4">
                                {weakTopics.slice(0, 3).map((topic: any, idx: number) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700 truncate pr-2 flex-1">{topic.topic}</span>
                                            <span className="text-red-600 font-bold whitespace-nowrap">Sai {topic.incorrectRate}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                                                style={{ width: `${topic.incorrectRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-emerald-600 bg-emerald-50 rounded-xl">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-80" />
                                <p className="font-medium">Tuyệt vời! Tuyến phòng thủ của bạn đang rất vững chắc.</p>
                            </div>
                        )}
                    </div>

                    {/* Difficulty Stats */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Độ khó chinh phục
                        </h2>
                        <div className="space-y-3">
                            {byDifficulty.map((diff: any) => (
                                <div key={diff.level} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">{diff.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400">{diff.correctQuestions}/{diff.totalQuestions} đúng</span>
                                        <span className={`text-sm font-bold px-2 py-1 rounded ${diff.correctRate > 70 ? 'bg-emerald-100 text-emerald-700' : diff.correctRate > 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {diff.correctRate}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Personalization */}
                <div className="col-span-1 md:col-span-2">
                    <div className="bg-[#f8faff] rounded-3xl p-6 border border-blue-100 h-full relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-purple-100 rounded-full opacity-50 blur-3xl"></div>

                        <div className="relative z-10 flex items-center gap-3 mb-6 border-b border-blue-100 pb-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
                                <Bot className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Bác Sĩ Học Tập AI</h2>
                                <p className="text-sm text-blue-600 font-medium">Kê đơn hướng dẫn cá nhân hoá</p>
                            </div>
                        </div>

                        <div className="relative z-10">
                            {weakTopics.length === 0 ? (
                                <div className="text-center py-16">
                                    <Sparkles className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa phát hiện điểm yếu!</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto">Em đang làm rất tốt các bài tập. Hãy cố gắng trải nghiệm thêm Tháp Arena để AI có thể phân tích sâu hơn nhé.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-bold mb-6 border border-red-100">
                                        <AlertTriangle className="h-4 w-4" />
                                        Mục tiêu cần khắc phục: {weakTopics[0].topic}
                                    </div>
                                    
                                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white">
                                        {isLoadingAi ? (
                                            <div className="py-12 flex flex-col items-center">
                                                <div className="w-16 h-16 relative mb-4">
                                                    <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                                                    <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                                    <Bot className="absolute inset-0 m-auto h-6 w-6 text-indigo-400" />
                                                </div>
                                                <p className="text-indigo-600 font-medium animate-pulse">Thầy Cô AI đang phân tích lỗi sai và viết hướng dẫn cho em...</p>
                                            </div>
                                        ) : (
                                            <div className="prose prose-blue max-w-none markdown-body text-gray-800 text-[15px] leading-relaxed">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {aiGuide}
                                                </ReactMarkdown>
                                                
                                                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                                                    <span className="text-xs text-gray-400 italic">Gợi ý được sinh tự động bởi hệ thống AI OpenLMS</span>
                                                    <button 
                                                        onClick={() => fetchAiGuide(weakTopics[0].topic, weakTopics[0].subject, weakTopics[0].incorrectRate)}
                                                        className="text-sm font-bold flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        ✨ Nhờ AI phân tích lại
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => navigate('/arena/tower')}
                                        className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 group transition-all shadow-md shadow-indigo-200"
                                    >
                                        Ôn tập Chủ đề này trên Tháp Arena 
                                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
