import React, { useState } from 'react';
import { useStore } from '../store';
import { Question } from '../types';
import { generateQuestionsByTopic } from '../services/geminiService';
import { BarChart3, Plus, Trash2, Wand2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

interface MatrixRow {
    id: string;
    topic: string;
    level1Percent: number; // Nhận biết
    level2Percent: number; // Kết nối
    level3Percent: number; // Vận dụng
    mcqPercent: number;    // % Trắc nghiệm (phần còn lại là tự luận)
}

interface MatrixConfigProps {
    onGenerate: (questions: Question[]) => void;
    subject: string;
    grade: string;
}

// Hàm xáo trộn mảng đơn giản để không cần lodash
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

export const MatrixConfig: React.FC<MatrixConfigProps> = ({ onGenerate, subject, grade }) => {
    const { questionBank } = useStore();
    const [totalQuestions, setTotalQuestions] = useState(40);
    const [rows, setRows] = useState<MatrixRow[]>([
        { id: '1', topic: '', level1Percent: 40, level2Percent: 30, level3Percent: 30, mcqPercent: 100 }
    ]);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiFilling, setIsAiFilling] = useState(false);
    const [missingInfo, setMissingInfo] = useState<{ topic: string; level: string; count: number }[]>([]);

    // Validate and calculate
    const totalPercentage = rows.reduce((sum, r) => sum + (r.level1Percent || 0) + (r.level2Percent || 0) + (r.level3Percent || 0), 0);

    // Tính số câu cho mỗi ô
    const getCount = (percent: number) => Math.round((percent / 100) * totalQuestions);

    const handleAddRow = () => {
        setRows([...rows, { id: Date.now().toString(), topic: '', level1Percent: 0, level2Percent: 0, level3Percent: 0, mcqPercent: 100 }]);
    };

    const handleRemoveRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof MatrixRow, value: string | number) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleGenerate = async () => {
        setError(null);
        setMissingInfo([]);
        if (totalPercentage !== 100) {
            setError(`Tổng tỉ lệ các mức độ phải bằng 100% (Hiện tại: ${totalPercentage}%)`);
            return;
        }

        setIsGenerating(true);
        try {
            // 1. Filter bank by subject and grade
            const availableQuestions = questionBank.filter(q => q.subject === subject && q.grade === grade);

            let generatedQuestions: Question[] = [];
            let newMissingList: typeof missingInfo = [];

            // 2. Process each row
            for (const row of rows) {
                if (!row.topic.trim()) {
                    setError("Vui lòng nhập tên chủ đề cho tất cả các dòng.");
                    setIsGenerating(false);
                    return;
                }

                const topicQuestions = availableQuestions.filter(q => q.topic?.toLowerCase().includes(row.topic.toLowerCase()));

                // Calculate counts based on percentages
                const targetL1 = getCount(row.level1Percent);
                const targetL2 = getCount(row.level2Percent);
                const targetL3 = getCount(row.level3Percent);

                // Extract by levels
                const getQs = (level: string, count: number) => {
                    if (count === 0) return [];
                    const matched = topicQuestions.filter(q => q.level === level);
                    if (matched.length < count) {
                        const shortage = count - matched.length;
                        newMissingList.push({ topic: row.topic, level, count: shortage });
                        return matched; // Take all available
                    }
                    return shuffleArray(matched).slice(0, count);
                };

                generatedQuestions = [
                    ...generatedQuestions,
                    ...getQs('NHAN_BIET', targetL1),
                    ...getQs('THONG_HIEU', targetL2),
                    ...getQs('VAN_DUNG', targetL3),
                ];
            }

            if (newMissingList.length > 0) {
                setMissingInfo(newMissingList);
                const lines = newMissingList.map(m => `- "${m.topic}" (${m.level}): thiếu ${m.count} câu`);
                setError(`Ngân hàng thiếu câu hỏi:\n${lines.join('\n')}\nBạn có thể bấm "AI Sinh Bù" để AI tự tạo thêm.`);
            }

            // Shuffle final
            generatedQuestions = shuffleArray(generatedQuestions);
            onGenerate(generatedQuestions);
        } catch (e: any) {
            setError(e.message || "Đã xảy ra lỗi khi tạo ma trận.");
        } finally {
            setIsGenerating(false);
        }
    };

    // AI Sinh Bù: Gọi AI để tạo thêm câu hỏi cho các slot thiếu
    const handleAiFillGap = async () => {
        if (missingInfo.length === 0) return;
        setIsAiFilling(true);
        setError(null);

        try {
            let aiQuestions: Question[] = [];

            for (const missing of missingInfo) {
                const levelMap: Record<string, string> = {
                    'NHAN_BIET': 'Mức 1 (Nhận biết - Nhắc lại)',
                    'THONG_HIEU': 'Mức 2 (Kết nối)',
                    'VAN_DUNG': 'Mức 3 (Vận dụng - Giải quyết vấn đề)'
                };

                const generated = await generateQuestionsByTopic(
                    `${subject}: ${missing.topic}`,
                    grade,
                    'MCQ',
                    levelMap[missing.level] || 'Mức 1 (Nhận biết)',
                    missing.count,
                    `Tạo đúng ${missing.count} câu hỏi cấp độ ${missing.level} cho chủ đề "${missing.topic}".`
                );

                aiQuestions = [...aiQuestions, ...generated];
            }

            onGenerate(aiQuestions);
            setMissingInfo([]);
            setError(null);
        } catch (e: any) {
            setError(`Lỗi AI Sinh Bù: ${e.message}`);
        } finally {
            setIsAiFilling(false);
        }
    };

    return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-0">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-600" /> Cấu trúc Ma trận sinh đề
                </h3>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2 text-sm whitespace-pre-wrap flex-shrink-0">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        {error}
                        {missingInfo.length > 0 && (
                            <button
                                onClick={handleAiFillGap}
                                disabled={isAiFilling}
                                className="mt-2 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isAiFilling ? <><Loader2 className="h-3 w-3 animate-spin" /> AI đang tạo câu bù...</> : <><Sparkles className="h-3 w-3" /> 🤖 AI Sinh Bù</>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tổng số câu hỏi</label>
                <input
                    type="number" value={totalQuestions} onChange={e => setTotalQuestions(Number(e.target.value))}
                    className="w-full xl:w-1/3 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                    min="1"
                />
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto border border-gray-200 rounded-lg bg-white relative">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="px-3 py-2 border-b whitespace-nowrap">Chủ đề</th>
                            <th className="px-3 py-2 border-b text-center text-blue-700 whitespace-nowrap" title="Nhận biết">N.Biết (%)</th>
                            <th className="px-2 py-2 border-b text-center text-blue-500 whitespace-nowrap text-xs">Câu</th>
                            <th className="px-3 py-2 border-b text-center text-orange-700 whitespace-nowrap" title="Kết nối">Kết nối (%)</th>
                            <th className="px-2 py-2 border-b text-center text-orange-500 whitespace-nowrap text-xs">Câu</th>
                            <th className="px-3 py-2 border-b text-center text-red-700 whitespace-nowrap" title="Vận dụng">V.Dụng (%)</th>
                            <th className="px-2 py-2 border-b text-center text-red-500 whitespace-nowrap text-xs">Câu</th>
                            <th className="px-3 py-2 border-b text-center whitespace-nowrap">% TN</th>
                            <th className="px-3 py-2 border-b bg-gray-50"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="p-2 align-top">
                                    <input type="text" placeholder="VD: Hình học" value={row.topic} onChange={e => updateRow(row.id, 'topic', e.target.value)} className="w-full min-w-[120px] border rounded p-1.5 text-xs bg-white text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                </td>
                                <td className="p-2 align-top"><input type="number" min="0" value={row.level1Percent} onChange={e => updateRow(row.id, 'level1Percent', Number(e.target.value))} className="w-14 border rounded p-1.5 text-center text-xs mx-auto block bg-white text-gray-900" /></td>
                                <td className="p-1 align-top text-center text-xs font-bold text-blue-600">{getCount(row.level1Percent)}</td>
                                <td className="p-2 align-top"><input type="number" min="0" value={row.level2Percent} onChange={e => updateRow(row.id, 'level2Percent', Number(e.target.value))} className="w-14 border rounded p-1.5 text-center text-xs mx-auto block bg-white text-gray-900" /></td>
                                <td className="p-1 align-top text-center text-xs font-bold text-orange-600">{getCount(row.level2Percent)}</td>
                                <td className="p-2 align-top"><input type="number" min="0" value={row.level3Percent} onChange={e => updateRow(row.id, 'level3Percent', Number(e.target.value))} className="w-14 border rounded p-1.5 text-center text-xs mx-auto block bg-white text-gray-900" /></td>
                                <td className="p-1 align-top text-center text-xs font-bold text-red-600">{getCount(row.level3Percent)}</td>
                                <td className="p-2 align-top"><input type="number" min="0" max="100" value={row.mcqPercent} onChange={e => updateRow(row.id, 'mcqPercent', Number(e.target.value))} className="w-14 border rounded p-1.5 text-center text-xs mx-auto block bg-white text-gray-900" title="% Trắc nghiệm" /></td>
                                <td className="p-2 text-center align-top">
                                    <button onClick={() => handleRemoveRow(row.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" disabled={rows.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold sticky bottom-0 border-t shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
                        <tr>
                            <td className="p-3 text-right text-gray-700">Tổng tỉ lệ:</td>
                            <td colSpan={8} className={`p-3 ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPercentage}% = {totalQuestions} câu {totalPercentage !== 100 && <span className="text-xs font-normal ml-1">(Yêu cầu = 100%)</span>}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex gap-2 flex-shrink-0 mt-2">
                <button onClick={handleAddRow} className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors border">
                    <Plus className="h-4 w-4" /> Dòng
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || totalPercentage !== 100}
                    className={`flex-[3] py-2.5 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm
             ${isGenerating || totalPercentage !== 100 ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow'}
           `}
                >
                    <Wand2 className="h-4 w-4" /> {isGenerating ? 'Đang bốc câu hỏi...' : 'Rút câu hỏi tự động'}
                </button>
            </div>
        </div>
    );
};
