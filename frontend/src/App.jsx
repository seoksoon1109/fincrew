import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import NoticeEditPage from './pages/NoticeEditPage'
import AuditReviewPage from './pages/AuditReviewPage'
import AuditCommentPage from './pages/AuditCommentPage'
import AuditStatsPage from './pages/AuditStatsPage'
import AuditClubChartPage from './pages/AuditClubChartPage'
import MyClubChartPage from './pages/MyClubChartPage'
import AuditCommentSummaryPage from './pages/AuditCommentSummaryPage'

function App() {
  const [isAuditor, setIsAuditor] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const fetchUser = async () => {
      const isOnAuthPage = location.pathname === '/auth'
      if (isOnAuthPage) {
        setIsAuthenticated(false)
        setIsAuditor(false)
        return
      }

      try {
        const res = await authFetch('/api/auth/me/')
        if (!res.ok) throw new Error('인증 실패')
        const data = await res.json()
        setIsAuditor(data.is_auditor)
        setIsAuthenticated(true)
      } catch (err) {
        console.error('유저 정보 불러오기 실패', err)
        setIsAuditor(false)
        setIsAuthenticated(false)
      }
    }

    if (isAuthenticated === null) {
      fetchUser()
    }
  }, [location.pathname, isAuthenticated])

  // 인증 상태 판단 전에는 UI를 렌더링하지 않음
  if (isAuthenticated === null) {
    return <div>로딩 중...</div>
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={isAuditor ? <AuditorDashboard /> : <Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="calendar/:date" element={<CalendarDatePage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expense" element={<ExpensePage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="members" element={<MemberPage />} />
        <Route path="notices" element={<NoticeListPage />} />
        <Route path="notices/:id" element={<NoticeDetailPage />} />
        <Route path="notices/new" element={<NoticeCreatePage />} />
        <Route path="notices/:id/edit" element={<NoticeEditPage />} />
        <Route path="audit/transactions/review" element={<AuditReviewPage />} />
        <Route path="audit/comments/:id" element={<AuditCommentPage />} />
        <Route path="audit/stats" element={<AuditStatsPage />} />
        <Route path="audit/stats/:clubName" element={<AuditClubChartPage />} />
        <Route path="my-club-chart" element={<MyClubChartPage />} />
        <Route path="audit/comments-summary" element={<AuditCommentSummaryPage />} />
      </Route>
    </Routes>
  )
}

export default App
