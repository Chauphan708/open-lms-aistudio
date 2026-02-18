import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  User, 
  Bell, 
  Shield, 
  Save, 
  Camera, 
  School, 
  Wrench, 
  Database,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser } = useStore();
  
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'NOTIFICATIONS' | 'SYSTEM' | 'TEACHING'>('PROFILE');
  const [loading, setLoading] = useState(false);

  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Notifications State (Mock)
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  // Teaching Settings (Teacher only)
  const [defaultDuration, setDefaultDuration] = useState(45);
  const [autoPublish, setAutoPublish] = useState(true);

  // System Settings (Admin only)
  const [schoolName, setSchoolName] = useState('Trường Tiểu Học OpenLMS');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSaveProfile = () => {
    if (!user) return;
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      updateUser({
        ...user,
        name,
        email,
        avatar
      });
      setLoading(false);
      alert('Đã cập nhật hồ sơ thành công!');
    }, 800);
  };

  const handleSaveSystem = () => {
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          alert('Đã lưu cấu hình hệ thống!');
      }, 800);
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Wrench className="text-indigo-600" /> Cài đặt hệ thống
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="md:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'PROFILE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <User className="h-5 w-5" /> Hồ sơ cá nhân
          </button>
          
          <button 
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'NOTIFICATIONS' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Bell className="h-5 w-5" /> Thông báo
          </button>

          {user.role === 'TEACHER' && (
             <button 
                onClick={() => setActiveTab('TEACHING')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'TEACHING' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
             >
                <Clock className="h-5 w-5" /> Cấu hình dạy học
             </button>
          )}

          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('SYSTEM')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'SYSTEM' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Shield className="h-5 w-5" /> Quản trị hệ thống
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border p-6 min-h-[500px]">
          
          {/* PROFILE TAB */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Thông tin tài khoản</h2>
              
              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer">
                  <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white h-8 w-8" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Nhấp vào ảnh để thay đổi</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                  <input 
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email đăng nhập</label>
                  <input 
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Đổi mật khẩu</label>
                  <input 
                    type="password"
                    placeholder="Nhập mật khẩu mới (để trống nếu không đổi)"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Cấu hình thông báo</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">Thông báo qua Email</h3>
                    <p className="text-sm text-gray-500">Nhận email khi có bài tập mới hoặc kết quả thi.</p>
                  </div>
                  <button onClick={() => setEmailNotif(!emailNotif)} className={`text-2xl ${emailNotif ? 'text-green-500' : 'text-gray-300'}`}>
                    {emailNotif ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">Thông báo trên trình duyệt</h3>
                    <p className="text-sm text-gray-500">Hiển thị popup khi đang sử dụng ứng dụng.</p>
                  </div>
                  <button onClick={() => setPushNotif(!pushNotif)} className={`text-2xl ${pushNotif ? 'text-green-500' : 'text-gray-300'}`}>
                    {pushNotif ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEACHING TAB (TEACHER) */}
          {activeTab === 'TEACHING' && (
             <div className="space-y-6 animate-fade-in">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Cấu hình giảng dạy mặc định</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian làm bài mặc định (phút)</label>
                      <input 
                         type="number"
                         value={defaultDuration}
                         onChange={e => setDefaultDuration(Number(e.target.value))}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Sẽ tự động điền khi tạo đề thi mới.</p>
                   </div>
                   
                   <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                         <label className="font-bold text-gray-900">Tự động công bố điểm</label>
                         <p className="text-sm text-gray-500">Học sinh xem được điểm ngay sau khi nộp.</p>
                      </div>
                      <button onClick={() => setAutoPublish(!autoPublish)} className={`text-2xl ${autoPublish ? 'text-green-500' : 'text-gray-300'}`}>
                         {autoPublish ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                      </button>
                   </div>
                </div>
                
                <div className="pt-4 flex justify-end">
                   <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                      <Save className="h-4 w-4" /> Lưu cấu hình
                   </button>
                </div>
             </div>
          )}

          {/* SYSTEM TAB (ADMIN) */}
          {activeTab === 'SYSTEM' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Quản trị hệ thống</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><School className="h-4 w-4" /> Tên trường học / Tổ chức</label>
                  <input 
                    value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div>
                    <h3 className="font-bold text-red-800">Chế độ bảo trì</h3>
                    <p className="text-sm text-red-600">Chỉ Admin mới có thể truy cập hệ thống khi bật.</p>
                  </div>
                  <button onClick={() => setMaintenanceMode(!maintenanceMode)} className={`text-2xl ${maintenanceMode ? 'text-red-600' : 'text-gray-400'}`}>
                    {maintenanceMode ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                   <div>
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Database className="h-4 w-4" /> Sao lưu dữ liệu</h3>
                      <p className="text-sm text-gray-500">Tải xuống bản sao lưu toàn bộ cơ sở dữ liệu.</p>
                   </div>
                   <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
                      Tải xuống (.json)
                   </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveSystem}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Đang xử lý...' : 'Lưu thiết lập'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};