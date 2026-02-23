import React, { useState } from 'react';
import { X, Users, Settings2, Download } from 'lucide-react';
import { User } from '../../types';

interface Group {
    name: string;
    members: User[];
}

interface RandomGroupModalProps {
    students: User[];
    onClose: () => void;
}

export const RandomGroupModal: React.FC<RandomGroupModalProps> = ({ students, onClose }) => {
    const [mode, setMode] = useState<'BY_GROUPS' | 'BY_STUDENTS'>('BY_GROUPS');
    const [numberInput, setNumberInput] = useState<number>(4);
    const [groups, setGroups] = useState<Group[]>([]);

    const handleGenerate = () => {
        if (students.length === 0) return;
        if (numberInput <= 0) {
            alert('Vui lòng nhập số lớn hơn 0');
            return;
        }

        // Shuffle students
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const newGroups: Group[] = [];

        if (mode === 'BY_GROUPS') {
            const groupCount = Math.min(numberInput, students.length);
            for (let i = 0; i < groupCount; i++) {
                newGroups.push({ name: `Nhóm ${i + 1}`, members: [] });
            }
            shuffled.forEach((student, index) => {
                newGroups[index % groupCount].members.push(student);
            });
        } else {
            const membersPerGroup = numberInput;
            const groupCount = Math.ceil(students.length / membersPerGroup);
            for (let i = 0; i < groupCount; i++) {
                const chunk = shuffled.slice(i * membersPerGroup, (i + 1) * membersPerGroup);
                newGroups.push({ name: `Nhóm ${i + 1}`, members: chunk });
            }
        }

        setGroups(newGroups);
    };

    const handleExport = () => {
        let text = "KẾT QUẢ CHIA NHÓM\n\n";
        groups.forEach(g => {
            text += `--- ${g.name} ---\n`;
            g.members.forEach((m, idx) => {
                text += `${idx + 1}. ${m.name}\n`;
            });
            text += '\n';
        });

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Danh_Sach_Nhom_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-indigo-600 p-4 flex justify-between items-centertext-white">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Users className="h-6 w-6" /> Chia Nhóm Ngẫu Nhiên
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                    {/* Settings Panel */}
                    <div className="md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6 border-gray-200">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800">
                            <Settings2 className="h-5 w-5 text-indigo-500" /> Tùy chọn chia
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        checked={mode === 'BY_GROUPS'}
                                        onChange={() => { setMode('BY_GROUPS'); setNumberInput(4); }}
                                    />
                                    <span className="font-medium text-gray-700">Chia theo số nhóm</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        checked={mode === 'BY_STUDENTS'}
                                        onChange={() => { setMode('BY_STUDENTS'); setNumberInput(5); }}
                                    />
                                    <span className="font-medium text-gray-700">Chia theo số lượng HS</span>
                                </label>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
                                <label className="text-sm font-bold text-gray-700 block text-center">
                                    {mode === 'BY_GROUPS' ? 'Số lượng nhóm cần chia:' : 'Số lượng HS mỗi nhóm:'}
                                </label>
                                <div className="flex justify-center items-center gap-4">
                                    <button onClick={() => setNumberInput(Math.max(1, numberInput - 1))} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100">-</button>
                                    <span className="text-2xl font-bold text-indigo-700 w-12 text-center">{numberInput}</span>
                                    <button onClick={() => setNumberInput(numberInput + 1)} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100">+</button>
                                </div>
                            </div>

                            <div className="text-sm text-center text-gray-500 italic">
                                Danh sách hiện có: <b>{students.length}</b> học sinh
                            </div>

                            <button
                                onClick={handleGenerate}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md active:scale-95"
                            >
                                Thực hiện chia nhóm
                            </button>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="md:w-2/3 flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Kết quả ({groups.length} nhóm)</h3>
                            {groups.length > 0 && (
                                <button onClick={handleExport} className="text-sm flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 font-medium transition">
                                    <Download className="h-4 w-4" /> Xuất file txt
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-4">
                            {groups.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[200px] border-2 border-dashed rounded-xl">
                                    <Users className="h-10 w-10 opacity-50" />
                                    <p>Chưa có kết quả. Vui lòng nhấn "Thực hiện chia nhóm".</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {groups.map((group, idx) => (
                                        <div key={idx} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                                <span className="font-bold text-indigo-700">{group.name}</span>
                                                <span className="text-xs bg-white border px-2 py-0.5 rounded-full font-bold text-gray-500">{group.members.length} HS</span>
                                            </div>
                                            <div className="p-3 max-h-[200px] overflow-y-auto text-sm space-y-2">
                                                {group.members.map((m, i) => (
                                                    <div key={m.id} className="flex gap-2 items-center text-gray-700">
                                                        <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
                                                        <span className="font-medium">{m.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
