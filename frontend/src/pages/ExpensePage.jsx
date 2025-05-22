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
  const [filter, setFilter] = useState('all')
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const itemsPerPage = 10
  const controlButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#2e86de',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }

  const access = localStorage.getItem('access')

  useEffect(() => {
    if (!access) return;
    authFetch('http://localhost:8000/api/transactions/', {
    })
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
      imageFile: null // ✅ 누락된 필드 추가
    }
    setTransactions(prev => [newTransaction, ...prev])
    setEditId(newTransaction.id)
    setEditForm({ title: '', amount: '', note: '', date: today, imageFile: null })
  }

  const authFetchReceiptPreview = (transactionId) => {
    authFetch(`http://localhost:8000/api/receipts/preview/${transactionId}/`, {
    })
      .then(res => res.json())
      .then(data => {
        console.log("🖼️ 미리보기 응답:", data); // 👈 이거 꼭 추가
        if (data.image_url) {
          setPreviewUrl(`http://localhost:8000${data.image_url}`);
          setShowModal(true);
        } else {
          alert('❌ 이미지 경로가 없습니다.');
        }
      })
      .catch(() => alert('영수증 미리보기 실패'))
  }

  const handleDeleteReceipt = (transactionId) => {
    authFetch(`http://localhost:8000/api/transactions/${transactionId}/with-receipt/`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(() => {
        alert('✅ 영수증 삭제됨')
        setTransactions(prev =>
          prev.map(t => t.id === transactionId ? { ...t, has_receipt: false } : t)
        )
        setReceiptWasDeleted(true)
      })
      .catch(() => alert('영수증 삭제 실패'))
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.title === filter
    const withinDate = (!minDate || t.date >= minDate) && (!maxDate || t.date <= maxDate)
    const withinAmount = (!minAmount || t.amount >= Number(minAmount)) && (!maxAmount || t.amount <= Number(maxAmount))
    return matchesFilter && withinDate && withinAmount
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (sortField === 'amount') return sortOrder === 'asc' ? valA - valB : valB - valA
    return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))
  })

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleResetFilters = () => {
    setFilter('all')
    setMinDate('')
    setMaxDate('')
    setMinAmount('')
    setMaxAmount('')
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
      <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>➖ 지출 내역</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', padding: '0' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="all">전체</option>
          {[...new Set(transactions.map(t => t.title))].map(title => (
            <option key={title} value={title}>{title}</option>
          ))}
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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              {[{ label: '날짜', key: 'date' }, { label: '거래구분', key: 'title' }, { label: '내용', key: 'note' }, { label: '금액', key: 'amount' }, { label: '영수증' }, { label: '관리' }].map((header, idx) => (
                <th
                  key={idx}
                  onClick={header.key ? () => handleSort(header.key) : undefined}
                  style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', fontWeight: '600', color: '#333', cursor: header.key ? 'pointer' : 'default' }}
                >
                  {header.label} {sortField === header.key && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="date" type="date" value={editForm.date} onChange={handleChange} /> : t.date}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="title" value={editForm.title} onChange={handleChange} /> : t.title}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="note" value={editForm.note} onChange={handleChange} /> : t.note}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="amount" type="number" value={editForm.amount} onChange={handleChange} /> : parseInt(t.amount).toLocaleString() + '원'}</td>
                <td style={{ padding: '12px' }}>
                  {editId === t.id ? (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setEditForm({ ...editForm, imageFile: e.target.files[0] })}
                      />
                      {t.has_receipt && (
                        <button
                          onClick={() => handleDeleteReceipt(t.id)}
                          style={{ marginTop: '6px', backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          🗑️ 삭제
                        </button>
                      )}
                    </>
                  ) : (
                    t.has_receipt ? (
                      <button
                        onClick={() => authFetchReceiptPreview(t.id)}
                        style={{ backgroundColor: '#1abc9c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        보기 👁️
                      </button>
                    ) : '❌ 없음'
                  )}
                </td>

                <td style={{ padding: '12px' }}>
                  {editId === t.id ? (
                    <>
                      <button onClick={() => handleSave(t.id)} style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>💾 저장</button>
                      <button onClick={() => handleCancel(t.id)} style={{ backgroundColor: '#95a5a6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>❌ 취소</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(t)} style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ backgroundColor: '#e0e0e0', padding: '6px 12px', borderRadius: '6px', marginRight: '4px', border: 'none' }}>⬅ 이전</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => setCurrentPage(num)}
            style={{ backgroundColor: currentPage === num ? '#2e86de' : '#f0f0f0', color: currentPage === num ? '#fff' : '#000', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px', margin: '0 4px', border: 'none', cursor: 'pointer' }}
          >
            {num}
          </button>
        ))}
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ backgroundColor: '#e0e0e0', padding: '6px 12px', borderRadius: '6px', marginLeft: '4px', border: 'none' }}>다음 ➡</button>
      </div>

      {showModal && previewUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            textAlign: 'center'
          }}>
            <TransformWrapper>
              <TransformComponent>
                <img
                  src={previewUrl}
                  alt="영수증 미리보기"
                  style={{ maxWidth: '80vw', maxHeight: '70vh', userSelect: 'none' }}
                />
              </TransformComponent>
            </TransformWrapper>

            {/* 닫기 버튼 */}
            <div style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '8px 16px',
                backgroundColor: '#bbb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
