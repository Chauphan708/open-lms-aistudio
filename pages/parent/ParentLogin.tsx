import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useParentStore } from '../../services/parentStore';
import { Key, Lock, Users, Loader2, ArrowRight } from 'lucide-react';

export const ParentLogin = () => {
  const { parentLogin, isParentLoading } = useParentStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [linkCode, setLinkCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode.trim()) {
      setError('Vui lòng nhập mã liên kết.');
      return;
    }

    setError('');
    const result = await parentLogin(linkCode.trim(), password);
    
    if (result.success) {
      const from = (location.state as any)?.from?.pathname || "/parent/dashboard";
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-emerald-600 rounded-b-[4rem] shadow-lg opacity-90" />
      <div className="absolute top-10 left-10 text-white/20">
         <Users className="w-32 h-32" />
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
            <Users className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cổng Phụ Huynh</h1>
          <p className="text-gray-500 mt-2 font-medium">Theo dõi quá trình học tập của học sinh</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mã Liên Kết (6 ký tự)</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                placeholder="VD: ABC123"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-lg font-mono tracking-widest uppercase transition-all"
                maxLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu (Tuỳ chọn)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập nếu có cài đặt"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Bỏ trống nếu không được giáo viên cấp mật khẩu.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isParentLoading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
          >
            {isParentLoading ? (
               <Loader2 className="w-5 h-5 animate-spin" /> 
            ) : (
               <>Đăng Nhập <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Mã liên kết được cấp bởi Giáo viên chủ nhiệm qua phiếu thông tin.
          </p>
        </div>
      </div>
    </div>
  );
};
