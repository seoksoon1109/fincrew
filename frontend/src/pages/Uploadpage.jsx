import { useState } from 'react'
import { authFetch } from "../utils/authFetch"; //

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!file) {
      alert('파일을 선택하세요.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bank', 'kakaobank')  // bank 구분 (확장 가능)

    authFetch('http://localhost:8000/upload/', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || '업로드 완료')
      })
      .catch(err => {
        console.error('❌ 업로드 실패:', err)
        setMessage('업로드에 실패했습니다.')
      })
  }

  return (
    <div>
      <h2>📤 엑셀 업로드</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files[0])} />
        <button type="submit">업로드</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}
