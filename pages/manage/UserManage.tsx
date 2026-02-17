import React, { useState } from 'react';
import { useStore } from '../../store';
import { User, UserRole } from '../../types';
import { Users, Plus, Search } from 'lucide-react';

interface Props {
  targetRole: UserRole; // 'TEACHER' or 'STUDENT'
  title: string;
}

export const UserManage: React.FC<Props> = ({ targetRole, title }) => {
  const { users, addUser, user: currentUser } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const filteredUsers = users.filter(u => 
    u.role === targetRole && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm))
  );

  const handleCreate = () => {
    if (!name || !email) return;
    const newUser: User = {
      id: `${targetRole.toLowerCase().substr(0,1)}_${Date.now()}`,
      name,
      email,
      role: targetRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    addUser(newUser);
    setIsCreating(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users /> {title}
        </h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Thêm Mới
        </button>
      </div>

      {isCreating && (
         <div className="bg-white p-6 rounded-xl border shadow-sm animate-fade-in">
           <h3 className="font-bold text-gray-800 mb-4">Tạo tài khoản {targetRole === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full border rounded-lg px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
           </div>
           <div className="mt-4 flex gap-2 justify-end">
             <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
             <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Tạo</button>
           </div>
         </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" />
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
                <td className="px-6 py-4 text-xs font-mono">{u.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};