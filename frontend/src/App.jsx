import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
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

function App() {
  return (
    <Routes>
      {/* 🔐 로그인 페이지 (로그인 상태면 홈으로 리디렉트) */}
      <Route path="/auth" element={
        <AuthRedirect>
          <AuthPage />
        </AuthRedirect>
      } />

      {/* 🔒 내부 페이지 보호 라우팅 */}
      <Route path="/" element={
        <ProtectedRoute>
          <SidebarLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="calendar/:date" element={<CalendarDatePage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expense" element={<ExpensePage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="members" element={<MemberPage />} />
      </Route>
    </Routes>
  )
}

export default App
