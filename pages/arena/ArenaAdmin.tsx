
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion } from '../../types';
import { Brain, Plus, Pencil, Trash2, Save, X, BookOpen, Filter, ArrowLeft, Upload, Download, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const SUBJECTS = [
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
];

const DIFFICULTIES = [
    { value: 1, label: 'Dễ' },
    { value: 2, label: 'Trung bình' },
    { value: 3, label: 'Khó' },
];

export const ArenaAdmin: React.FC = () => {
    const { arenaQuestions, fetchArenaQuestions, addArenaQuestion, updateArenaQuestion, deleteArenaQuestion, bulkAddArenaQuestions } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState(0);
    const [editing, setEditing] = useState<ArenaQuestion | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Import state
    const [showImport, setShowImport] = useState(false);
    const [importPreview, setImportPreview] = useState<Omit<ArenaQuestion, 'id'>[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit form
    const [formContent, setFormContent] = useState('');
    const [formAnswers, setFormAnswers] = useState(['', '', '', '']);
    const [formCorrect, setFormCorrect] = useState(0);
    const [formDifficulty, setFormDifficulty] = useState(1);
    const [formSubject, setFormSubject] = useState('math');
    const [formTopic, setFormTopic] = useState('');

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);

    const filteredQuestions = arenaQuestions.filter(q =>
        (!filterSubject || q.subject === filterSubject) &&
        (!filterDifficulty || q.difficulty === filterDifficulty)
    );

    const openNew = () => {
        setIsNew(true);
        setFormContent('');
        setFormAnswers(['', '', '', '']);
        setFormCorrect(0);
        setFormDifficulty(1);
        setFormSubject('math');
        setFormTopic('');
        setEditing({} as ArenaQuestion);
    };

    const openEdit = (q: ArenaQuestion) => {
        setIsNew(false);
        setFormContent(q.content);
        setFormAnswers([...q.answers]);
        setFormCorrect(q.correct_index);
        setFormDifficulty(q.difficulty);
        setFormSubject(q.subject);
        setFormTopic(q.topic || '');
        setEditing(q);
    };

    const handleSave = async () => {
        if (!formContent.trim() || formAnswers.some(a => !a.trim())) return;

        if (isNew) {
            await addArenaQuestion({
                content: formContent.trim(),
                answers: formAnswers,
                correct_index: formCorrect,
                difficulty: formDifficulty,
                subject: formSubject,
                topic: formTopic.trim() || 'general',
            });
        } else if (editing) {
            await updateArenaQuestion({
                ...editing,
                content: formContent.trim(),
                answers: formAnswers,
                correct_index: formCorrect,
                difficulty: formDifficulty,
                subject: formSubject,
                topic: formTopic.trim() || 'general',
            });
        }
        setEditing(null);
    };

    const handleDelete = async (id: string) => {
        await deleteArenaQuestion(id);
        setDeleteConfirm(null);
    };

    // CSV Import
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
            setImportErrors(['File rỗng hoặc chỉ có dòng tiêu đề']);
            return;
        }

        const questions: Omit<ArenaQuestion, 'id'>[] = [];
        const errors: string[] = [];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length < 7) {
                errors.push(`Dòng ${i + 1}: Thiếu cột (cần ít nhất 7, có ${cols.length})`);
                continue;
            }

            const [content, ansA, ansB, ansC, ansD, correctStr, diffStr, subject, topic] = cols;

            if (!content?.trim()) { errors.push(`Dòng ${i + 1}: Thiếu nội dung câu hỏi`); continue; }
            if (!ansA?.trim() || !ansB?.trim() || !ansC?.trim() || !ansD?.trim()) {
                errors.push(`Dòng ${i + 1}: Thiếu đáp án`); continue;
            }

            const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
            const correctIndex = correctMap[correctStr?.trim()];
            if (correctIndex === undefined) {
                errors.push(`Dòng ${i + 1}: Đáp án đúng phải là A/B/C/D (nhận "${correctStr}")`);
                continue;
            }

            const difficulty = parseInt(diffStr?.trim());
            if (isNaN(difficulty) || difficulty < 1 || difficulty > 3) {
                errors.push(`Dòng ${i + 1}: Độ khó phải là 1-3 (nhận "${diffStr}")`);
                continue;
            }

            questions.push({
                content: content.trim(),
                answers: [ansA.trim(), ansB.trim(), ansC.trim(), ansD.trim()],
                correct_index: correctIndex,
                difficulty,
                subject: (subject?.trim() || 'math').toLowerCase(),
                topic: topic?.trim() || 'general',
            });
        }

        setImportPreview(questions);
        setImportErrors(errors);
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const handleImport = async () => {
        if (importPreview.length === 0) return;
        setImporting(true);
        const count = await bulkAddArenaQuestions(importPreview);
        setImportResult({ count });
        setImporting(false);
        setImportPreview([]);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full inline-block" style={{ animation: 'spin 1s linear infinite' }}></div>
                    <p className="mt-4 text-gray-500">Đang tải câu hỏi...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/arena')} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Brain className="h-7 w-7 text-indigo-500" /> QL Ngân hàng Đề Đấu Trí
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Import CSV
                    </button>
                    <a href="/arena_questions_template.csv" download className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 flex items-center gap-2">
                        <Download className="h-4 w-4" /> File mẫu
                    </a>
                    <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Thêm câu hỏi
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border p-3">
                <Filter className="h-4 w-4 text-gray-400" />
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Tất cả môn</option>
                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value={0}>Tất cả độ khó</option>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <span className="text-xs text-gray-400 ml-auto">{filteredQuestions.length} câu hỏi</span>
            </div>

            {/* Question List */}
            <div className="space-y-3">
                {filteredQuestions.map(q => (
                    <div key={q.id} className="bg-white rounded-xl border p-4 hover:border-indigo-200 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex gap-2 mb-1">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                                        {SUBJECTS.find(s => s.value === q.subject)?.label || q.subject}
                                    </span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                        {DIFFICULTIES.find(d => d.value === q.difficulty)?.label || 'N/A'}
                                    </span>
                                    {q.topic && q.topic !== 'general' && (
                                        <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs font-bold">
                                            {q.topic}
                                        </span>
                                    )}
                                </div>
                                <p className="font-medium text-gray-900 text-sm">{q.content}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(q)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => setDeleteConfirm(q.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {q.answers.map((a, i) => (
                                <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg ${i === q.correct_index ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'bg-gray-50 text-gray-600'}`}>
                                    {String.fromCharCode(65 + i)}. {a}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit / New Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h3 className="font-bold text-lg">{isNew ? '➕ Thêm câu hỏi' : '✏️ Sửa câu hỏi'}</h3>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi</label>
                                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập câu hỏi..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {formAnswers.map((a, i) => (
                                    <div key={i}>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án {String.fromCharCode(65 + i)}</label>
                                        <input value={a} onChange={e => {
                                            const cp = [...formAnswers]; cp[i] = e.target.value; setFormAnswers(cp);
                                        }} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án đúng</label>
                                    <select value={formCorrect} onChange={e => setFormCorrect(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                        {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Độ khó</label>
                                    <select value={formDifficulty} onChange={e => setFormDifficulty(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Môn</label>
                                    <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Chủ đề (tuỳ chọn)</label>
                                <input value={formTopic} onChange={e => setFormTopic(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: Phân số, Hình học..." />
                            </div>
                        </div>
                        <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white">
                            <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Huỷ</button>
                            <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                                <Save className="h-4 w-4" /> Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Xoá câu hỏi này?</h3>
                        <p className="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Hủy</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Xoá</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowImport(false); setImportPreview([]); setImportErrors([]); setImportResult(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-emerald-500" /> Import câu hỏi từ CSV</h3>
                            <button onClick={() => { setShowImport(false); setImportPreview([]); setImportErrors([]); setImportResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {importResult ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import thành công!</h3>
                                    <p className="text-gray-500">Đã thêm <strong className="text-emerald-600">{importResult.count}</strong> câu hỏi</p>
                                    <button onClick={() => { setShowImport(false); setImportResult(null); }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Đóng</button>
                                </div>
                            ) : (
                                <>
                                    {/* Instructions */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                                        <p className="font-bold mb-1">📋 Hướng dẫn:</p>
                                        <ol className="list-decimal pl-5 space-y-1 text-xs">
                                            <li>Tải file mẫu CSV bằng nút "File mẫu" ở trên</li>
                                            <li>Điền câu hỏi vào file theo mẫu</li>
                                            <li>Chọn file dưới đây để import</li>
                                        </ol>
                                    </div>

                                    {/* File input */}
                                    <div>
                                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center">
                                            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm font-bold text-gray-700">Chọn file CSV</p>
                                            <p className="text-xs text-gray-400 mt-1">Hỗ trợ .csv, .txt (UTF-8)</p>
                                        </button>
                                    </div>

                                    {/* Errors */}
                                    {importErrors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                                            <p className="text-xs font-bold text-red-700 mb-1">⚠️ Lỗi ({importErrors.length}):</p>
                                            {importErrors.map((e, i) => (
                                                <p key={i} className="text-xs text-red-600">{e}</p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {importPreview.length > 0 && (
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 mb-2">✅ Preview ({importPreview.length} câu hỏi hợp lệ)</p>
                                            <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
                                                {importPreview.slice(0, 10).map((q, i) => (
                                                    <div key={i} className="p-2.5 text-xs">
                                                        <div className="flex gap-1.5 mb-1">
                                                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{q.subject}</span>
                                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Lv.{q.difficulty}</span>
                                                            {q.topic && q.topic !== 'general' && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{q.topic}</span>}
                                                        </div>
                                                        <p className="text-gray-800">{q.content}</p>
                                                    </div>
                                                ))}
                                                {importPreview.length > 10 && <div className="p-2.5 text-xs text-gray-400 text-center">... và {importPreview.length - 10} câu nữa</div>}
                                            </div>
                                            <button onClick={handleImport} disabled={importing}
                                                className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                {importing ? '⏳ Đang import...' : `📥 Import ${importPreview.length} câu hỏi`}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
