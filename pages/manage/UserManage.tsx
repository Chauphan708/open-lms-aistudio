import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { User, UserRole } from '../../types';
import { Users, Plus, Search, Upload, FileText, CheckCircle, AlertCircle, X, Save, Trash2, Key, Edit, GraduationCap, LayoutGrid, List } from 'lucide-react';

interface Props {
    targetRole: UserRole; // 'TEACHER' or 'STUDENT'
    title: string;
}

type ImportMode = 'SINGLE' | 'BULK';

export const UserManage: React.FC<Props> = ({ targetRole, title }) => {
    const { users, classes, addUser, updateUser, deleteUser, changePassword } = useStore();
    const [mode, setMode] = useState<ImportMode>('SINGLE');
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Password Reset State
    const [resetUser, setResetUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // Edit User State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editClassName, setEditClassName] = useState('');

    // Single Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [className, setClassName] = useState('');

    // Bulk Form State
    const [bulkText, setBulkText] = useState('');
    const [previewUsers, setPreviewUsers] = useState<User[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredUsers = users.filter(u =>
        u.role === targetRole &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm) || (u.className && u.className.includes(searchTerm)))
    );

    // --- SINGLE ADD HANDLERS ---
    const handleCreateSingle = () => {
        if (!name || !email) return;

        // Check Duplicate Email
        if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
            alert("Tên đăng nhập / Email này đã tồn tại trong hệ thống! Vui lòng sử dụng tên khác.");
            return;
        }

        const newUser: User = {
            id: `${targetRole.toLowerCase().substr(0, 1)}_${Date.now()}`,
            name,
            email: email.trim(),
            role: targetRole,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            password: '123456', // Default password
            className: targetRole === 'STUDENT' ? className : undefined
        };

        // Find if a class ID was provided (since className now holds "classId|className")
        let assignedClassId = '';
        if (targetRole === 'STUDENT' && className) {
            const parts = className.split('|');
            if (parts.length === 2) {
                newUser.className = parts[1]; // Store just the name for display if needed
                assignedClassId = parts[0];
            }
        }

        addUser(newUser, assignedClassId);
        setIsCreating(false);
        resetForms();
    };

    // --- EDIT HANDLERS ---
    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditClassName(user.className || '');
    };

    const handleUpdateUser = () => {
        if (!editingUser || !editName || !editEmail) return;

        // Check Duplicate Email if changed
        if (editEmail.trim().toLowerCase() !== editingUser.email.toLowerCase()) {
            if (users.some(u => u.email.toLowerCase() === editEmail.trim().toLowerCase())) {
                alert("Tên đăng nhập / Email mới này đã được sử dụng bởi người dùng khác!");
                return;
            }
        }

        const updated: User = {
            ...editingUser,
            name: editName,
            email: editEmail.trim(),
            className: targetRole === 'STUDENT' ? editClassName : undefined
        };
        updateUser(updated);
        setEditingUser(null);
        alert("Cập nhật thông tin thành công!");
    };

    const handleDeleteUser = async (user: User) => {
        if (confirm(`Bạn có chắc chắn muốn xóa ${user.name}? Hành động này không thể hoàn tác.`)) {
            const success = await deleteUser(user.id);
            if (!success) {
                alert("Lỗi khi xóa người dùng.");
            }
        }
    };

    // --- BULK ADD HANDLERS ---
    const handleBulkParse = () => {
        if (!bulkText.trim()) return;

        const lines = bulkText.split('\n').filter(line => line.trim() !== '');
        const parsed: User[] = [];
        const duplicates: string[] = [];

        lines.forEach((line, index) => {
            // Logic: Split by Tab (Excel) or Comma (CSV)
            // Expected: Name [Tab/Comma] Email [Tab/Comma] Class (Optional)

            let parts = line.split(/[\t,]+/);
            parts = parts.map(p => p.trim()).filter(p => p !== '');

            let uName = '';
            let uEmail = '';
            let uClass = '';

            // Try to find an email part containing '@'
            const emailIdx = parts.findIndex(p => p.includes('@'));

            if (emailIdx !== -1) {
                uEmail = parts[emailIdx];
                const otherParts = parts.filter((_, i) => i !== emailIdx);
                if (otherParts.length > 0) uName = otherParts[0];
                if (otherParts.length > 1) uClass = otherParts[1];
            } else {
                uName = parts[0];
                if (parts.length > 1) uClass = parts[1];

                const nameParts = uName.trim().split(' ');
                const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : 'user';
                const slug = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                const classSlug = uClass ? uClass.toLowerCase().replace(/[^a-z0-9]/g, '') : Math.floor(Math.random() * 1000).toString();
                uEmail = `${slug}${classSlug}`;
            }

            // Clean up quotes
            uName = uName.replace(/^["']|["']$/g, '');

            // Check duplicates in system OR in current preview list
            if (users.some(u => u.email.toLowerCase() === uEmail.toLowerCase()) || parsed.some(p => p.email.toLowerCase() === uEmail.toLowerCase())) {
                if (!duplicates.includes(uEmail)) {
                    duplicates.push(uEmail);
                }
            }

            parsed.push({
                id: `${targetRole.toLowerCase().substr(0, 1)}_${Date.now()}_${index}`,
                name: uName || 'Unknown',
                email: uEmail,
                role: targetRole,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(uName)}&background=random`,
                password: '123456',
                className: targetRole === 'STUDENT' ? uClass : undefined
            });
        });

        if (duplicates.length > 0) {
            alert(`Phát hiện mã trùng lặp: ${duplicates.join(', ')}.\nVui lòng sửa tên đăng nhập ở dữ liệu gốc (Cột Email) rồi bấm Phân tích lại.`);
            setPreviewUsers([]);
        } else {
            setPreviewUsers(parsed);
        }
    };

    const handleBulkSubmit = () => {
        previewUsers.forEach(u => addUser(u));
        setIsCreating(false);
        resetForms();
        alert(`Đã thêm thành công ${previewUsers.length} tài khoản!`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                setBulkText(text);
            }
        };
        reader.readAsText(file);
    };

    const handleResetPassword = async () => {
        if (!resetUser || !newPassword) return;
        const success = await changePassword(resetUser.id, newPassword);
        if (success) {
            alert(`Đã đổi mật khẩu cho ${resetUser.name} thành công.`);
            setResetUser(null);
            setNewPassword('');
        } else {
            alert("Lỗi khi đổi mật khẩu.");
        }
    };

    const resetForms = () => {
        setName('');
        setEmail('');
        setClassName('');
        setBulkText('');
        setPreviewUsers([]);
        setMode('SINGLE');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users /> {title}
                </h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
                >
                    <Plus className="h-4 w-4" /> <span className="hidden md:inline">Thêm Mới</span>
                </button>
            </div>

            {isCreating && (
                <div className="bg-white rounded-xl border shadow-lg animate-fade-in overflow-hidden">
                    <div className="bg-gray-50 border-b px-4 md:px-6 py-3 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Thêm {targetRole === 'TEACHER' ? 'Giáo viên' : 'Học sinh'} mới</h3>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-4 md:p-6">
                        {/* Mode Switcher */}
                        <div className="flex gap-4 border-b mb-6 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setMode('SINGLE')}
                                className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${mode === 'SINGLE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Nhập thủ công
                            </button>
                            <button
                                onClick={() => setMode('BULK')}
                                className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${mode === 'BULK' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Nhập danh sách (Excel/File)
                            </button>
                        </div>

                        {/* SINGLE MODE */}
                        {mode === 'SINGLE' && (
                            <div className="space-y-4 animate-in slide-in-from-left-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{targetRole === 'STUDENT' ? 'Tên đăng nhập (VD: an5a1)' : 'Email'} <span className="text-red-500">*</span></label>
                                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={email} onChange={e => setEmail(e.target.value.replace(/\s/g, ''))} placeholder={targetRole === 'STUDENT' ? "an5a1" : "a@example.com"} />
                                    </div>
                                    {targetRole === 'STUDENT' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cần xếp vào lớp <span className="text-red-500">*</span></label>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                value={className}
                                                onChange={e => setClassName(e.target.value)}
                                            >
                                                <option value="">-- Chọn lớp học --</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={`${c.id}|${c.name}`}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                                    <button onClick={handleCreateSingle} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Lưu lại</button>
                                </div>
                            </div>
                        )}

                        {/* BULK MODE */}
                        {mode === 'BULK' && (
                            <div className="space-y-4 animate-in slide-in-from-right-2">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold mb-1">Hướng dẫn nhập nhanh:</p>
                                        <ul className="list-disc list-inside space-y-1 opacity-90">
                                            <li>Dán danh sách từ Excel vào ô bên dưới.</li>
                                            <li>Cấu trúc: <code>Họ Tên | Email (hoặc bỏ trống) | Lớp (Tùy chọn)</code></li>
                                            <li>Nếu bỏ trống Email, hệ thống tự tạo ID dựa trên Tên và Lớp (Ví dụ: an5a1).</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left: Input */}
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-bold text-gray-700">Dữ liệu thô</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
                                                >
                                                    <Upload className="h-3 w-3" /> Upload File (.txt/.csv)
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept=".txt,.csv"
                                                    onChange={handleFileUpload}
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none min-h-[200px]"
                                            placeholder={`Nguyễn Văn A\ta@school.com\t5A\nTrần Thị B\tb@school.com\t5B`}
                                            value={bulkText}
                                            onChange={e => setBulkText(e.target.value)}
                                        />
                                        <button
                                            onClick={handleBulkParse}
                                            disabled={!bulkText.trim()}
                                            className="mt-3 w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-900 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <FileText className="h-4 w-4" /> Phân tích dữ liệu
                                        </button>
                                    </div>

                                    {/* Right: Preview */}
                                    <div className="flex flex-col h-full border rounded-lg bg-gray-50 overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-700">Xem trước ({previewUsers.length})</span>
                                            {previewUsers.length > 0 && (
                                                <button onClick={() => setPreviewUsers([])} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[240px]">
                                            {previewUsers.length === 0 ? (
                                                <div className="text-center text-gray-400 mt-10 text-sm">
                                                    Chưa có dữ liệu. Hãy dán văn bản và bấm "Phân tích".
                                                </div>
                                            ) : (
                                                previewUsers.map((u, i) => (
                                                    <div key={i} className="bg-white p-2 rounded border flex items-center justify-between text-sm">
                                                        <div>
                                                            <p className="font-bold text-gray-900">{u.name}</p>
                                                            <p className="text-xs text-indigo-600 font-mono font-bold">ID: {u.email}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {u.className && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold font-mono">{u.className}</span>}
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-3 border-t bg-white">
                                            <button
                                                onClick={handleBulkSubmit}
                                                disabled={previewUsers.length === 0}
                                                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                <Save className="h-4 w-4" /> Lưu tất cả
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Chỉnh sửa thông tin</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{editingUser.role === 'STUDENT' ? 'Tên đăng nhập' : 'Email'}</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value.replace(/\s/g, ''))}
                                />
                            </div>
                            {editingUser.role === 'STUDENT' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cần xếp vào lớp</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                        value={editClassName}
                                        onChange={e => setEditClassName(e.target.value)}
                                    >
                                        <option value="">-- Chọn lớp học --</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={`${c.id}|${c.name}`}>{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-blue-600 mt-1">Lưu ý: Bạn chỉ đang đổi nhãn hiển thị, học sinh chưa được di chuyển thực tế. (Tính năng chuyển lớp sẽ bổ sung sau)</p>
                                </div>
                            )}
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">ID: <span className="font-mono text-gray-700">{editingUser.id}</span></p>
                                <p className="text-xs text-gray-500">Vai trò: <span className="font-bold">{editingUser.role}</span></p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
                            <button onClick={handleUpdateUser} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Đổi mật khẩu</h3>
                        <p className="text-sm text-gray-500 mb-4">Cập nhật mật khẩu mới cho tài khoản: <b>{resetUser.name}</b></p>

                        <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu mới</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mb-4 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nhập mật khẩu..."
                        />

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setResetUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
                            <button onClick={handleResetPassword} disabled={!newPassword} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SEARCH BAR */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Tìm kiếm theo tên, email hoặc lớp..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed">
                    Không tìm thấy kết quả nào.
                </div>
            )}

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden animate-fade-in">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Họ tên</th>
                            <th className="px-6 py-3">Tên đăng nhập / Email</th>
                            {targetRole === 'STUDENT' && <th className="px-6 py-3">Lớp</th>}
                            <th className="px-6 py-3">Vai trò</th>
                            <th className="px-6 py-3 text-center">Tác vụ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                                    <span className="font-medium text-gray-900">{u.name}</span>
                                </td>
                                <td className="px-6 py-4 font-mono text-indigo-700">{u.email}</td>
                                {targetRole === 'STUDENT' && (
                                    <td className="px-6 py-4">
                                        {u.className ? (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold font-mono">{u.className}</span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                     ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                            u.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                   `}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => openEditModal(u)}
                                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                            title="Chỉnh sửa thông tin"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => { setResetUser(u); setNewPassword(''); }}
                                            className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                                            title="Đổi mật khẩu"
                                        >
                                            <Key className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u)}
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                            title="Xóa người dùng"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="md:hidden space-y-3 animate-fade-in">
                {filteredUsers.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="flex items-start gap-3 mb-3">
                            <img src={u.avatar} className="w-10 h-10 rounded-full border" alt="" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 truncate">{u.name}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold
                           ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                            u.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                         `}>
                                        {u.role}
                                    </span>
                                </div>
                                <div className="text-sm font-mono text-indigo-600 mt-1">ID: {u.email}</div>
                                {targetRole === 'STUDENT' && (
                                    <div className="mt-1">
                                        {u.className ? (
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold font-mono">Lớp: {u.className}</span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Chưa xếp lớp</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex border-t pt-3 gap-2">
                            <button
                                onClick={() => openEditModal(u)}
                                className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1"
                            >
                                <Edit className="h-3 w-3" /> Sửa
                            </button>
                            <button
                                onClick={() => { setResetUser(u); setNewPassword(''); }}
                                className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1"
                            >
                                <Key className="h-3 w-3" /> Mật khẩu
                            </button>
                            <button
                                onClick={() => handleDeleteUser(u)}
                                className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"
                            >
                                <Trash2 className="h-3 w-3" /> Xóa
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
