
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion } from '../../types';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Swords, BookOpen, Filter } from 'lucide-react';

const SUBJECTS = [
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
];

const DIFFICULTIES = [
    { value: 1, label: 'Dễ' },
    { value: 2, label: 'Trung bình' },
    { value: 3, label: 'Khó' },
];

export const ArenaAdmin: React.FC = () => {
    const { arenaQuestions, fetchArenaQuestions, addArenaQuestion, updateArenaQuestion, deleteArenaQuestion } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterSubject, setFilterSubject] = useState('all');
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [content, setContent] = useState('');
    const [answers, setAnswers] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [difficulty, setDifficulty] = useState(1);
    const [subject, setSubject] = useState('math');

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);

    const resetForm = () => {
        setContent('');
        setAnswers(['', '', '', '']);
        setCorrectIndex(0);
        setDifficulty(1);
        setSubject('math');
        setEditingId(null);
    };

    const openEdit = (q: ArenaQuestion) => {
        setContent(q.content);
        setAnswers([...q.answers]);
        setCorrectIndex(q.correct_index);
        setDifficulty(q.difficulty);
        setSubject(q.subject);
        setEditingId(q.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!content.trim() || answers.some(a => !a.trim())) return;
        setSaving(true);

        if (editingId) {
            await updateArenaQuestion({
                id: editingId,
                content,
                answers,
                correct_index: correctIndex,
                difficulty,
                subject
            });
        } else {
            await addArenaQuestion({
                content,
                answers,
                correct_index: correctIndex,
                difficulty,
                subject
            });
        }

        setSaving(false);
        setShowForm(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        await deleteArenaQuestion(id);
        setDeleteConfirm(null);
    };

    const filtered = filterSubject === 'all'
        ? arenaQuestions
        : arenaQuestions.filter(q => q.subject === filterSubject);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/arena')} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Swords className="h-6 w-6 text-indigo-600" /> Quản lý Câu hỏi Arena
                    </h1>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Thêm câu hỏi
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-black text-indigo-600">{arenaQuestions.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Tổng câu hỏi</p>
                </div>
                {SUBJECTS.map(s => (
                    <div key={s.value} className="bg-white rounded-xl border p-4 text-center">
                        <p className="text-2xl font-black text-gray-800">{arenaQuestions.filter(q => q.subject === s.value).length}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setFilterSubject('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterSubject === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Tất cả
                </button>
                {SUBJECTS.map(s => (
                    <button
                        key={s.value}
                        onClick={() => setFilterSubject(s.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterSubject === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Question List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Chưa có câu hỏi nào</p>
                    </div>
                ) : (
                    filtered.map((q, idx) => (
                        <div key={q.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${q.subject === 'math' ? 'bg-blue-100 text-blue-700' :
                                                q.subject === 'science' ? 'bg-green-100 text-green-700' :
                                                    'bg-purple-100 text-purple-700'
                                            }`}>
                                            {SUBJECTS.find(s => s.value === q.subject)?.label}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${q.difficulty === 1 ? 'bg-emerald-100 text-emerald-700' :
                                                q.difficulty === 2 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {DIFFICULTIES.find(d => d.value === q.difficulty)?.label}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-900 text-sm mb-2">{q.content}</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {q.answers.map((a, i) => (
                                            <span key={i} className={`text-xs px-2 py-1 rounded ${i === q.correct_index ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'bg-gray-50 text-gray-500'
                                                }`}>
                                                {String.fromCharCode(65 + i)}. {a} {i === q.correct_index && '✓'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => openEdit(q)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setDeleteConfirm(q.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Delete Confirm */}
                            {deleteConfirm === q.id && (
                                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between">
                                    <span className="text-sm text-red-700 font-medium">Xóa câu hỏi này?</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDelete(q.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600">Xóa</button>
                                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-white text-gray-600 rounded-lg text-xs font-bold border hover:bg-gray-50">Hủy</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); resetForm(); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Subject & Difficulty */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Môn</label>
                                    <select value={subject} onChange={e => setSubject(e.target.value)}
                                        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Độ khó</label>
                                    <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Câu hỏi</label>
                                <textarea value={content} onChange={e => setContent(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                                    placeholder="Nhập nội dung câu hỏi..." />
                            </div>

                            {/* Answers */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">4 Đáp án</label>
                                {answers.map((a, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectIndex(i)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${correctIndex === i ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {String.fromCharCode(65 + i)}
                                        </button>
                                        <input
                                            value={a}
                                            onChange={e => {
                                                const newArr = [...answers];
                                                newArr[i] = e.target.value;
                                                setAnswers(newArr);
                                            }}
                                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                                        />
                                        {correctIndex === i && <span className="text-emerald-500 text-xs font-bold">✓ Đúng</span>}
                                    </div>
                                ))}
                                <p className="text-xs text-gray-400 mt-1">Bấm vào chữ A/B/C/D để chọn đáp án đúng</p>
                            </div>
                        </div>
                        <div className="p-6 border-t flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving || !content.trim() || answers.some(a => !a.trim())}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                            >
                                <Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm câu hỏi'}
                            </button>
                            <button
                                onClick={() => { setShowForm(false); resetForm(); }}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
