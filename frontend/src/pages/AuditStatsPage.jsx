import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

export default function AuditStatsPage() {
    const [stats, setStats] = useState([]);
    const [clubFilter, setClubFilter] = useState('all');
    const [sortField, setSortField] = useState('club');
    const [sortOrder, setSortOrder] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        authFetch('/api/audit/statistics-by-club/')
            .then(res => res.json())
            .then(data => setStats(data));
    }, []);

    const uniqueClubs = Array.from(new Set(stats.map(s => s.club)));

    const filteredStats = stats
        .filter(s => clubFilter === 'all' || s.club === clubFilter)
        .sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (typeof valA === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
            return sortOrder === 'asc'
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });

    const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
    const paginatedStats = filteredStats.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = field => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        borderRadius: '12px',
        overflow: 'hidden',
        textAlign: 'center'
    };

    const thStyle = {
        padding: '12px 16px',
        borderBottom: '1px solid #ddd',
        fontWeight: '600',
        color: '#333',
        cursor: 'pointer'
    };

    const tdStyle = {
        padding: '12px'
    };

    return (
        <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
            <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>📊 동아리별 감사 통계</h1>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <select
                    value={clubFilter}
                    onChange={e => setClubFilter(e.target.value)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                    <option value="all">전체 동아리</option>
                    {uniqueClubs.map(club => (
                        <option key={club} value={club}>{club}</option>
                    ))}
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                            {[
                                { key: 'club', label: '동아리' },
                                { key: 'total', label: '총 거래' },
                                { key: 'completed', label: '감사 완료' },
                                { key: 'in_progress', label: '진행 중' },
                                { key: 'not_reviewed', label: '미완료' },
                                { key: 'completion_rate', label: '완료율 (%)' }
                            ].map(col => (
                                <th key={col.key} style={thStyle} onClick={() => handleSort(col.key)}>
                                    {col.label} {sortField === col.key ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStats.map((club, idx) => (
                            <tr
                                key={idx}
                                onClick={() => navigate(`/audit/stats/${encodeURIComponent(club.club)}`)}
                                style={{
                                    borderBottom: '1px solid #eee',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9f9f9')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                            >
                                <td style={tdStyle}>{club.club}</td>
                                <td style={tdStyle}>{club.total}</td>
                                <td style={tdStyle}>{club.completed}</td>
                                <td style={tdStyle}>{club.in_progress}</td>
                                <td style={tdStyle}>{club.not_reviewed}</td>
                                <td style={tdStyle}>{club.completion_rate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                        backgroundColor: '#e0e0e0',
                        color: '#000',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        opacity: currentPage === 1 ? 0.6 : 1
                    }}
                >
                    ⬅ 이전
                </button>
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
                    style={{
                        backgroundColor: '#e0e0e0',
                        color: '#000',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        opacity: currentPage === totalPages ? 0.6 : 1
                    }}
                >
                    다음 ➡
                </button>
            </div>
        </div>
    );
}
