import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../store';
import { Loader2 } from 'lucide-react';

export const EduGamesRedirect = () => {
  const { user } = useStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSSO = async () => {
      try {
        // Lấy phiên đăng nhập hiện tại của người dùng
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!data.session) {
          setError('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
          return;
        }

        const { access_token, refresh_token } = data.session;
        
        // Xác định trang đích bên hệ thống Game tùy theo quyền của User
        // DEV: Đổi localhost:5174 thành URL public của Game khi deploy Vercel
        const GAME_BASE_URL = window.location.hostname === 'localhost' 
              ? 'http://localhost:5174' 
              : 'https://edu-games-gamma.vercel.app'; 

        const targetPath = user?.role === 'STUDENT' ? '/arena' : '/teacher';
        
        // Tạo Bridge URL với Token
        const bridgeUrl = `${GAME_BASE_URL}${targetPath}?access_token=${access_token}&refresh_token=${refresh_token}`;
        
        // Chuyển hướng trình duyệt
        window.location.href = bridgeUrl;
        
      } catch (err: any) {
        console.error('Lỗi SSO:', err);
        setError('Lỗi kết nối đến Hệ thống Trò chơi: ' + err.message);
      }
    };

    performSSO();
  }, [user]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-50">
         <h2 className="text-2xl font-bold text-red-600 mb-2">Lỗi Chuyển Hướng!</h2>
         <p className="text-gray-700">{error}</p>
         <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded shadow" onClick={() => window.history.back()}>
            Quay lại
         </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '60vh' }}>
      <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Đang thiết lập kết nối mã hóa...</h2>
      <p className="text-gray-500">Đang chuyển hướng bạn sang Hệ thống Trò Chơi An Toàn (SSO).</p>
      <p className="text-sm mt-4 text-indigo-400">Vui lòng đợi vài giây!</p>
    </div>
  );
};
