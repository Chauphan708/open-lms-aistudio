
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
  Brain,
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wrench,
  Clock,
  BarChart3,
  ClipboardList,
  Zap,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useStore } from '../store';
import { UserRole, CustomToolMenu } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State to track expanded custom tools
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // State for built-in nested menus
  const [isStudyToolsExpanded, setIsStudyToolsExpanded] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<string, boolean>>({
    'Khảo thí & Bài tập': true // Expand default group
  });

  const isActive = (path: string) => location.pathname === path;

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const toggleGroup = (title: string) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setExpandedNavGroups(prev => ({ ...prev, [title]: true }));
    } else {
      setExpandedNavGroups(prev => ({ ...prev, [title]: !prev[title] }));
    }
  };

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

  interface NavGroup {
    title?: string;
    roles?: UserRole[];
    icon?: any;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      ]
    },
    {
      title: 'Quản lý Hệ thống',
      icon: Settings,
      roles: ['ADMIN'],
      items: [
        { label: 'Quản lý Năm học', path: '/admin/years', icon: CalendarRange, roles: ['ADMIN'] },
        { label: 'Quản lý Giáo viên', path: '/admin/teachers', icon: Users, roles: ['ADMIN'] },
      ]
    },
    {
      title: 'Khảo thí & Bài tập',
      icon: BookOpen,
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      items: [
        { label: 'Ngân hàng Bài tập', path: '/exams', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Tạo Bài tập', path: '/create-exam', icon: FilePlus, roles: ['TEACHER'] },
        { label: 'Tạo Đề kiểm tra', path: '/exam-matrix', icon: BookOpen, roles: ['TEACHER'] },
        { label: 'Quản lý Bài đã giao', path: '/teacher/assignments', icon: ClipboardList, roles: ['TEACHER'] },
        { label: 'Chấm bài AI', path: '/teacher/ai-grading', icon: Bot, roles: ['TEACHER'] },
        { label: 'Lịch sử Làm bài', path: '/student/history', icon: History, roles: ['STUDENT'] },
      ]
    },
    {
      title: 'Lớp học & Thi đua',
      icon: GraduationCap,
      roles: ['ADMIN', 'TEACHER'],
      items: [
        { label: 'Lớp học của tôi', path: '/teacher/classes', icon: School, roles: ['TEACHER'] },
        { label: 'Quản lý Học sinh', path: '/manage/students', icon: GraduationCap, roles: ['ADMIN', 'TEACHER'] },
        { label: 'Thi đua Lớp', path: '/teacher/class-fun', icon: Trophy, roles: ['TEACHER'] },
        { label: 'Điểm danh', path: '/teacher/class-fun/attendance', icon: Users, roles: ['TEACHER'] },
        { label: 'Ghi nhận', path: '/teacher/class-fun/record', icon: CheckCircle, roles: ['TEACHER'] },
        { label: 'Cảnh báo Hành vi', path: '/teacher/class-fun/warning', icon: MessageSquare, roles: ['TEACHER'] },
        { label: 'Thống kê Kinh nghiệm', path: '/teacher/xp-stats', icon: Zap, roles: ['TEACHER'] },
      ]
    },
    {
      title: 'Tương tác & Mở rộng',
      icon: Globe,
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      items: [
        { label: 'Kho Tài liệu & Web', path: '/resources', icon: Globe, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Phòng Thảo luận (GV)', path: '/teacher/discussions', icon: MessageSquare, roles: ['TEACHER'] },
        { label: 'Phòng Thảo luận', path: '/discussion/join', icon: MessageSquare, roles: ['STUDENT'] },
        { label: 'QL Đấu trí', path: '/arena/admin', icon: Brain, roles: ['ADMIN', 'TEACHER'] },
        { label: 'Đấu trí', path: '/arena', icon: Brain, roles: ['STUDENT'] },
      ]
    },
    {
      title: 'Báo cáo & Cài đặt',
      icon: BarChart3,
      roles: ['ADMIN', 'TEACHER'],
      items: [
        { label: 'Thống kê & Backup', path: '/ai-stats', icon: BarChart3, roles: ['TEACHER'] },
        { label: 'Cài đặt', path: '/settings', icon: Settings, roles: ['ADMIN', 'TEACHER'] },
      ]
    }
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
        fixed inset-y-0 left-0 z-30 bg-white border-r shadow-lg transform transition-all duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="h-full flex flex-col">
          <div className={`p-4 border-b flex items-center h-[73px] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              {!isSidebarCollapsed && <span className="text-xl font-extrabold text-gray-800 tracking-tight whitespace-nowrap">OpenLMS</span>}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title="Thu gọn menu"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </div>

          {isSidebarCollapsed && (
            <div className="hidden md:flex justify-center p-2 border-b border-gray-50">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title="Mở rộng menu"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            </div>
          )}

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, groupIdx) => {
              if (group.roles && user && !group.roles.includes(user.role)) return null;

              const visibleItems = group.items.filter(item => !item.roles || (user && item.roles.includes(user.role)));
              if (visibleItems.length === 0) return null;

              return (
                <div key={groupIdx} className={`${groupIdx > 0 ? 'pt-2 border-t border-gray-50' : ''}`}>
                  {group.title ? (
                    <div>
                      <button
                        onClick={() => toggleGroup(group.title!)}
                        title={isSidebarCollapsed ? group.title : undefined}
                        className={`w-full flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                          ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'}
                          text-gray-600 hover:bg-gray-50`}
                      >
                        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                          {group.icon && React.createElement(group.icon, {
                            className: "h-5 w-5 flex-shrink-0 text-gray-400 group-hover:scale-110 transition-transform"
                          })}
                          {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{group.title}</span>}
                        </div>
                        {!isSidebarCollapsed && (expandedNavGroups[group.title] ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />)}
                      </button>

                      {expandedNavGroups[group.title] && !isSidebarCollapsed && (
                        <div className="pl-4 pr-2 py-1 space-y-1 animate-fade-in border-l-2 border-gray-200 ml-5 mt-1">
                          {visibleItems.map(item => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group relative overflow-hidden
                                  ${active
                                    ? 'text-indigo-600 font-bold bg-indigo-50 translate-x-1'
                                    : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:pl-4'}
                                `}
                              >
                                <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`} />
                                <span className="relative z-10 truncate">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {visibleItems.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            title={isSidebarCollapsed ? item.label : undefined}
                            className={`
                              flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                              ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}
                              ${active
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' + (!isSidebarCollapsed ? ' translate-x-1' : '')
                                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700' + (!isSidebarCollapsed ? ' hover:pl-5' : '')}
                            `}
                          >
                            <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${!active && 'group-hover:scale-110'}`} />
                            {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
                            {active && !isSidebarCollapsed && <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* CÔNG CỤ HỌC TẬP */}
            {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && (
              <div className="pt-2 border-t border-gray-50">
                <button
                  onClick={() => !isSidebarCollapsed && setIsStudyToolsExpanded(!isStudyToolsExpanded)}
                  title={isSidebarCollapsed ? "Công cụ học tập" : undefined}
                  className={`w-full flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                    ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'}
                    ${location.pathname.startsWith('/tools/') ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <Wrench className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/tools/') ? 'text-indigo-600' : 'text-gray-400 group-hover:scale-110 transition-transform'}`} />
                    {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">Công cụ học tập</span>}
                  </div>
                  {!isSidebarCollapsed && (isStudyToolsExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />)}
                </button>

                {isStudyToolsExpanded && !isSidebarCollapsed && (
                  <div className="pl-4 pr-2 py-1 space-y-1 animate-fade-in border-l-2 border-gray-200 ml-5 mt-1">
                    <Link
                      to="/tools/timer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/tools/timer') ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                    >
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Đồng hồ đếm ngược</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOM TOOLS RENDERER (TEACHER AND ADMIN) */}
            {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && user.customTools && user.customTools.length > 0 && (
              <div className="pt-2 border-t border-gray-50">
                {!isSidebarCollapsed && (
                  <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 truncate">Các Công Cụ Hỗ Trợ</p>
                )}
                {user.customTools.map(tool => (
                  <div key={tool.id} className="mb-1">
                    {tool.children && tool.children.length > 0 ? (
                      <div>
                        <button
                          onClick={() => !isSidebarCollapsed && toggleTool(tool.id)}
                          title={isSidebarCollapsed ? tool.title : undefined}
                          className={`w-full flex items-center py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
                            ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'}`}
                        >
                          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="truncate">{tool.title}</span>}
                          </div>
                          {!isSidebarCollapsed && (expandedTools[tool.id] ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />)}
                        </button>
                        {/* Recursive Children Render */}
                        {expandedTools[tool.id] && !isSidebarCollapsed && (
                          <div className="pl-4 pr-2 py-1 space-y-1 animate-fade-in border-l-2 border-gray-200 ml-5">
                            {tool.children.map(child => (
                              <a
                                key={child.id}
                                href={child.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors truncate"
                              >
                                {child.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Standalone Parent Link
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isSidebarCollapsed ? tool.title : undefined}
                        className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
                          ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
                      >
                        <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">{tool.title}</span>}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </nav>

          <div className="mt-auto p-3 border-t bg-gray-50/50">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center gap-3 mb-3 px-2 py-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm">
                  <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 font-medium"
                >
                  <LogOut className="h-4 w-4 hover:scale-110 transition-transform" />
                  Đăng Xuất
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" title={user?.name} className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex-shrink-0 cursor-pointer" />
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="flex items-center justify-center w-10 h-10 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      < main className="flex-1 p-4 md:p-8 overflow-x-hidden relative flex flex-col" >
        {/* Top Bar for Desktop */}
        < div className="hidden md:flex justify-end items-center mb-6 gap-4" >
          {/* Notifications */}
          < div className="relative" >
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

            {
              isNotifOpen && (
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
              )
            }
          </div >
        </div >

        {/* Toasts Popup (Bottom Right) */}
        < div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" >
          {
            myNotifications.filter(n => !n.isRead && new Date(n.createdAt).getTime() > Date.now() - 5000).map(n => (
              <div key={n.id} className="bg-white p-4 rounded-xl shadow-2xl border-l-4 border-indigo-500 w-80 animate-in slide-in-from-right pointer-events-auto flex gap-3">
                <CheckCircle className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                  <button onClick={() => handleNotifClick(n)} className="text-xs text-indigo-600 font-bold mt-2 hover:underline">Xem ngay</button>
                </div>
              </div>
            ))
          }
        </div >

        {children}
      </main >

      {/* Mobile Overlay */}
      {
        isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )
      }
    </div >
  );
};
