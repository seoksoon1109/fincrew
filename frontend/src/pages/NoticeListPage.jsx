import { useEffect, useState } from 'react';
import { fetchNotices } from "../utils/notices";
import { authFetch } from "../utils/authFetch";
import { Link, useNavigate } from 'react-router-dom';

export default function NoticeListPage() {
    const [notices, setNotices] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [isAuditor, setIsAuditor] = useState(false);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotices()
            .then(setNotices)
            .catch(err => {
                if (err.response?.status === 404) {
                    console.warn("📭 공지 없음 (404)");
                    setNotices([]);
                } else {
                    console.error("❌ 공지 불러오기 실패:", err);
                }
            });

        authFetch('/api/auth/me/')
            .then(res => res.json())
            .then(data => setIsAuditor(data.is_auditor))
            .catch(err => console.error("❌ 사용자 정보 불러오기 실패:", err));

        const markNoticeAsSeen = async () => {
            try {
                await authFetch('/api/notice/mark-seen/', {
                    method: 'POST',
                });
            } catch (err) {
                console.error("❌ 공지 확인 시각 기록 실패:", err);
            }
        };

        markNoticeAsSeen();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('정말로 이 공지를 삭제하시겠습니까?')) return;

        try {
            const res = await authFetch(`/api/notices/${id}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error('삭제 실패');
            setNotices(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('❌ 삭제 실패:', err);
            alert('공지 삭제에 실패했습니다.');
        }
    };

    const sortedNotices = [...notices].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (sortField === 'created_at') {
            return sortOrder === 'asc'
                ? new Date(valA) - new Date(valB)
                : new Date(valB) - new Date(valA);
        }

        return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
    });

    const totalPages = Math.ceil(sortedNotices.length / itemsPerPage);
    const paginated = sortedNotices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const thStyle = {
        padding: '12px 8px',
        borderBottom: '1px solid #ddd',
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        cursor: 'pointer',
    };

    const tdStyle = {
        padding: '12px 8px',
        textAlign: 'center',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap'
    };

    return (
        <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
            <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>📢 공지사항</h1>

            {isAuditor && (
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                    <button
                        onClick={() => navigate('/notices/new')}
                        style={{
                            backgroundColor: '#2e86de',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        ➕ 공지 추가
                    </button>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
                    <colgroup>
                        <col style={{ width: '60%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '15%' }} />
                        {isAuditor && <col style={{ width: '10%' }} />}
                    </colgroup>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                            <th onClick={() => setSortField('title')} style={thStyle}>제목 {sortField === 'title' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => setSortField('author_name')} style={thStyle}>작성자 {sortField === 'author_name' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => setSortField('created_at')} style={thStyle}>작성일 {sortField === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                            {isAuditor && <th style={thStyle}>관리</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(n => (
                            <tr key={n.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <Link to={`/notices/${n.id}`} style={{ textDecoration: 'none', color: '#2e86de', fontWeight: '500' }}>{n.title}</Link>
                                </td>
                                <td style={tdStyle}>{n.author_name}</td>
                                <td style={tdStyle}>{new Date(n.created_at).toLocaleDateString()}</td>
                                {isAuditor && (
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                            <button
                                                onClick={() => navigate(`/notices/${n.id}/edit`)}
                                                style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                                            >✏️</button>
                                            <button
                                                onClick={() => handleDelete(n.id)}
                                                style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                                            >🗑️</button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ backgroundColor: '#e0e0e0', padding: '6px 12px', borderRadius: '6px', marginRight: '4px', border: 'none' }}
                >⬅ 이전</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        style={{
                            backgroundColor: currentPage === num ? '#2e86de' : '#f0f0f0',
                            color: currentPage === num ? '#fff' : '#000',
                            fontWeight: 'bold',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            margin: '0 4px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {num}
                    </button>
                ))}
                <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ backgroundColor: '#e0e0e0', padding: '6px 12px', borderRadius: '6px', marginLeft: '4px', border: 'none' }}
                >다음 ➡</button>
            </div>
        </div>
    );
}
