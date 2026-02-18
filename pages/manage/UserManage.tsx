
import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { User, UserRole } from '../../types';
import { Users, Plus, Search, Upload, FileText, CheckCircle, AlertCircle, X, Save, Trash2, Key, Edit } from 'lucide-react';

interface Props {
  targetRole: UserRole; // 'TEACHER' or 'STUDENT'
  title: string;
}

type ImportMode = 'SINGLE' | 'BULK';

export const UserManage: React.FC<Props> = ({ targetRole, title }) => {
  const { users, addUser, updateUser, deleteUser, changePassword } = useStore();
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

  // Single Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Bulk Form State
  const [bulkText, setBulkText] = useState('');
  const [previewUsers, setPreviewUsers] = useState<User[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(u => 
    u.role === targetRole && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm))
  );

  // --- SINGLE ADD HANDLERS ---
  const handleCreateSingle = () => {
    if (!name || !email) return;
    const newUser: User = {
      id: `${targetRole.toLowerCase().substr(0,1)}_${Date.now()}`,
      name,
      email,
      role: targetRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      password: '123' // Default password
    };
    addUser(newUser);
    setIsCreating(false);
    resetForms();
  };

  // --- EDIT HANDLERS ---
  const openEditModal = (user: User) => {
      setEditingUser(user);
      setEditName(user.name);
      setEditEmail(user.email);
  };

  const handleUpdateUser = () => {
      if (!editingUser || !editName || !editEmail) return;
      const updated: User = {
          ...editingUser,
          name: editName,
          email: editEmail
      };
      updateUser(updated);
      setEditingUser(null);
      alert("Cập nhật thông tin thành công!");
  };

  const handleDeleteUser = async (user: User) => {
      if (confirm(`Bạn có chắc chắn muốn xóa ${user.name}? Hành động này không thể hoàn tác.`)) {
          const success = await deleteUser(user.id);
          if (success) {
              // Optionally show a toast
          } else {
              alert("Lỗi khi xóa người dùng.");
          }
      }
  };

  // --- BULK ADD HANDLERS ---
  const handleBulkParse = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const parsed: User[] = lines.map((line, index) => {
       // Logic: Split by Tab (Excel) or Comma (CSV)
       // Assume format: Name [Tab/Comma] Email
       // OR just Name (Auto generate email)
       
       let parts = line.split(/[\t,]+/); // Split by tab or comma
       parts = parts.map(p => p.trim()).filter(p => p !== '');

       let uName = '';
       let uEmail = '';

       // Try to find an email part containing '@'
       const emailIdx = parts.findIndex(p => p.includes('@'));
       
       if (emailIdx !== -1) {
           uEmail = parts[emailIdx];
           // Anything else is the name
           uName = parts.filter((_, i) => i !== emailIdx).join(' ');
       } else {
           // No email found, assume whole line is name
           uName = parts.join(' ');
           // Generate fake email
           const slug = uName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
           uEmail = `${slug}${Math.floor(Math.random() * 1000)}@school.edu`;
       }

       // Clean up
       uName = uName.replace(/^["']|["']$/g, ''); // Remove quotes if CSV

       return {
          id: `${targetRole.toLowerCase().substr(0,1)}_${Date.now()}_${index}`,
          name: uName || 'Unknown',
          email: uEmail,
          role: targetRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(uName)}&background=random`,
          password: '123'
       };
    });

    setPreviewUsers(parsed);
  };

  const handleBulkSubmit = () => {
      previewUsers.forEach(u => addUser(u));
      setIsCreating(false);
      resetForms();
      alert(`Đã thêm thành công ${previewUsers.length} tài khoản! Mật khẩu mặc định là 123.`);
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
      setBulkText('');
      setPreviewUsers([]);
      setMode('SINGLE');
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users /> {title}
        </h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Thêm Mới
        </button>
      </div>

      {isCreating && (
         <div className="bg-white rounded-xl border shadow-lg animate-fade-in overflow-hidden">
           <div className="bg-gray-50 border-b px-6 py-3 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Thêm {targetRole === 'TEACHER' ? 'Giáo viên' : 'Học sinh'} mới</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
              </button>
           </div>
           
           <div className="p-6">
               {/* Mode Switcher */}
               <div className="flex gap-4 border-b mb-6">
                   <button 
                     onClick={() => setMode('SINGLE')}
                     className={`pb-2 text-sm font-bold transition-colors border-b-2 ${mode === 'SINGLE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                   >
                       Nhập thủ công
                   </button>
                   <button 
                     onClick={() => setMode('BULK')}
                     className={`pb-2 text-sm font-bold transition-colors border-b-2 ${mode === 'BULK' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                   >
                       Nhập danh sách (Excel/File)
                   </button>
               </div>

               {/* SINGLE MODE */}
               {mode === 'SINGLE' && (
                   <div className="space-y-4 animate-in slide-in-from-left-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={email} onChange={e => setEmail(e.target.value)} placeholder="a@example.com" />
                            </div>
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
                                   <li>Copy danh sách từ Excel (Cột Tên | Cột Email) và dán vào ô bên dưới.</li>
                                   <li>Hoặc nhập theo định dạng: <code>Họ Tên, Email</code> hoặc <code>Họ Tên [Tab] Email</code></li>
                                   <li>Nếu không có Email, hệ thống sẽ tự động tạo email ảo.</li>
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
                                   placeholder={`Nguyễn Văn A\ta@school.com\nTrần Thị B\tb@school.com\nLê Văn C`}
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
                                                   <p className="text-xs text-gray-500">{u.email}</p>
                                               </div>
                                               <CheckCircle className="h-4 w-4 text-green-500" />
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
                         <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                         <input 
                             type="email" 
                             className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                             value={editEmail}
                             onChange={e => setEditEmail(e.target.value)}
                         />
                     </div>
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

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-gray-700 uppercase">
            <tr>
              <th className="px-6 py-3">Họ tên</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Vai trò</th>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3 text-center">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">Không tìm thấy kết quả nào.</td>
                </tr>
            )}
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                  <span className="font-medium text-gray-900">{u.name}</span>
                </td>
                <td className="px-6 py-4">{u.email}</td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-full text-xs font-bold
                     ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 
                       u.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                   `}>
                     {u.role}
                   </span>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-gray-400">{u.id}</td>
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
    </div>
  );
};
