import { Link, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function SidebarLayout() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`
        },
        credentials: 'include' // ✅ 여기 꼭 필요함
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        console.error('❌ 인증 실패:', res.status)
      }
    }
    fetchUser()
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: '#f4f4f4', padding: '1rem' }}>
        {/* 로고 영역 */}
        <div
          style={{
            width: '100%',
            height: '140px',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '2rem',
            borderRadius: '8px',
            borderBottom: '3px solid #ccc'
          }}
        >
          <img
            src="/logo.png"
            alt="FinCrew 로고"
            style={{ width: '120%', height: 'auto', objectFit: 'cover' }}
          />
        </div>

        {/* ✅ 사용자 표시 영역 */}
        {user && (
          <div style={{ padding: '0.5rem 1rem', backgroundColor: '#e9ecef', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '14px' }}>
            👤 <strong>{user.username}</strong>
            <button onClick={logout} style={{ marginLeft: '10px', fontSize: '12px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
              로그아웃
            </button>
          </div>
        )}

        {/* 메뉴 */}
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '25px', lineHeight: '3rem' }}>
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

        {/* ✅ 장부 관리 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '2rem 0 1rem',
            fontSize: '16px',
            color: '#888'
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>장부 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        {/* 장부 관리 하위 메뉴 */}
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '22px', lineHeight: '2.5rem' }}>
          <li style={{ paddingLeft: '1rem' }}>
            <Link
              to="/calendar"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              📅 거래 달력
            </Link>
          </li>
          <li style={{ paddingLeft: '1rem' }}>
            <Link
              to="/income"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              ➕ 수입 내역
            </Link>
          </li>
          <li style={{ paddingLeft: '1rem' }}>
            <Link
              to="/expense"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              ➖ 지출 내역
            </Link>
          </li>
        </ul>

        {/* ✅ 명부 관리 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '2rem 0 1rem',
            fontSize: '16px',
            color: '#888'
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
          <span style={{ padding: '0 10px', whiteSpace: 'nowrap' }}>명부 관리</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
        </div>

        {/* 명부 관리 하위 메뉴 */}
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '22px', lineHeight: '2.5rem' }}>
          <li style={{ paddingLeft: '1rem' }}>
            <Link
              to="/members"
              style={linkStyle}
              onMouseOver={e => (e.target.style.color = hoverStyle.color)}
              onMouseOut={e => (e.target.style.color = linkStyle.color)}
            >
              📋 동아리원 조회
            </Link>
          </li>
        </ul>
      </nav>

      {/* 본문 영역 */}
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
