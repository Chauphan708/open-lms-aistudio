import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ExamCreate } from './pages/ExamCreate';
import { ExamList } from './pages/ExamList';
import { ExamTake } from './pages/ExamTake';
import { AcademicYearManage } from './pages/admin/AcademicYearManage';
import { UserManage } from './pages/manage/UserManage';
import { ClassManage } from './pages/teacher/ClassManage';
import { LiveRoom } from './pages/teacher/LiveRoom';
import { LiveJoin } from './pages/student/LiveJoin';
import { LiveLobby } from './pages/student/LiveLobby';
// Discussion imports
import { DiscussionRoom } from './pages/teacher/DiscussionRoom';
import { StudentDiscussionRoom } from './pages/student/DiscussionRoom';
import { DiscussionJoin } from './pages/student/DiscussionJoin';
import { DiscussionList } from './pages/teacher/DiscussionList';
import { DiscussionCreate } from './pages/teacher/DiscussionCreate';
import { ExamResults } from './pages/teacher/ExamResults';
// Student History
import { StudentHistory } from './pages/student/StudentHistory';
// Settings
import { Settings } from './pages/Settings';
// Resources
import { ResourceLibrary } from './pages/ResourceLibrary';

import { useStore } from './store';
import { UserRole } from './types';
import { Loader2, LogIn, Key, Mail, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { setUser, users } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRealLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Match password OR fallback if user has no password set and inputs '123456'
    const user = users.find(u => u.email === email && (u.password === password || (!u.password && password === '123456')));
    if (user) {
      setUser(user);
    } else {
      setError('Email hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
            LM
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OpenLMS</h1>
        <p className="text-gray-500 mb-6">Hệ thống quản lý học tập & thi cử</p>

        {/* Real Login Form */}
        <form onSubmit={handleRealLogin} className="space-y-4 mb-8 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="admin@school.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-gray-400">Admin mặc định: 123456</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2">
            <LogIn className="h-4 w-4" /> Đăng nhập
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          *Hệ thống mã nguồn mở
        </p>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

function App() {
  const { user, fetchInitialData, isDataLoading } = useStore();

  // Load data once when app starts
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Đang tải dữ liệu từ Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path="/admin/years" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AcademicYearManage />
          </ProtectedRoute>
        } />
        <Route path="/admin/teachers" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UserManage targetRole="TEACHER" title="Quản lý Giáo Viên" />
          </ProtectedRoute>
        } />

        {/* ADMIN & TEACHER SHARED */}
        <Route path="/manage/students" element={
          <ProtectedRoute roles={['ADMIN', 'TEACHER']}>
            <UserManage targetRole="STUDENT" title="Quản lý Học Sinh" />
          </ProtectedRoute>
        } />

        {/* TEACHER ROUTES */}
        <Route path="/create-exam" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ExamCreate />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassManage />
          </ProtectedRoute>
        } />

        {/* LIVE EXAM ROUTES */}
        <Route path="/live/host/:pin" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <LiveRoom />
          </ProtectedRoute>
        } />
        <Route path="/live/join" element={<LiveJoin />} />
        <Route path="/live/lobby/:pin" element={
          <ProtectedRoute roles={['STUDENT']}>
            <LiveLobby />
          </ProtectedRoute>
        } />

        {/* DISCUSSION ROOM ROUTES */}
        <Route path="/discussion/join" element={<DiscussionJoin />} />

        <Route path="/teacher/discussions" element={
          <ProtectedRoute roles={['TEACHER']}>
            <DiscussionList />
          </ProtectedRoute>
        } />

        <Route path="/teacher/discussions/create" element={
          <ProtectedRoute roles={['TEACHER']}>
            <DiscussionCreate />
          </ProtectedRoute>
        } />

        <Route path="/discussion/room/:pin" element={
          user?.role === 'TEACHER' ? (
            <ProtectedRoute roles={['TEACHER']}>
              <DiscussionRoom />
            </ProtectedRoute>
          ) : (
            <StudentDiscussionRoom />
          )
        } />


        {/* PUBLIC/SHARED */}
        <Route path="/exams" element={
          <ProtectedRoute>
            <ExamList />
          </ProtectedRoute>
        } />

        <Route path="/resources" element={
          <ProtectedRoute>
            <ResourceLibrary />
          </ProtectedRoute>
        } />

        <Route path="/exam/:id/take" element={
          <ProtectedRoute>
            <ExamTake />
          </ProtectedRoute>
        } />

        <Route path="/exam/:id/results" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <ExamResults />
          </ProtectedRoute>
        } />

        {/* STUDENT ROUTES */}
        <Route path="/student/history" element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentHistory />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
