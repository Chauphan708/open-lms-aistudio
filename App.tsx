
import React from 'react';
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
import { DiscussionManager } from './pages/teacher/DiscussionManager';
import { ExamResults } from './pages/teacher/ExamResults';
// Student History
import { StudentHistory } from './pages/student/StudentHistory';
// Settings
import { Settings } from './pages/Settings';

import { useStore } from './store';
import { UserRole } from './types';

const Login = () => {
  const { setUser, users } = useStore();
  
  const handleLogin = (role: UserRole) => {
    // Find mock user for this role
    const mockUser = users.find(u => u.role === role);
    if (mockUser) {
      setUser(mockUser);
    } else {
      // Fallback create if not exists in mock store
      setUser({
        id: role.toLowerCase() + '_demo',
        name: `Demo ${role}`,
        email: `${role.toLowerCase()}@demo.com`,
        role: role,
        avatar: `https://ui-avatars.com/api/?name=${role}&background=random`
      });
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
        <p className="text-gray-500 mb-8">Hệ thống quản lý học tập & thi cử</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => handleLogin('ADMIN')}
            className="w-full bg-gray-800 text-white p-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Đăng nhập Quản Trị Viên (Admin)
          </button>
          <button 
            onClick={() => handleLogin('TEACHER')}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Đăng nhập Giáo Viên
          </button>
          <button 
            onClick={() => handleLogin('STUDENT')}
            className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Đăng nhập Học Sinh
          </button>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Demo Mode: No password required.
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
  const { user } = useStore();

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
             <DiscussionManager />
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
