import { useEffect, useState } from 'react'
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { useNavigate } from 'react-router-dom'
import { authFetch } from "../utils/authFetch"; //

export default function CalendarPage() {
  const [transactions, setTransactions] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const access = localStorage.getItem('access');
    if (!access) return;

    authFetch('http://localhost:8000/api/transactions/', {
    })
      .then(res => {
        if (!res.ok) throw new Error('인증 실패');
        return res.json();
      })
      .then(data => setTransactions(data))
      .catch(err => {
        console.error('❌ 데이터 불러오기 실패:', err)
      });
  }, []);

  // 날짜별로 수입과 지출을 합산
  const aggregatedByDate = transactions.reduce((acc, t) => {
    const date = t.date
    if (!acc[date]) {
      acc[date] = { income: 0, expense: 0 }
    }
    if (t.type === 'income') {
      acc[date].income += parseInt(t.amount)
    } else if (t.type === 'expense') {
      acc[date].expense += parseInt(t.amount)
    }
    return acc
  }, {})

  // 날짜별 수입/지출이 있는 경우만 이벤트로 생성
  const calendarEvents = Object.entries(aggregatedByDate).flatMap(([date, { income, expense }]) => {
    const events = []
    if (income > 0) {
      events.push({
        title: `+ ${income.toLocaleString()}원`,
        date,
        color: '#60a5fa'
      })
    }
    if (expense > 0) {
      events.push({
        title: `- ${expense.toLocaleString()}원`,
        date,
        color: '#f87171'
      })
    }
    return events
  })

  const handleDateClick = (arg) => {
    navigate(`/calendar/${arg.dateStr}`)
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', padding: '0rem' }}>
      <h1>📅 거래 달력</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        dateClick={handleDateClick}
        height="auto"
      />
    </div>
  )
}
