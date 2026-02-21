
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  LogOut,
  GraduationCap,
  Menu,
  X,
  CalendarRange,
  Users,
  School,
  MessageSquare,
  Settings,
  Bell,
  CheckCircle,
  History,
  Globe,
  Trophy,
  Swords,
  Brain
} from 'lucide-react';
import { useStore } from '../store';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => n.userId === user?.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleNotifClick = (notif: any) => {
    markNotificationRead(notif.id);
    setIsNotifOpen(false);
    if (notif.link) navigate(notif.link);
  };

  interface NavItem {
    label: string;
    path: string;
    icon: any;
    roles?: UserRole[];
  }

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },

    // ADMIN ONLY
    { label: 'Quản lý Năm học', path: '/admin/years', icon: CalendarRange, roles: ['ADMIN'] },
    { label: 'QL Giáo Viên', path: '/admin/teachers', icon: Users, roles: ['ADMIN'] },

    // TEACHER ONLY
    { label: 'Lớp học của tôi', path: '/teacher/classes', icon: School, roles: ['TEACHER'] },

    // ADMIN & TEACHER
    { label: 'QL Học Sinh', path: '/manage/students', icon: GraduationCap, roles: ['ADMIN', 'TEACHER'] },

    { label: 'Thi Đua Lớp', path: '/teacher/class-fun', icon: Trophy, roles: ['TEACHER'] },
    { label: '⚡ Ghi Nhận', path: '/teacher/class-fun/record', icon: CheckCircle, roles: ['TEACHER'] },
    { label: '📋 Điểm Danh', path: '/teacher/class-fun/attendance', icon: Users, roles: ['TEACHER'] },
    { label: '⚠️ Cảnh Báo Hành Vi', path: '/teacher/class-fun/warning', icon: MessageSquare, roles: ['TEACHER'] },
    { label: 'Tạo Đề Thi', path: '/create-exam', icon: FilePlus, roles: ['TEACHER'] },

    // STUDENT ONLY
    { label: 'Lịch sử làm bài', path: '/student/history', icon: History, roles: ['STUDENT'] },

    // SHARED
    { label: 'Ngân hàng đề', path: '/exams', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },

    // RESOURCES (NEW)
    { label: 'Kho Tài Liệu & Web', path: '/resources', icon: Globe, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },

    // DISCUSSION
    { label: 'Phòng Thảo Luận', path: '/teacher/discussions', icon: MessageSquare, roles: ['TEACHER'] },
    { label: 'Thảo luận & Vote', path: '/discussion/join', icon: MessageSquare, roles: ['STUDENT'] },

    // ARENA
    { label: '🧠 Đấu Trí', path: '/arena', icon: Brain, roles: ['STUDENT'] },
    { label: '🧠 QL Đấu Trí', path: '/arena/admin', icon: Brain, roles: ['TEACHER', 'ADMIN'] },

    // SETTINGS
    { label: 'Cài đặt', path: '/settings', icon: Settings, roles: ['ADMIN', 'TEACHER'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <GraduationCap className="h-6 w-6" />
          <span>OpenLMS</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-gray-600">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-white"></span>}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800 tracking-tight">OpenLMS</span>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              if (item.roles && user && !item.roles.includes(user.role)) return null;
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                    ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1'
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:pl-6'}
                  `}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`} />
                  <span className="relative z-10">{item.label}</span>
                  {active && <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t bg-gray-50/50">
            <div className="flex items-center gap-3 mb-4 px-2 p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm">
              <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 font-medium"
            >
              <LogOut className="h-4 w-4" />
              Đăng Xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden relative flex flex-col">
        {/* Top Bar for Desktop */}
        <div className="hidden md:flex justify-end items-center mb-6 gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-full bg-white text-gray-600 hover:bg-gray-100 border shadow-sm transition-all"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 animate-in fade-in zoom-in-95 origin-top-right">
                <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-bold text-sm text-gray-800">Thông báo</h3>
                  {unreadCount > 0 && (
                    <button onClick={() => user && markAllNotificationsRead(user.id)} className="text-xs text-indigo-600 hover:underline">
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {myNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Không có thông báo mới
                    </div>
                  ) : (
                    <div className="divide-y">
                      {myNotifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/50' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-indigo-600' : 'bg-transparent'}`}></div>
                            <div>
                              <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toasts Popup (Bottom Right) */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {myNotifications.filter(n => !n.isRead && new Date(n.createdAt).getTime() > Date.now() - 5000).map(n => (
            <div key={n.id} className="bg-white p-4 rounded-xl shadow-2xl border-l-4 border-indigo-500 w-80 animate-in slide-in-from-right pointer-events-auto flex gap-3">
              <CheckCircle className="h-6 w-6 text-indigo-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                <button onClick={() => handleNotifClick(n)} className="text-xs text-indigo-600 font-bold mt-2 hover:underline">Xem ngay</button>
              </div>
            </div>
          ))}
        </div>

        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
