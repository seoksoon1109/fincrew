import { useEffect, useState } from 'react'
import { authFetch } from "../utils/authFetch";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

export default function ExpensePage() {
  const [transactions, setTransactions] = useState([])
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', amount: '', note: '', date: '', imageFile: null })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [receiptWasDeleted, setReceiptWasDeleted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [reviewFilter, setReviewFilter] = useState('all');
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [hoveredId, setHoveredId] = useState(null);
  const itemsPerPage = 10

  const access = localStorage.getItem('access')

  useEffect(() => {
    if (!access) return;
    authFetch('http://localhost:8000/api/transactions/')
      .then(res => res.json())
      .then(data => {
        const expense = data.filter(t => t.type === 'expense')
        setTransactions(expense)
      })
      .catch(err => console.error('❌ 데이터 불러오기 실패:', err))
  }, [access])

  const handleDelete = (id) => {
    authFetch(`http://localhost:8000/api/transactions/${id}/`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok && res.status !== 404) throw new Error('삭제 실패')
        setTransactions(prev => prev.filter(t => t.id !== id))
      })
      .catch(err => {
        console.error('❌ 삭제 실패:', err)
        alert('삭제에 실패했습니다.')
      })
  }

  const handleEdit = (t) => {
    setEditId(t.id)
    setEditForm({ title: t.title, amount: String(t.amount), note: t.note, date: t.date, imageFile: null })
  }

  const handleSave = (id) => {
    const { title, amount, note, date, imageFile } = editForm
    if (!title.trim() || !note.trim() || !amount || !date) return alert("필수 항목을 입력하세요.")
    const parsedAmount = parseInt(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return alert("금액은 0보다 커야 합니다.")

    const isNew = transactions.find(t => t.id === id)?.isNew
    const url = isNew
      ? 'http://localhost:8000/api/transactions/with-receipt/'
      : `http://localhost:8000/api/transactions/${id}/with-receipt/`

    const formData = new FormData()
    formData.append('title', title)
    formData.append('amount', parsedAmount)
    formData.append('note', note)
    formData.append('date', date)
    if (imageFile) formData.append('receipt', imageFile)
    if (receiptWasDeleted) formData.append('delete_image', 'true')

    authFetch(url, {
      method: isNew ? 'POST' : 'PUT',
      body: formData
    })
      .then(res => res.ok ? res.json() : Promise.reject('저장 실패'))
      .then(data => {
        setTransactions(prev => [data, ...prev.filter(t => t.id !== id)])
        setEditId(null)
        setReceiptWasDeleted(false)
      })
      .catch(err => alert('저장 실패: ' + err))
  }

  const handleCancel = (id) => {
    const transaction = transactions.find(t => t.id === id)
    if (transaction?.isNew) setTransactions(prev => prev.filter(t => t.id !== id))
    setEditId(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddExpense = () => {
    if (transactions.some(t => t.isNew)) return
    const today = new Date().toISOString().slice(0, 10)
    const newTransaction = {
      id: Date.now(),
      type: 'expense',
      title: '',
      amount: '',
      note: '',
      date: today,
      has_receipt: false,
      isNew: true,
      imageFile: null,
      review_status: 'not_reviewed'
    }
    setTransactions(prev => [newTransaction, ...prev])
    setEditId(newTransaction.id)
    setEditForm({ title: '', amount: '', note: '', date: today, imageFile: null })
  }

  const handleRowClick = (id) => {
    if (editId !== null) return
    window.location.href = `/audit/comments/${id}`
  }

  const getReviewLabel = (status) => {
    const style = {
      padding: '4px 10px',
      borderRadius: '6px',
      color: '#fff',
      fontWeight: 'bold',
      display: 'inline-block'
    }

    switch (status) {
      case 'completed': return <span style={{ ...style, backgroundColor: '#2ecc71' }}>✔ 완료</span>
      case 'in_progress': return <span style={{ ...style, backgroundColor: '#f39c12' }}>⏳ 진행중</span>
      case 'not_reviewed': return <span style={{ ...style, backgroundColor: '#e74c3c' }}>❗ 미완료</span>
      default: return <span style={{ ...style, backgroundColor: '#e74c3c' }}>❗ 미완료</span>
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesReview = reviewFilter === 'all' || t.review_status === reviewFilter
    const withinDate = (!minDate || t.date >= minDate) && (!maxDate || t.date <= maxDate)
    const withinAmount = (!minAmount || t.amount >= Number(minAmount)) && (!maxAmount || t.amount <= Number(maxAmount))
    return matchesReview && withinDate && withinAmount
  })
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (sortField === 'amount') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    if (sortField === 'has_receipt') {
      return sortOrder === 'asc'
        ? (valA === valB ? 0 : valA ? 1 : -1)
        : (valA === valB ? 0 : valA ? -1 : 1);
    }

    return sortOrder === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });


  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleResetFilters = () => {
    setReviewFilter('all')
    setMinDate('')
    setMaxDate('')
    setMinAmount('')
    setMaxAmount('')
  }

  const handlePreview = (id) => {
    authFetch(`/api/receipts/preview/${id}/`)
      .then(res => res.json())
      .then(data => {
        if (data.image_url) {
          setPreviewUrl(`http://localhost:8000${data.image_url}`);
          setShowModal(true);
        } else {
          alert("❌ 영수증이 없습니다.");
        }
      });
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
      <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>➖ 지출 내역</h1>

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
          <button onClick={handleAddExpense} disabled={transactions.some(t => t.isNew)} style={{ backgroundColor: '#2e86de', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ 지출 추가</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          tableLayout: 'fixed', // ✅ 고정 레이아웃
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
                { label: '날짜', field: 'date' },
                { label: '거래구분', field: 'title' },
                { label: '내용', field: 'note' },
                { label: '금액', field: 'amount' },
                { label: '영수증', field: 'has_receipt' },
                { label: '감사 상태', field: 'review_status' },
                { label: '관리' }
              ].map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => {
                    if (!col.field) return;
                    setSortField(col.field);
                    setSortOrder(prev => (sortField === col.field && prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #ddd',
                    fontWeight: '600',
                    color: '#333', // 요청대로 색상 고정
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
            {paginatedTransactions.map(t => (
              <tr
                key={t.id}
                style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: hoveredId === t.id ? '#f9f9f9' : '#fff',
                  cursor: editId === t.id ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  transform: hoveredId === t.id ? 'scale(1.002)' : 'scale(1)',
                  boxShadow: hoveredId === t.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                }}
                onClick={() => handleRowClick(t.id)}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {['date', 'title', 'note', 'amount'].map((field, idx) => (
                  <td key={idx} style={{ padding: '10px', maxWidth: '120px', overflow: 'hidden' }}>
                    {editId === t.id ? (
                      <input
                        name={field}
                        value={editForm[field]}
                        onChange={handleChange}
                        style={{ width: '100%', maxWidth: '100px' }}
                        type={field === 'amount' ? 'number' : field === 'date' ? 'date' : 'text'}
                      />
                    ) : (
                      field === 'amount'
                        ? parseInt(t[field]).toLocaleString() + '원'
                        : t[field]
                    )}
                  </td>
                ))}

                {/* 영수증 */}
                <td style={{ padding: '12px' }}>
                  {editId === t.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setEditForm(prev => ({ ...prev, imageFile: e.target.files[0] }))
                        }
                      />
                      {t.has_receipt && !receiptWasDeleted && (
                        <button
                          onClick={() => setReceiptWasDeleted(true)}
                          style={{
                            backgroundColor: '#e67e22',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          기존 영수증 삭제
                        </button>
                      )}
                      {receiptWasDeleted && (
                        <span style={{ color: '#e74c3c', fontSize: '12px' }}>📁 기존 영수증 삭제 예정</span>
                      )}
                    </div>
                  ) : t.has_receipt ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(t.id);
                      }}
                      style={{
                        backgroundColor: '#1abc9c',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      보기 👁️
                    </button>
                  ) : '❌ 없음'}
                </td>

                {/* 감사 상태 */}
                <td style={{ padding: '10px', maxWidth: '120px' }}>
                  {getReviewLabel(t.review_status)}
                </td>

                {/* 관리 버튼 */}
                <td style={{ padding: '10px', maxWidth: '140px' }} onClick={e => e.stopPropagation()}>
                  {editId === t.id ? (
                    <>
                      <button onClick={() => handleSave(t.id)} style={{
                        backgroundColor: '#2ecc71',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginRight: '6px',
                        maxWidth: '60px'
                      }}>💾</button>
                      <button onClick={() => handleCancel(t.id)} style={{
                        backgroundColor: '#95a5a6',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        maxWidth: '60px'
                      }}>❌</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(t)} style={{
                        backgroundColor: '#3498db',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginRight: '6px',
                        maxWidth: '60px'
                      }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} style={{
                        backgroundColor: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        maxWidth: '60px'
                      }}>🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ✅ 미리보기 모달 */}
      {showModal && previewUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            textAlign: 'center'
          }}>
            <TransformWrapper>
              <TransformComponent>
                <img
                  src={previewUrl}
                  alt="영수증 미리보기"
                  style={{ maxWidth: '80vw', maxHeight: '70vh' }}
                />
              </TransformComponent>
            </TransformWrapper>
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: '#bbb',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 페이지네이션 */}
      {renderPagination()}
    </div>
  )
}
