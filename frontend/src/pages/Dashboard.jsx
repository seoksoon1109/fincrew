import { useEffect, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { authFetch } from "../utils/authFetch";
import './Modal.css'

export default function DashboardPage() {
  const [selectedBank, setSelectedBank] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [receiptRegisteredRatio, setReceiptRegisteredRatio] = useState(0);
  const [missingReceiptCount, setMissingReceiptCount] = useState(0);
  const [members, setMembers] = useState([]);
  const [duesPaidRatio, setDuesPaidRatio] = useState(0);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [memberForm, setMemberForm] = useState({
    name: '', college: '', department: '', student_id: '', grade: '', phone_number: '', member_type: 'undergrad'
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDuesModal, setShowDuesModal] = useState(false);
  const [duesCheckForm, setDuesCheckForm] = useState({ start_date: '', end_date: '', amount: '' });

  const COLORS = ['#00C49F', '#FF8042'];
  const RECEIPT_COLORS = ['#8884d8', '#ffc658'];
  const DUES_COLORS = ['#82ca9d', '#ff9999'];

  useEffect(() => {
    authFetch('/api/transactions/')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('잘못된 데이터 형식');
        setTransactions(data);
        const incomeSum = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenseItems = data.filter(t => t.type === 'expense');
        const expenseSum = expenseItems.reduce((sum, t) => sum + Number(t.amount), 0);
        const registeredCount = expenseItems.filter(t => t.has_receipt).length;
        const registeredRatio = expenseItems.length > 0 ? (registeredCount / expenseItems.length) * 100 : 0;

        setTotalIncome(incomeSum);
        setTotalExpense(expenseSum);
        setMissingReceiptCount(expenseItems.length - registeredCount);
        setReceiptRegisteredRatio(registeredRatio);
      })
      .catch(err => console.error('❌ 거래내역 불러오기 실패:', err));
  }, []);

  useEffect(() => {
    authFetch('/api/members/')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('잘못된 데이터 형식');
        setMembers(data);
        const paidCount = data.filter(m => m.has_paid).length;
        const paidRatio = data.length > 0 ? (paidCount / data.length) * 100 : 0;
        setDuesPaidRatio(paidRatio);
      })
      .catch(err => console.error('❌ 동아리원 불러오기 실패:', err));
  }, []);

  const handleExcelUpload = useCallback((e) => {
    e.preventDefault();
    if (!excelFile || !selectedBank) {
      alert("은행과 파일을 모두 선택하세요.");
      return;
    }

    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('bank', selectedBank);

    authFetch('/upload/', {
      method: 'POST',
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || '업로드 실패');
        }
        return res.json();
      })
      .then(data => {
        const msg = data.message || `✅ 업로드 완료\n총 ${data.uploaded}건 등록, ${data.skipped}건 중복`;
        alert(msg);
        setShowUploadModal(false);
      })
      .catch(err => {
        console.error('❌ 업로드 실패:', err);
        setUploadMessage('업로드에 실패했습니다.');
      });
  }, [excelFile, selectedBank]);

  const handleMemberSubmit = useCallback(() => {
    authFetch('/api/members/', {
      method: 'POST',
      body: JSON.stringify(memberForm)
    })
      .then(res => {
        if (res.ok) alert('✅ 등록 성공');
        else throw new Error('등록 실패');
        setShowMemberModal(false);
      })
      .catch(err => alert('❌ 등록 실패: ' + err));
  }, [memberForm]);

  const handleDuesCheck = () => {
    const { start_date, end_date, amount } = duesCheckForm;
    authFetch('/api/check-membership-payment/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date, end_date, amount: parseInt(amount, 10) })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert('❌ 서버 오류: ' + data.error);
          return;
        }
        const ignored = data.ignored_inputs || [];
        alert(`✅ 회비 확인 완료\n- 기존 회원 매칭: ${data.matched_members}\n- 신규 추가: ${data.new_members_added}\n- 무시된 항목: ${ignored.length}`);
        console.log('무시된 항목:', ignored);
        setShowDuesModal(false);
      })
      .catch(err => alert('❌ 회비 확인 실패: ' + err));
  }

  const remainingBudget = totalIncome - totalExpense

  return (
    <div className="dashboard">
      <h1 className="title">🏠 대시보드</h1>

      <div className="card unified-dashboard-card">
        <div className="summary-cards">
          <div className="card">
            <div className="amount">💰 {totalIncome.toLocaleString()}원</div>
            <div className="label">수입</div>
          </div>
          <div className="card">
            <div className="amount">💸 {totalExpense.toLocaleString()}원</div>
            <div className="label">지출</div>
          </div>
          <div className="card">
            <div className={`amount ${remainingBudget < 0 ? 'negative' : ''}`}>📈 {remainingBudget.toLocaleString()}원</div>
            <div className="label">남은 예산</div>
          </div>
          <div className="card">
            <div className="amount">🧾 {receiptRegisteredRatio.toFixed(1)}%</div>
            <div className="label">영수증 등록 비율</div>
          </div>
          <div className="card">
            <div className="amount">💳 {duesPaidRatio.toFixed(1)}%</div>
            <div className="label">회비 납부율</div>
          </div>
        </div>

        <div className="chart-section center">
          <div className="card chart-box">
            <h2>수입 / 지출 비율</h2>
            <PieChart width={260} height={260}>
              <Pie data={[
                { name: '수입', value: parseFloat(totalIncome.toFixed(1)) },
                { name: '지출', value: parseFloat(totalExpense.toFixed(1)) }
              ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>

          <div className="card chart-box">
            <h2>영수증 등록 비율</h2>
            <PieChart width={260} height={260}>
              <Pie data={[
                { name: '등록됨', value: parseFloat(receiptRegisteredRatio.toFixed(1)) },
                { name: '미등록', value: parseFloat((100 - receiptRegisteredRatio).toFixed(1)) }
              ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                {RECEIPT_COLORS.map((color, index) => <Cell key={`cell-r-${index}`} fill={color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>

          <div className="card chart-box">
            <h2>회비 납부율</h2>
            <PieChart width={260} height={260}>
              <Pie data={[
                { name: '납부 완료', value: parseFloat(duesPaidRatio.toFixed(1)) },
                { name: '미납', value: parseFloat((100 - duesPaidRatio).toFixed(1)) }
              ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                {DUES_COLORS.map((color, index) => <Cell key={`cell-d-${index}`} fill={color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>

        <div className="button-group inside-card">
          <button className="action-button primary" onClick={() => setShowUploadModal(true)}>📁 거래내역 업로드</button>
          <button className="action-button secondary" onClick={() => setShowMemberModal(true)}>👤 동아리원 추가</button>
          <button className="action-button secondary" onClick={() => setShowDuesModal(true)}>💳 회비 납부 확인</button>
        </div>
      </div>
      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>📁 거래내역 엑셀 업로드</h3>
            <form onSubmit={handleExcelUpload}>
              <label>
                은행 선택:
                <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} required>
                  <option value="">-- 은행을 선택하세요 --</option>
                  <option value="kakaobank">카카오뱅크</option>
                  <option value="tossbank">토스뱅크</option>
                </select>
              </label>
              <input type="file" accept=".xlsx" onChange={e => setExcelFile(e.target.files[0])} />
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="primary">업로드</button>
                <button type="button" className="secondary" onClick={() => setShowUploadModal(false)}>닫기</button>
              </div>
            </form>
            {uploadMessage && <p>{uploadMessage}</p>}
          </div>
        </div>
      )}
      {/* 회비 납부 확인 모달 */}
      {showDuesModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>💳 회비 납부 자동 확인</h3>
            <input type="date" placeholder="시작일" onChange={e => setDuesCheckForm({ ...duesCheckForm, start_date: e.target.value })} /><br />
            <input type="date" placeholder="종료일" onChange={e => setDuesCheckForm({ ...duesCheckForm, end_date: e.target.value })} /><br />
            <input type="number" placeholder="회비 금액" onChange={e => setDuesCheckForm({ ...duesCheckForm, amount: e.target.value })} /><br />
            <div style={{ marginTop: '1rem' }}>
              <button className="primary" onClick={handleDuesCheck}>확인</button>
              <button className="secondary" onClick={() => setShowDuesModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

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
            <input placeholder="전화번호" onChange={e => setMemberForm({ ...memberForm, phone_number: e.target.value })} /><br />
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