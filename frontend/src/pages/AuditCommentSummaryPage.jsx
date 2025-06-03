import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

export default function AuditCommentSummaryPage() {
    const [comments, setComments] = useState([]);
    const [clubFilter, setClubFilter] = useState('');
    const [keyword, setKeyword] = useState('');
    const [clubList, setClubList] = useState([]);
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAuditor, setIsAuditor] = useState(false);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        authFetch('/api/auth/me/')
            .then(res => res.json())
            .then(data => {
                console.log('👤 현재 사용자 정보:', data);
                console.log('✅ 감사자 여부:', data?.is_auditor); // 수정된 라인
                setIsAuditor(data?.is_auditor); // 수정된 라인
                fetchComments(data?.is_auditor); // 수정된 라인
            });

        fetchClubs();
    }, []);

    const fetchClubs = () => {
        authFetch('/api/audit/clubs/')
            .then(res => res.json())
            .then(setClubList);
    };

    const fetchComments = (auditorStatus = isAuditor) => {
        const params = new URLSearchParams();
        if (clubFilter) params.append('club', clubFilter);
        if (keyword) params.append('keyword', keyword);
        if (!auditorStatus) params.append('only_mine', 'true');

        authFetch(`/api/audit/comments-summary/?${params.toString()}`)
            .then(res => res.json())
            .then(setComments);
    };

    const handleFilterChange = () => {
        setCurrentPage(1);
        fetchComments();
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getPageBtnStyle = (num) => ({
        backgroundColor: currentPage === num ? '#2e86de' : '#f0f0f0',
        color: currentPage === num ? '#fff' : '#000',
        fontWeight: 'bold',
        padding: '6px 12px',
        borderRadius: '6px',
        margin: '0 4px',
        border: 'none',
        cursor: 'pointer'
    });

    const navBtnStyle = (disabled) => ({
        backgroundColor: '#e0e0e0',
        padding: '6px 12px',
        borderRadius: '6px',
        margin: '0 4px',
        border: 'none',
        cursor: 'pointer',
        opacity: disabled ? 0.5 : 1
    });

    const sorted = [...comments].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortField === 'date'
            ? (sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA))
            : (sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA)));
    });

    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPagination = () => {
        const pageNumbers = [];
        const delta = 2;
        const startPage = Math.max(2, currentPage - delta);
        const endPage = Math.min(totalPages - 1, currentPage + delta);

        pageNumbers.push(
            <button key={1} onClick={() => setCurrentPage(1)} style={getPageBtnStyle(1)}>1</button>
        );
        if (startPage > 2) pageNumbers.push(<span key="start-ellipsis" style={{ padding: '6px' }}>...</span>);
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(<button key={i} onClick={() => setCurrentPage(i)} style={getPageBtnStyle(i)}>{i}</button>);
        }
        if (endPage < totalPages - 1) pageNumbers.push(<span key="end-ellipsis" style={{ padding: '6px' }}>...</span>);
        if (totalPages > 1) {
            pageNumbers.push(
                <button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={getPageBtnStyle(totalPages)}>{totalPages}</button>
            );
        }

        return (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={navBtnStyle(currentPage === 1)}>⬅ 이전</button>
                {pageNumbers}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={navBtnStyle(currentPage === totalPages)}>다음 ➡</button>
            </div>
        );
    };

    return (
        <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
            <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>💬 코멘트 모아보기</h1>

            {/* 필터 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                {isAuditor && (
                    <select value={clubFilter} onChange={e => setClubFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="">전체 동아리</option>
                        {clubList.map(club => (
                            <option key={club} value={club}>{club}</option>
                        ))}
                    </select>
                )}

                <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="키워드 검색"
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                />

                <button
                    onClick={handleFilterChange}
                    style={{
                        backgroundColor: '#2e86de',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    검색
                </button>
            </div>

            {/* 테이블 */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    textAlign: 'center'
                }}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                            {[
                                ['date', '날짜'],
                                ['club', '동아리명'],
                                ['title', '거래 제목'],
                                ['content', '코멘트 요약'],
                                ['author', '작성자'],
                                ['has_attachment', '첨부']
                            ].map(([field, label]) => (
                                <th
                                    key={field}
                                    onClick={() => handleSort(field)}
                                    style={{ padding: '12px 8px', borderBottom: '1px solid #ddd', fontWeight: '600', color: '#333', cursor: 'pointer' }}
                                >
                                    {label} {sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length > 0 ? paginated.map(comment => (
                            <tr
                                key={comment.id}
                                onClick={() => navigate(`/audit/comments/${comment.transaction_id}`)}
                                style={{
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: '#fff'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                                <td style={{ padding: '12px' }}>{comment.date}</td>
                                <td style={{ padding: '12px' }}>{comment.club}</td>
                                <td style={{ padding: '12px' }}>{comment.title}</td>
                                <td style={{ padding: '12px' }}>{comment.content}</td>
                                <td style={{ padding: '12px' }}>{comment.author || '-'}</td>
                                <td style={{ padding: '12px' }}>{comment.has_attachment ? '📎' : '-'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>코멘트가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 페이지네이션 */}
            {renderPagination()}
        </div>
    );
}
