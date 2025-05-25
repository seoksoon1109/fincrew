// AuditorSidebar.jsx
import { Link, useLocation } from 'react-router-dom'

export default function AuditorSidebar() {
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    const linkStyle = {
        color: 'black',
        textDecoration: 'none',
        transition: 'color 0.2s ease'
    }

    const hoverStyle = {
        color: '#007bff'
    }

    return (
        <nav style={{ width: '250px', background: '#f4f4f4', padding: '1rem' }}>
            {/* 로고 */}
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
                👤 <strong>감사원 계정</strong>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, fontSize: '24px', lineHeight: '3rem' }}>
                <li>
                    <Link
                        to="/"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        📋 감사 대시보드
                    </Link>
                </li>
                <li>
                    <Link
                        to="/audit/transactions"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        🧾 거래 검토
                    </Link>
                </li>
                <li>
                    <Link
                        to="/audit/clubs"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        📂 회계 현황
                    </Link>
                </li>
                <li>
                    <Link
                        to="/audit/reports"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        📄 리포트 작성
                    </Link>
                </li>
                <li>
                    <Link
                        to="/audit/stats"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        📊 통계 분석
                    </Link>
                </li>
                <li>
                    <Link
                        to="/notices"
                        style={linkStyle}
                        onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                        onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                        📢 공지사항
                    </Link>
                </li>
            </ul>
        </nav>
    )
} 