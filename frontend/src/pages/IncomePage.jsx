import { useEffect, useState } from 'react'
import { authFetch } from "../utils/authFetch";

export default function IncomePage() {
  const [transactions, setTransactions] = useState([])
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', amount: '', note: '', date: '' })
  const [filter, setFilter] = useState('all')
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    authFetch('/api/transactions/')
      .then(res => res.json())
      .then(data => {
        const income = data.filter(t => t.type === 'income')
        setTransactions(income)
      })
      .catch(err => console.error('❌ 데이터 불러오기 실패:', err))
  }, [])

  const handleDelete = (id) => {
    authFetch(`/api/transactions/${id}/`, { method: 'DELETE' })
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
    setEditForm({ title: t.title, amount: String(t.amount), note: t.note, date: t.date })
  }

  const handleSave = (id) => {
    const { title, amount, note, date } = editForm

    if (!title.trim() || !note.trim() || !amount || !date) {
      alert('날짜, 거래구분, 금액, 내용은 모두 입력해야 합니다.')
      return
    }

    const parsedAmount = parseInt(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('금액은 0보다 큰 숫자여야 합니다.')
      return
    }

    const payload = {
      type: 'income',
      title,
      amount: parsedAmount,
      note,
      date
    }

    const isNew = transactions.find(t => t.id === id)?.isNew

    const request = isNew
      ? authFetch('/api/transactions/', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      : authFetch(`/api/transactions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

    request
      .then(res => res.ok ? res.json() : Promise.reject('저장 실패'))
      .then(data => {
        if (isNew) {
          setTransactions(prev => [data, ...prev.filter(t => t.id !== id)])
        } else {
          setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...data } : t)))
        }
        setEditId(null)
      })
      .catch(err => {
        console.error('❌ 저장 실패:', err)
        alert('저장에 실패했습니다.')
      })
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

  const handleAddIncome = () => {
    if (transactions.some(t => t.isNew)) return
    const today = new Date().toISOString().slice(0, 10)
    const newTransaction = { id: Date.now(), type: 'income', title: '', amount: '', note: '', date: today, isNew: true }
    setTransactions(prev => [newTransaction, ...prev])
    setEditId(newTransaction.id)
    setEditForm({ title: '', amount: '', note: '', date: today })
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
    setMinDate('')
    setMaxDate('')
    setMinAmount('')
    setMaxAmount('')
  }

  const filtered = transactions.filter(t => {
    const matchTitle = filter === 'all' || t.title === filter
    const inDate = (!minDate || t.date >= minDate) && (!maxDate || t.date <= maxDate)
    const inAmount = (!minAmount || t.amount >= Number(minAmount)) && (!maxAmount || t.amount <= Number(maxAmount))
    return matchTitle && inDate && inAmount
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
    <div style={{ width: '80%', margin: '0 auto', padding: 0 }}>
      <h1 style={{ textAlign: 'center', padding: '2rem 0' }}>➕ 수입 내역</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
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
          <button onClick={handleAddIncome} disabled={transactions.some(t => t.isNew)} style={{ backgroundColor: '#2e86de', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ 수입 추가</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              {[{ label: '날짜', key: 'date' }, { label: '거래구분', key: 'title' }, { label: '금액', key: 'amount' }, { label: '내용' }, { label: '관리' }].map((header, idx) => (
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
            {paginated.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="date" type="date" value={editForm.date} onChange={handleChange} /> : t.date}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="title" value={editForm.title} onChange={handleChange} /> : t.title}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="amount" type="number" value={editForm.amount} onChange={handleChange} /> : parseInt(t.amount).toLocaleString() + '원'}</td>
                <td style={{ padding: '12px' }}>{editId === t.id ? <input name="note" value={editForm.note} onChange={handleChange} /> : t.note}</td>
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
    </div>
  )
}