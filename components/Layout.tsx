import React from 'react';
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
  MessageSquare
} from 'lucide-react';
import { useStore } from '../store';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
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
    
    // ADMIN & TEACHER
    { label: 'QL Học Sinh', path: '/manage/students', icon: GraduationCap, roles: ['ADMIN', 'TEACHER'] },
    
    // TEACHER ONLY
    { label: 'Lớp học của tôi', path: '/teacher/classes', icon: School, roles: ['TEACHER'] },
    { label: 'Tạo Đề Thi', path: '/create-exam', icon: FilePlus, roles: ['TEACHER'] },
    
    // SHARED
    { label: 'Ngân hàng đề', path: '/exams', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    
    // DISCUSSION (TEACHER)
    { label: 'Phòng Thảo Luận', path: '/teacher/discussions', icon: MessageSquare, roles: ['TEACHER'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <GraduationCap className="h-6 w-6" />
          <span>OpenLMS</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
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
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden relative">
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
