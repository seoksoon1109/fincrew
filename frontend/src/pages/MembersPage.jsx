import { useEffect, useState } from 'react'
import { authFetch } from "../utils/authFetch"
import './MemberPage.css'

export default function MemberPage() {
  const [members, setMembers] = useState([])
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState({
    name: '', college: '', department: '', student_id: '', grade: '', phone_number: '', member_type: 'undergrad'
  })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '', college: '', department: '', student_id: '', grade: '', phone_number: '', member_type: 'undergrad', joined_at: '', has_paid: false
  })
  const [sortKey, setSortKey] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [filters, setFilters] = useState({ name: '', college: '', department: '', grade: '', member_type: '', has_paid: '', joined_at: '' })

  const access = localStorage.getItem('access')

  const memberTypeDisplay = { undergrad: '재학생', leave: '휴학생', grad: '대학원생' }

  const formatPhoneNumber = (value) => {
    if (!value) return ''
    const numbersOnly = value.replace(/\D/g, '').slice(0, 11)
    if (numbersOnly.length < 4) return numbersOnly
    if (numbersOnly.length < 8) return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3)}`
    return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3, 7)}-${numbersOnly.slice(7)}`
  }

  useEffect(() => {
    if (!access) return
    authFetch('http://localhost:8000/api/members/')
      .then(res => {
        if (!res.ok) throw new Error('인증 실패')
        return res.json()
      })
      .then(data => setMembers(data))
      .catch(err => console.error('❌ 동아리원 데이터 불러오기 실패:', err))
  }, [access])

  const handleEdit = (member) => {
    console.log('✏️ 수정 모드 진입:', member.id)
    setEditId(member.id)
    setEditForm({
      name: member.name || '',
      college: member.college || '',
      department: member.department || '',
      student_id: member.student_id || '',
      grade: member.grade || '',
      phone_number: member.phone_number || '',
      member_type: member.member_type || 'undergrad',
      joined_at: member.joined_at || '',
      has_paid: member.has_paid ?? false
    })
  }

  const handleCancel = () => {
    setEditId(null)
  }

  const handleSave = (id) => {
    const { name, student_id, phone_number, ...rest } = editForm
    if (!name || !student_id) {
      alert('이름과 학번은 필수입니다.')
      return
    }

    const cleanData = {
      name,
      student_id,
      phone_number: phone_number?.replace(/\D/g, '') || null,
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      )
    }

    authFetch(`http://localhost:8000/api/members/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(cleanData)
    })
      .then(res => {
        if (!res.ok) throw new Error('수정 실패')
        return res.json()
      })
      .then(data => {
        alert('✅ 수정 완료')
        setMembers(prev => prev.map(m => m.id === id ? data : m))
        setEditId(null)
      })
      .catch(err => {
        console.error('❌ 수정 실패:', err)
        alert('수정에 실패했습니다.')
      })
  }

  const handleDelete = (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    authFetch(`http://localhost:8000/api/members/${id}/`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('삭제 실패')
        setMembers(prev => prev.filter(m => m.id !== id))
      })
      .catch(err => {
        console.error('❌ 삭제 실패:', err)
        alert('삭제에 실패했습니다.')
      })
  }

  const handleMemberSubmit = () => {
    const { name, student_id, phone_number } = memberForm
    if (!name || !student_id) {
      alert('이름과 학번은 필수입니다.')
      return
    }

    authFetch('http://localhost:8000/api/members/', {
      method: 'POST',
      body: JSON.stringify({
        ...memberForm,
        phone_number: phone_number?.replace(/\D/g, '') || null
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('등록 실패')
        return res.json()
      })
      .then(data => {
        alert('✅ 등록 완료')
        setMembers(prev => [data, ...prev])
        setShowMemberModal(false)
        setMemberForm({ name: '', college: '', department: '', student_id: '', grade: '', phone_number: '', member_type: 'undergrad' })
      })
      .catch(err => {
        console.error('❌ 등록 실패:', err)
        alert('등록에 실패했습니다.')
      })
  }

  const filteredMembers = members.filter(m => (
    (!filters.name || m.name.includes(filters.name)) &&
    (!filters.college || m.college === filters.college) &&
    (!filters.department || m.department === filters.department) &&
    (!filters.grade || String(m.grade) === filters.grade) &&
    (!filters.member_type || m.member_type === filters.member_type) &&
    (filters.has_paid === '' || String(m.has_paid) === filters.has_paid) &&
    (!filters.joined_at || m.joined_at?.slice(0, 10) === filters.joined_at)
  ))

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (!sortKey) return 0
    const valA = a[sortKey]
    const valB = b[sortKey]
    if (typeof valA === 'number') return sortAsc ? valA - valB : valB - valA
    return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))
  })

  const uniqueColleges = [...new Set(members.map(m => m.college).filter(Boolean))]
  const uniqueDepartments = [...new Set(members.map(m => m.department).filter(Boolean))]
  const uniqueGrades = [...new Set(members.map(m => String(m.grade)).filter(Boolean))]

  const displayValue = (val) => (val === null || val === undefined || val === '') ? '-' : val


  return (
    <div style={{ width: '80%', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1>📋 동아리 명부</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <input placeholder="이름" value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />

        <select value={filters.college} onChange={e => setFilters({ ...filters, college: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="">전체 단과대</option>
          {uniqueColleges.map(col => <option key={col} value={col}>{col}</option>)}
        </select>

        <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="">전체 학과</option>
          {uniqueDepartments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
        </select>

        <select value={filters.grade} onChange={e => setFilters({ ...filters, grade: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100px' }}>
          <option value="">전체 학년</option>
          {uniqueGrades.map(gr => <option key={gr} value={gr}>{gr}</option>)}
        </select>

        <select value={filters.member_type} onChange={e => setFilters({ ...filters, member_type: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="">전체 구분</option>
          <option value="undergrad">재학생</option>
          <option value="leave">휴학생</option>
          <option value="grad">대학원생</option>
        </select>

        <select value={filters.has_paid} onChange={e => setFilters({ ...filters, has_paid: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="">전체 납부여부</option>
          <option value="true">✅ 납부</option>
          <option value="false">❌ 미납</option>
        </select>

        <input type="date" value={filters.joined_at} onChange={e => setFilters({ ...filters, joined_at: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }} />

        <button onClick={() => setFilters({ name: '', college: '', department: '', grade: '', member_type: '', has_paid: '', joined_at: '' })} style={{ backgroundColor: '#ddd', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>초기화</button>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowMemberModal(true)}
            style={{ backgroundColor: '#2e86de', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ➕ 동아리원 추가
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              {['이름', '단과대', '학과', '학번', '학년', '전화번호', '구분', '납부여부', '등록일', '관리'].map((header, idx) => (
                <th key={idx} style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', fontWeight: '600', color: '#333' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map(m => {
              const isEditing = Number(editId) === Number(m.id)
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                  <td>{isEditing
                    ? <input className="table-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    : displayValue(m.name)}</td>
                  <td>{isEditing
                    ? <input className="table-input" value={editForm.college} onChange={e => setEditForm({ ...editForm, college: e.target.value })} />
                    : displayValue(m.college)}</td>
                  <td>{isEditing
                    ? <input className="table-input" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                    : displayValue(m.department)}</td>
                  <td>{displayValue(m.student_id)}</td>
                  <td>{isEditing
                    ? <input type="number" className="table-input" value={editForm.grade} onChange={e => setEditForm({ ...editForm, grade: parseInt(e.target.value || 0) })} />
                    : displayValue(m.grade)}</td>
                  <td>{isEditing
                    ? <input className="table-input" value={formatPhoneNumber(editForm.phone_number)} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
                    : displayValue(formatPhoneNumber(m.phone_number))}</td>
                  <td>{isEditing
                    ? <select className="table-select" value={editForm.member_type} onChange={e => setEditForm({ ...editForm, member_type: e.target.value })}>
                      <option value="undergrad">재학생</option>
                      <option value="leave">휴학생</option>
                      <option value="grad">대학원생</option>
                    </select>
                    : displayValue(memberTypeDisplay[m.member_type])}</td>
                  <td>{isEditing
                    ? <select className="table-select" value={editForm.has_paid ? 'true' : 'false'} onChange={e => setEditForm({ ...editForm, has_paid: e.target.value === 'true' })}>
                      <option value="true">✅ 납부</option>
                      <option value="false">❌ 미납</option>
                    </select>
                    : m.has_paid ? '✅ 납부' : '❌ 미납'}</td>
                  <td>{isEditing
                    ? <input type="date" className="table-input" value={editForm.joined_at} onChange={e => setEditForm({ ...editForm, joined_at: e.target.value })} />
                    : displayValue(m.joined_at)}</td>
                  <td>{isEditing
                    ? <>
                      <button onClick={() => handleSave(m.id)} style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>💾 저장</button>
                      <button onClick={handleCancel} style={{ backgroundColor: '#95a5a6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>❌ 취소</button>
                    </>
                    : <>
                      <button onClick={() => handleEdit(m)} style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px' }}>✏️</button>
                      <button onClick={() => handleDelete(m.id)} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                    </>
                  }</td>
                </tr>
              )
            })}
          </tbody>

        </table>
      </div>

      {/* 동아리원 추가 모달 */}
      {showMemberModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>👤 동아리원 추가</h3>
            <input placeholder="이름" onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} /><br />
            <input placeholder="단과대" onChange={e => setMemberForm({ ...memberForm, college: e.target.value })} /><br />
            <input placeholder="학과" onChange={e => setMemberForm({ ...memberForm, department: e.target.value })} /><br />
            <input placeholder="학번" onChange={e => setMemberForm({ ...memberForm, student_id: e.target.value })} /><br />
            <input placeholder="학년" type="number" onChange={e => {
              const val = e.target.value
              setMemberForm({ ...memberForm, grade: val === '' ? '' : parseInt(val, 10) })
            }} /><br />
            <input
              placeholder="전화번호"
              value={formatPhoneNumber(memberForm.phone_number)}
              onChange={e =>
                setMemberForm({ ...memberForm, phone_number: e.target.value.replace(/\D/g, '').slice(0, 11) })
              }
            /><br />
            <select onChange={e => setMemberForm({ ...memberForm, member_type: e.target.value })}>
              <option value="undergrad">재학생</option>
              <option value="leave">휴학생</option>
              <option value="grad">대학원생</option>
            </select><br />
            <div style={{ marginTop: '1rem' }}>
              <button className="primary" onClick={handleMemberSubmit}>등록</button>
              <button className="secondary" onClick={() => setShowMemberModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
