import { Link, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AuditorSidebar from './AuditorSidebar'
import { authFetch } from '../utils/authFetch'
import "../pages/Modal.css"

export default function SidebarLayout() {
  const [user, setUser] = useState(null)
  const [hasNewNotice, setHasNewNotice] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access')}`
          },
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        }
      } catch (error) {
        console.error('유저 정보 불러오기 실패', error)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access')}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          const now = new Date()
          const threeDaysAgo = new Date(now.setDate(now.getDate() - 3))
          const hasRecent = data.some(n => new Date(n.created_at) > threeDaysAgo)
          setHasNewNotice(hasRecent)
        }
      } catch (error) {
        console.error('공지사항 불러오기 실패', error)
      }
    }
    fetchNotices()
  }, [])

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    window.location.href = '/auth'
  }

  const linkStyle = {
    color: 'black',
    textDecoration: 'none',
    transition: 'color 0.2s ease'
  }

  const hoverStyle = {
    color: '#007bff'
  }

  if (!user) return <div>로딩 중...</div>

  if (user.is_auditor) {
    // 감사원 레이아웃 (✔️ 대시보드 카드 제거, Outlet만 유지)
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AuditorSidebar />
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  // 일반 사용자 레이아웃
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: '#f4f4f4', padding: '1rem' }}>
        <div style={{
          width: '100%', height: '140px', overflow: 'hidden',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          marginBottom: '2rem', borderRadius: '8px', borderBottom: '3px solid #ccc'
        }}>
          <img src="/logo.png" alt="FinCrew 로고"
            style={{ width: '120%', height: 'auto', objectFit: 'cover' }} />
        </div>

        <div style={{
          padding: '0.5rem 1rem', backgroundColor: '#e9ecef',
          borderRadius: '6px', marginBottom: '1.5rem', fontSize: '14px'
        }}>
          👤 <strong>{user.username}</strong>
          <button
            onClick={logout}
            style={{
              marginLeft: '10px',
              fontSize: '12px',
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, fontSize: '25px', lineHeight: '3rem' }}>
          <li>
            <Link
              to="/notices"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              📢 공지사항
              {hasNewNotice && (
                <span style={{
                  background: 'red',
                  color: 'white',
                  fontSize: '12px',
                  marginLeft: '8px',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  verticalAlign: 'middle'
                }}>
                  NEW
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link
              to="/"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              🏠 Dashboard
            </Link>
          </li>
        </ul>

        <div style={{
          display: 'flex', alignItems: 'center',
          margin: '2rem 0 1rem', fontSize: '16px', color: '#888'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>장부 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        <ul style={{ listStyle: 'none', padding: 0, fontSize: '22px', lineHeight: '2.5rem' }}>
          <li style={{ paddingLeft: '1rem' }}>
            <Link to="/calendar" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              📅 거래 달력
            </Link>
          </li>
          <li style={{ paddingLeft: '1rem' }}>
            <Link to="/income" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              ➕ 수입 내역
            </Link>
          </li>
          <li style={{ paddingLeft: '1rem' }}>
            <Link to="/expense" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              ➖ 지출 내역
            </Link>
          </li>
        </ul>

        <div style={{
          display: 'flex', alignItems: 'center',
          margin: '2rem 0 1rem', fontSize: '16px', color: '#888'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>명부 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        <ul style={{ listStyle: 'none', padding: 0, fontSize: '22px', lineHeight: '2.5rem' }}>
          <li style={{ paddingLeft: '1rem' }}>
            <Link to="/members" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              📋 동아리원 조회
            </Link>
          </li>
        </ul>
      </nav>

      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
