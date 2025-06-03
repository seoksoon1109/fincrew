import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authFetch } from '../utils/authFetch'

export default function AuditorSidebar({ user, logout }) {
    const location = useLocation()
    const [showModal, setShowModal] = useState(false)
    const [clubList, setClubList] = useState([])
    const [selectedClub, setSelectedClub] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [downloadType, setDownloadType] = useState('pdf') // pdf or zip

    useEffect(() => {
        if (showModal) {
            authFetch('/api/audit/clubs/')
                .then(res => res.json())
                .then(data => setClubList(data))
        }
    }, [showModal])

    const handleGenerateReport = async () => {
        if (!selectedClub) {
            alert('동아리를 선택하세요.')
            return
        }

        try {
            setIsGenerating(true)
            const token = localStorage.getItem('access')
            const response = await fetch(`/api/audit/report/?type=${downloadType}&club=${encodeURIComponent(selectedClub)}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error('파일 생성 실패')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `거래내역보고서_${selectedClub}.${downloadType === 'zip' ? 'zip' : 'pdf'}`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            setShowModal(false)
            setSelectedClub('')
            setDownloadType('pdf')
        } catch (error) {
            alert('보고서 생성 중 오류가 발생했습니다.')
            console.error(error)
        } finally {
            setIsGenerating(false)
        }
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

    const hoverStyle = { color: '#007bff' }

    const sectionTitleStyle = {
        display: 'flex',
        alignItems: 'center',
        margin: '2rem 0 1rem',
        fontSize: '16px',
        color: '#888'
    }

    return (
        <>
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
                    👤 <strong>(감사) {user?.username}</strong>
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
                        </Link>
                    </li>
                    <li>
                        <Link to="/" style={linkStyle}
                            onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                            onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                            📋 감사 대시보드
                        </Link>
                    </li>
                </ul>

                <div style={sectionTitleStyle}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
                    <span style={{ padding: '0 10px' }}>장부 감사</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li>
                        <Link to="/audit/transactions/review" style={linkStyle}
                            onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                            onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                            🛠️ 감사 현황
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
                    <span style={{ padding: '0 10px' }}>분석 도구</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }} />
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li>
                        <Link to="/audit/stats" style={linkStyle}
                            onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                            onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                            📊 통계 분석
                        </Link>
                    </li>
                    <li>
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                ...linkStyle,
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                width: '100%',
                                cursor: 'pointer'
                            }}
                            onMouseOver={e => (e.target.style.color = hoverStyle.color)}
                            onMouseOut={e => (e.target.style.color = linkStyle.color)}>
                            📄 보고서 생성
                        </button>
                    </li>
                </ul>
            </nav>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: 'white', padding: '2rem', borderRadius: '8px',
                        minWidth: '340px', boxShadow: '0 0 10px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ marginBottom: '1rem' }}>보고서 옵션</h3>
                        <label>동아리 선택</label>
                        <select
                            value={selectedClub}
                            onChange={e => setSelectedClub(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', fontSize: '16px', marginBottom: '1rem' }}
                        >
                            <option value="">-- 동아리 선택 --</option>
                            {clubList.map((club, idx) => (
                                <option key={idx} value={club}>{club}</option>
                            ))}
                        </select>

                        <div style={{ marginBottom: '1rem' }}>
                            <label><input type="radio" name="downloadType" value="pdf" checked={downloadType === 'pdf'} onChange={() => setDownloadType('pdf')} /> PDF 보고서만</label><br />
                            <label><input type="radio" name="downloadType" value="zip" checked={downloadType === 'zip'} onChange={() => setDownloadType('zip')} /> PDF + 증빙자료 ZIP</label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {isGenerating && (
                                <div style={{
                                    marginRight: '1rem',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        border: '2px solid #ccc',
                                        borderTop: '2px solid #2f855a',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                </div>
                            )}
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={isGenerating}
                                style={{ marginRight: '1rem' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleGenerateReport}
                                disabled={isGenerating}
                                style={{
                                    backgroundColor: '#2f855a',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    opacity: isGenerating ? 0.7 : 1,
                                    cursor: isGenerating ? 'not-allowed' : 'pointer'
                                }}
                            >
                                보고서 생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </>
    )
}
