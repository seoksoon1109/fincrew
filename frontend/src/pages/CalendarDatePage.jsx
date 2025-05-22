// ✅ CalendarDatePage with 필터, 정렬, 페이징 기능 포함 + 초기화 버튼 위치 개선 + access token 적용
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authFetch } from "../utils/authFetch"; //

export default function CalendarDatePage() {
  const { date } = useParams()
  const [transactions, setTransactions] = useState([])
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', amount: '', receipt: null })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const access = localStorage.getItem('access')

  useEffect(() => {
    if (!access) return
    authFetch('http://localhost:8000/api/transactions/', {
    })
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(t => t.date === date)
        setTransactions(filtered)
      })
      .catch(err => console.error('❌ 날짜별 거래 불러오기 실패:', err))
  }, [date, access])

  const handleEditClick = (t) => {
    setEditId(t.id)
    setEditForm({ title: t.title, amount: String(t.amount), receipt: null })
  }

  const handleCancel = () => {
    setEditId(null)
    setEditForm({ title: '', amount: '', receipt: null })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (id) => {
    const formData = new FormData()
    formData.append('title', editForm.title)
    formData.append('amount', editForm.amount)
    if (editForm.receipt) {
      formData.append('receipt', editForm.receipt)
    }

    try {
      const res = await authFetch(`http://localhost:8000/api/transactions/${id}/with-receipt/`, {
        method: 'PUT',
        body: formData,
      })

      if (!res.ok) throw new Error('저장 실패')
      const updated = await res.json()
      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updated } : t)))
      setEditId(null)
      setEditForm({ title: '', amount: '', receipt: null })
    } catch (err) {
      console.error('❌ 저장 실패:', err)
      alert('저장에 실패했습니다.')
    }
  }

  const authFetchReceiptPreview = (transactionId) => {
    authFetch(`http://localhost:8000/api/receipts/preview/${transactionId}/`, {
    })
      .then(res => res.json())
      .then(data => {
        if (data.image_url) {
          setPreviewUrl(`http://localhost:8000${data.image_url}`)
          setShowModal(true)
        }
      })
      .catch(err => {
        console.error('❌ 미리보기 오류:', err)
        alert('영수증을 불러오지 못했습니다.')
      })
  }

  const handleDeleteReceipt = (transactionId) => {
    authFetch(`http://localhost:8000/api/transactions/${transactionId}/with-receipt/`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(() => {
        alert('✅ 영수증이 삭제되었습니다.')
        setTransactions(prev =>
          prev.map(t => t.id === transactionId ? { ...t, has_receipt: false } : t)
        )
      })
      .catch(err => {
        console.error('❌ 영수증 삭제 실패:', err)
        alert('삭제 중 오류가 발생했습니다.')
      })
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleResetFilters = () => {
    setFilter('all')
    setMinAmount('')
    setMaxAmount('')
  }

  const filtered = transactions.filter(t => {
    const titleMatch = filter === 'all' || t.title === filter
    const amountMatch = (!minAmount || t.amount >= Number(minAmount)) && (!maxAmount || t.amount <= Number(maxAmount))
    return titleMatch && amountMatch
  })

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    return sortField === 'amount'
      ? (sortOrder === 'asc' ? valA - valB : valB - valA)
      : (sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA))
  })

  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div style={{ width: '100%', margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2>📅 {date} 거래 내역</h2>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', paddingLeft: '5%' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="all">전체</option>
          {[...new Set(transactions.map(t => t.title))].map(title => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>

        <input type="number" placeholder="최소 금액" value={minAmount} onChange={e => setMinAmount(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100px' }} />
        <input type="number" placeholder="최대 금액" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100px' }} />
        <button onClick={handleResetFilters} style={{ backgroundColor: '#ddd', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>초기화</button>
      </div>

      {paginated.length === 0 ? (
        <p style={{ textAlign: 'center' }}>해당 날짜의 거래 내역이 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '90%',
            margin: '0 auto',
            borderCollapse: 'collapse',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                {[{ label: '날짜', key: 'date' }, { label: '구분', key: 'title' }, { label: '금액', key: 'amount' }, { label: '내용' }, { label: '영수증' }, { label: '관리' }].map((header, idx) => (
                  <th
                    key={idx}
                    onClick={header.key ? () => handleSort(header.key) : undefined}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: '600', color: '#333', cursor: header.key ? 'pointer' : 'default' }}
                  >
                    {header.label} {sortField === header.key && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #eee', textAlign: 'center', backgroundColor: '#fff' }}>
                  <td style={{ padding: '12px' }}>{t.date}</td>
                  <td style={{ padding: '12px' }}>
                    {editId === t.id ? (
                      <input name="title" value={editForm.title} onChange={handleChange} />
                    ) : t.title}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {editId === t.id ? (
                      <input name="amount" type="number" value={editForm.amount} onChange={handleChange} />
                    ) : parseInt(t.amount).toLocaleString() + '원'}
                  </td>
                  <td style={{ padding: '12px' }}>{t.note || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    {t.type === 'income' ? (
                      '—'
                    ) : editId === t.id ? (
                      <>
                        {t.has_receipt && (
                          <>
                            <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#3498db' }} onClick={() => authFetchReceiptPreview(t.id)}>⭕ 영수증 보기</span><br />
                            <button onClick={() => handleDeleteReceipt(t.id)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginTop: '4px' }}>🗑️ 삭제</button>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={e => setEditForm(prev => ({ ...prev, receipt: e.target.files[0] }))} style={{ marginTop: '4px' }} />
                      </>
                    ) : t.has_receipt ? (
                      <span style={{ cursor: 'pointer', color: '#3498db' }} onClick={() => authFetchReceiptPreview(t.id)}>⭕ 있음</span>
                    ) : '❌ 없음'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {editId === t.id ? (
                      <>
                        <button onClick={() => handleSave(t.id)} style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>💾 저장</button>
                        <button onClick={handleCancel} style={{ backgroundColor: '#95a5a6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>❌ 취소</button>
                      </>
                    ) : (
                      <button onClick={() => handleEditClick(t)} style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>✏️ 수정</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && previewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', maxHeight: '90%', maxWidth: '90%' }}>
            <img src={previewUrl} alt="영수증" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            <button onClick={() => setShowModal(false)} style={{ marginTop: '10px', padding: '6px 12px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}