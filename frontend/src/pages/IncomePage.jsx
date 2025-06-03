import { useEffect, useState } from 'react';
import { authFetch } from "../utils/authFetch";

export default function IncomePage() {
  const [transactions, setTransactions] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '', note: '', date: '' });
  const [reviewFilter, setReviewFilter] = useState('all');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    authFetch('/api/transactions/')
      .then(res => res.json())
      .then(data => {
        const income = data.filter(t => t.type === 'income');
        setTransactions(income);
      })
      .catch(err => console.error('❌ 데이터 불러오기 실패:', err));
  }, []);

  const handleAddIncome = () => {
    if (transactions.some(t => t.isNew)) return;
    const today = new Date().toISOString().slice(0, 10);
    const newTransaction = {
      id: Date.now(),
      type: 'income',
      title: '',
      amount: '',
      note: '',
      date: today,
      isNew: true,
      review_status: 'not_reviewed'
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setEditId(newTransaction.id);
    setEditForm({ title: '', amount: '', note: '', date: today });
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setEditForm({ title: t.title, amount: String(t.amount), note: t.note, date: t.date });
  };

  const handleSave = (id) => {
    const { title, amount, note, date } = editForm;
    if (!title.trim() || !note.trim() || !amount || !date) {
      alert('모든 항목을 입력하세요.');
      return;
    }

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('금액은 0보다 큰 숫자여야 합니다.');
      return;
    }

    const isNew = transactions.find(t => t.id === id)?.isNew;
    const payload = {
      type: 'income',
      title,
      amount: parsedAmount,
      note,
      date
    };

    const url = isNew ? '/api/transactions/' : `/api/transactions/${id}/`;
    const method = isNew ? 'POST' : 'PATCH';

    authFetch(url, {
      method,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.ok ? res.json() : Promise.reject('저장 실패'))
      .then(data => {
        setTransactions(prev =>
          isNew ? [data, ...prev.filter(t => t.id !== id)] : prev.map(t => t.id === id ? { ...t, ...data } : t)
        );
        setEditId(null);
      })
      .catch(err => {
        console.error('❌ 저장 실패:', err);
        alert('저장에 실패했습니다.');
      });
  };

  const handleCancel = (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction?.isNew) setTransactions(prev => prev.filter(t => t.id !== id));
    setEditId(null);
  };

  const handleDelete = (id) => {
    authFetch(`/api/transactions/${id}/`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok && res.status !== 404) throw new Error('삭제 실패');
        setTransactions(prev => prev.filter(t => t.id !== id));
      })
      .catch(err => {
        console.error('❌ 삭제 실패:', err);
        alert('삭제에 실패했습니다.');
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRowClick = (id) => {
    if (editId !== null) return;
    window.location.href = `/audit/comments/${id}`;
  };

  const handleResetFilters = () => {
    setReviewFilter('all');
    setMinDate('');
    setMaxDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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

  const filtered = transactions.filter(t => {
    const matchReview = reviewFilter === 'all' || t.review_status === reviewFilter;
    const inDate = (!minDate || t.date >= minDate) && (!maxDate || t.date <= maxDate);
    const inAmount = (!minAmount || t.amount >= Number(minAmount)) && (!maxAmount || t.amount <= Number(maxAmount));
    return matchReview && inDate && inAmount;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (sortField === 'amount') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    if (sortField === 'review_status') {
      const statusOrder = { 'completed': 2, 'in_progress': 1, 'not_reviewed': 0 };
      const aVal = statusOrder[valA] ?? -1;
      const bVal = statusOrder[valB] ?? -1;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return sortOrder === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

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

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
      <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>➕ 수입 내역</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="all">전체</option>
          <option value="not_reviewed">❗ 미완료</option>
          <option value="in_progress">⏳ 진행중</option>
          <option value="completed">✔ 완료</option>
        </select>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="date" value={minDate} onChange={e => setMinDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <span>~</span>
          <input type="date" value={maxDate} onChange={e => setMaxDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="number" placeholder="최소 금액" value={minAmount} onChange={e => setMinAmount(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100px' }} />
          <input type="number" placeholder="최대 금액" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100px' }} />
          <button onClick={handleResetFilters} style={{ backgroundColor: '#ddd', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>초기화</button>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleAddIncome} disabled={transactions.some(t => t.isNew)} style={{ backgroundColor: '#2e86de', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ 수입 추가</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              {[
                { label: '날짜', field: 'date' },
                { label: '거래구분', field: 'title' },
                { label: '금액', field: 'amount' },
                { label: '내용', field: 'note' },
                { label: '감사 상태', field: 'review_status' },
                { label: '관리' }
              ].map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => {
                    if (!col.field) return;
                    handleSort(col.field);
                  }}
                  style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #ddd',
                    fontWeight: '600',
                    color: '#333',
                    cursor: col.field ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {col.label}
                  {sortField === col.field && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginated.map(t => (
              <tr
                key={t.id}
                onClick={() => handleRowClick(t.id)}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: hoveredId === t.id ? '#f9f9f9' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: hoveredId === t.id ? 'scale(1.005)' : 'scale(1)',
                  boxShadow: hoveredId === t.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {['date', 'title', 'amount', 'note'].map((field, idx) => (
                  <td key={idx} style={{ padding: '12px' }}>
                    {editId === t.id ? (
                      <input
                        name={field}
                        type={field === 'amount' ? 'number' : field === 'date' ? 'date' : 'text'}
                        value={editForm[field]}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                      />
                    ) : field === 'amount'
                      ? parseInt(t[field]).toLocaleString() + '원'
                      : t[field]}
                  </td>
                ))}

                <td style={{ padding: '12px' }}>{statusBadge(t.review_status)}</td>

                <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                  {editId === t.id ? (
                    <>
                      <button onClick={() => handleSave(t.id)} style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>💾 저장</button>
                      <button onClick={() => handleCancel(t.id)} style={{ backgroundColor: '#95a5a6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>❌ 취소</button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {renderPagination()}
    </div>
  );
}
