import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AuditorSidebar from './AuditorSidebar'
import { authFetch } from '../utils/authFetch'
import "../pages/Modal.css"

export default function SidebarLayout() {
  const [user, setUser] = useState(null)
  const [hasNewNotice, setHasNewNotice] = useState(false)
  const location = useLocation()  // ✅ 추가

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
    const checkNewNotices = async () => {
      try {
        const res = await authFetch('/api/notice/check-new/')
        if (res.ok) {
          const data = await res.json()
          setHasNewNotice(data.has_new)
        }
      } catch (error) {
        console.error('새 공지 확인 실패', error)
      }
    }
    checkNewNotices()
  }, [])

  // ✅ /notices로 이동 시 뱃지 제거
  useEffect(() => {
    if (location.pathname === '/notices') {
      setHasNewNotice(false)
    }
  }, [location.pathname])

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    window.location.href = '/auth'
  }

  const linkStyle = {
    color: 'black',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    padding: '0.3rem 1rem',
    display: 'block',
    borderRadius: '6px',
    fontSize: '22px',
    lineHeight: '2.6rem'
  }

  const hoverStyle = {
    color: '#007bff'
  }

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '2rem 0 1rem',
    fontSize: '16px',
    color: '#888'
  }

  if (!user) return <div>로딩 중...</div>

  if (user.is_auditor) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AuditorSidebar user={user} logout={logout} />
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: '#f4f4f4', padding: '1.5rem 1rem' }}>
        <div style={{
          width: '100%', height: '120px', overflow: 'hidden',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          marginBottom: '2rem', borderRadius: '8px', borderBottom: '2px solid #ccc'
        }}>
          <img src="/logo.png" alt="FinCrew 로고"
            style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
        </div>

        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#e9ecef',
          borderRadius: '6px',
          marginBottom: '2rem',
          fontSize: '14px'
        }}>
          👤 <strong>{user.club_name}</strong>
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

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/notices" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
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
            <Link to="/" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              🏠 Dashboard
            </Link>
          </li>
        </ul>

        <div style={sectionTitleStyle}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>장부 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/calendar" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              📅 거래 달력
            </Link>
          </li>
          <li>
            <Link to="/income" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              ➕ 수입 내역
            </Link>
          </li>
          <li>
            <Link to="/expense" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              ➖ 지출 내역
            </Link>
          </li>
          <li>
            <Link to="/audit/comments-summary" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              💬 코멘트 모아보기
            </Link>
          </li>
        </ul>

        <div style={sectionTitleStyle}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>동아리 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/members" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              📋 동아리원 조회
            </Link>
          </li>
          <li>
            <Link to="/my-club-chart" style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}>
              📊 동아리 통계
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
