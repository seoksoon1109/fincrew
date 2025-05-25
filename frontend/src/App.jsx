// src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import AuditorDashboard from './pages/AuditorDashboard'
import IncomePage from './pages/IncomePage'
import ExpensePage from './pages/ExpensePage'
import SidebarLayout from './components/SidebarLayout'
import UploadPage from './pages/UploadPage'
import CalendarPage from './pages/CalendarPage'
import CalendarDatePage from './pages/CalendarDatePage'
import MemberPage from './pages/MembersPage'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './components/ProtectedRoute'
import AuthRedirect from './components/AuthRedirect'
import NoticeListPage from './pages/NoticeListPage'
import NoticeDetailPage from './pages/NoticeDetailPage'
import NoticeCreatePage from './pages/NoticeCreatePage'
import { authFetch } from './utils/authFetch'

function App() {
  const [isAuditor, setIsAuditor] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(null)


  useEffect(() => {
    const fetchUser = async () => {
      if (location.pathname === '/auth') {
        // 로그인 페이지에선 인증 체크하지 않음
        setIsAuthenticated(false);
        setIsAuditor(false);
        return;
      }

      try {
        const res = await authFetch('/api/auth/me/');
        if (!res.ok) throw new Error('인증 실패');
        const data = await res.json();
        setIsAuditor(data.is_auditor);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('유저 정보 불러오기 실패', err);
        setIsAuditor(false);
        setIsAuthenticated(false);
      }
    };
    fetchUser();
  }, [location.pathname]);

  if (isAuthenticated === null) {
    return <div>로딩 중...</div>
  }

  return (
    <Routes>
      {/* 로그인 페이지: 로그인 상태면 홈으로 리다이렉트 */}
      <Route
        path="/auth"
        element={
          <AuthRedirect isAuthenticated={isAuthenticated}>
            <AuthPage />
          </AuthRedirect>
        }
      />

      {/* 보호된 라우트: 인증 안되면 로그인 페이지로 리다이렉트 */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      >
        {/* index 페이지: 감사원/일반 사용자 분기 */}
        <Route
          index
          element={isAuditor ? <AuditorDashboard /> : <Dashboard />}
        />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="calendar/:date" element={<CalendarDatePage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expense" element={<ExpensePage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="members" element={<MemberPage />} />
        <Route path="notices" element={<NoticeListPage />} />
        <Route path="notices/:id" element={<NoticeDetailPage />} />
        <Route path="/notices/new" element={<NoticeCreatePage />} />
      </Route>
    </Routes>
  )
}

export default App
