import { useEffect, useState } from 'react'
import { authFetch } from "../utils/authFetch";
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import './Modal.css';

export default function AuditReviewPage() {
    const [transactions, setTransactions] = useState([]);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterClub, setFilterClub] = useState('');
    const [minDate, setMinDate] = useState('');
    const [maxDate, setMaxDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [receiptFilter, setReceiptFilter] = useState('all');
    const [clubList, setClubList] = useState([]);
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        fetchTransactions();
        fetchClubList();

        // 디버깅용
        authFetch('/api/audit/transactions/').then(res => res.json()).then(data => {
            console.log('클럽명 목록 (거래내역 기준)', [...new Set(data.map(t => t.club_name))]);
        });
    }, []);

    const fetchClubList = () => {
        authFetch('/api/audit/clubs/')
            .then(res => res.json())
            .then(data => setClubList(data))
            .catch(err => console.error('클럽 목록 불러오기 실패:', err));
    };

    const fetchTransactions = () => {
        authFetch('/api/audit/transactions/')
            .then(res => res.json())
            .then(data => setTransactions(data))
            .catch(err => console.error('거래내역 불러오기 실패:', err));
    };

    const handlePreview = (id) => {
        authFetch(`/api/receipts/preview/${id}/`)
            .then(res => res.json())
            .then(data => {
                if (data.image_url) {
                    setPreviewUrl(`http://localhost:8000${data.image_url}`);
                    setShowModal(true);
                } else {
                    alert("\u274C 영수증이 없습니다.");
                }
            });
    };

    const filtered = transactions.filter(t => {
        const clubMatch = !filterClub || t.club_name === filterClub;
        const dateMatch = (!minDate || t.date >= minDate) && (!maxDate || t.date <= maxDate);
        const statusMatch = statusFilter === 'all' || t.review_status === statusFilter;
        const receiptMatch =
            receiptFilter === 'all' ||
            (receiptFilter === 'has' && t.has_receipt) ||
            (receiptFilter === 'none' && !t.has_receipt);
        return clubMatch && dateMatch && statusMatch && receiptMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (sortField === 'has_receipt') return sortOrder === 'asc' ? (valA ? -1 : 1) : (valA ? 1 : -1);
        return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getNextStatus = (current) => {
        if (current === 'not_reviewed') return 'in_progress';
        if (current === 'in_progress') return 'completed';
        return 'not_reviewed';
    };

    const updateReviewStatus = (id, currentStatus) => {
        const nextStatus = getNextStatus(currentStatus);

        authFetch(`/api/audit/transactions/${id}/review_status/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_status: nextStatus })
        })
            .then(res => {
                if (!res.ok) throw new Error('업데이트 실패');
                return res.json();
            })
            .then(() => fetchTransactions())
            .catch(() => alert("감사 상태 업데이트 실패"));
    };

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    const statusBadge = (status) => {
        const style = {
            padding: '6px 12px',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 'bold',
            display: 'inline-block'
        };
        if (status === 'completed') return <span style={{ ...style, backgroundColor: '#2ecc71' }}>✔ 완료</span>;
        if (status === 'in_progress') return <span style={{ ...style, backgroundColor: '#f39c12' }}>⏳ 진행중</span>;
        return <span style={{ ...style, backgroundColor: '#e74c3c' }}>❗ 미완료</span>;
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

    const renderPagination = () => {
        const pageNumbers = [];
        const delta = 2;
        const startPage = Math.max(2, currentPage - delta);
        const endPage = Math.min(totalPages - 1, currentPage + delta);

        pageNumbers.push(
            <button key={1} onClick={() => setCurrentPage(1)} style={getPageBtnStyle(1)} >1</button>
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
            <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>🛠️ 감사 현황</h1>

            {/* 필터 UI 생략 없이 그대로 유지 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <select value={filterClub} onChange={e => setFilterClub(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="">전체 동아리</option>
                    {clubList.map(club => <option key={club} value={club}>{club}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="date" value={minDate} onChange={e => setMinDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    <span>~</span>
                    <input type="date" value={maxDate} onChange={e => setMaxDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="all">전체 상태</option>
                    <option value="completed">✔ 완료</option>
                    <option value="in_progress">⏳ 진행중</option>
                    <option value="not_reviewed">❗ 미완료</option>
                </select>
                <select value={receiptFilter} onChange={e => setReceiptFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="all">전체 영수증</option>
                    <option value="has">✅ 있음</option>
                    <option value="none">❌ 없음</option>
                </select>
                <button onClick={() => { setFilterClub(''); setMinDate(''); setMaxDate(''); setStatusFilter('all'); setReceiptFilter('all'); }} style={{ backgroundColor: '#ddd', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>초기화</button>
            </div>

            {/* 테이블 */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                            {['동아리', '날짜', '유형', '금액', '내용', '영수증', '감사 상태'].map((label, idx) => {
                                const sortKeys = ['club_name', 'date', 'type', 'amount', 'note', 'has_receipt'];
                                const sortKey = sortKeys[idx];
                                const isSortable = idx < sortKeys.length;
                                return (
                                    <th key={idx} onClick={isSortable ? () => handleSort(sortKey) : undefined} style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', fontWeight: '600', color: '#333', cursor: isSortable ? 'pointer' : 'default' }}>
                                        {label} {sortField === sortKey && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(t => (
                            <tr
                                key={t.id}
                                onClick={() => navigate(`/audit/comments/${t.id}`)}
                                onMouseEnter={() => setHoveredRowId(t.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                                style={{
                                    borderBottom: '1px solid #eee',
                                    backgroundColor: hoveredRowId === t.id ? '#f9f9f9' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: hoveredRowId === t.id ? 'scale(1.005)' : 'scale(1)',
                                    boxShadow: hoveredRowId === t.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                <td style={{ padding: '12px' }}>{t.club_name || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{t.date}</td>
                                <td style={{ padding: '12px' }}>{t.type === 'income' ? '수입' : '지출'}</td>
                                <td style={{ padding: '12px' }}>{parseInt(t.amount).toLocaleString()}원</td>
                                <td style={{ padding: '12px' }}>{t.note || '-'}</td>
                                <td style={{ padding: '12px' }}>
                                    {t.type === 'income' ? '-' : t.has_receipt ? (
                                        <button onClick={(e) => { e.stopPropagation(); handlePreview(t.id); }} style={{ backgroundColor: '#1abc9c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>보기 👁️</button>
                                    ) : '❌ 없음'}
                                </td>
                                <td
                                    style={{ padding: '12px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateReviewStatus(t.id, t.review_status);
                                    }}
                                >
                                    {statusBadge(t.review_status)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* 페이지네이션 */}
            {renderPagination()}
            {/* 영수증 모달 */}
            {showModal && previewUrl && (
                <div className="modal">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <TransformWrapper>
                            <TransformComponent>
                                <img src={previewUrl} alt="영수증 미리보기" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />
                            </TransformComponent>
                        </TransformWrapper>
                        <div className="button-group inside-card">
                            <button className="secondary" onClick={() => setShowModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
