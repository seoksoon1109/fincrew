// AuditorDashboard.jsx
import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { authFetch } from "../utils/authFetch"
import './Modal.css'

export default function AuditorDashboard() {
    const [auditedClubs, setAuditedClubs] = useState(0);
    const [flaggedTransactions, setFlaggedTransactions] = useState(0);
    const [avgExpenseRatio, setAvgExpenseRatio] = useState(0);
    const [avgReceiptRatio, setAvgReceiptRatio] = useState(0);
    const [auditCompletionRate, setAuditCompletionRate] = useState(0);

    const EXPENSE_COLORS = ['#00C49F', '#FF8042'];
    const RECEIPT_COLORS = ['#8884d8', '#ffc658'];
    const COMPLETION_COLORS = ['#82ca9d', '#ff9999'];

    useEffect(() => {
        authFetch('/api/auditor/dashboard-summary/')
            .then(res => res.json())
            .then(data => {
                setAuditedClubs(data.audited_clubs_count);
                setFlaggedTransactions(data.flagged_transaction_count);
                setAvgExpenseRatio(data.average_expense_ratio);
                setAvgReceiptRatio(data.average_receipt_ratio);
                setAuditCompletionRate(data.audit_completion_rate);
            })
            .catch(err => console.error('Error loading auditor summary:', err));
    }, []);

    return (
        <div className="dashboard">
            <h1 className="title">📋 감사 대시보드</h1>
            <div className="card unified-dashboard-card">
                <div className="summary-cards">
                    <div className="card">
                        <div className="amount">📁 {auditedClubs}</div>
                        <div className="label">감사 대상 동아리 수</div>
                    </div>
                    <div className="card">
                        <div className="amount">🔍 {flaggedTransactions}</div>
                        <div className="label">확인 필요한 거래 수</div>
                    </div>
                    <div className="card">
                        <div className="amount">📈 {avgExpenseRatio.toFixed(1)}%</div>
                        <div className="label">평균 지출 비율</div>
                    </div>
                    <div className="card">
                        <div className="amount">📄 {avgReceiptRatio.toFixed(1)}%</div>
                        <div className="label">영수증 등록률 평균</div>
                    </div>
                    <div className="card">
                        <div className="amount">✅ {auditCompletionRate.toFixed(1)}%</div>
                        <div className="label">감사 완료율</div>
                    </div>
                </div>

                <div className="chart-section center">
                    <div className="card chart-box">
                        <h2>평균 지출 비율</h2>
                        <PieChart width={260} height={260}>
                            <Pie data={[
                                { name: '지출', value: parseFloat(avgExpenseRatio.toFixed(1)) },
                                { name: '기타', value: parseFloat((100 - avgExpenseRatio).toFixed(1)) }
                            ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                                {EXPENSE_COLORS.map((color, index) => <Cell key={`exp-${index}`} fill={color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </div>

                    <div className="card chart-box">
                        <h2>영수증 등록률 평균</h2>
                        <PieChart width={260} height={260}>
                            <Pie data={[
                                { name: '등록됨', value: parseFloat(avgReceiptRatio.toFixed(1)) },
                                { name: '미등록', value: parseFloat((100 - avgReceiptRatio).toFixed(1)) }
                            ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                                {RECEIPT_COLORS.map((color, index) => <Cell key={`rec-${index}`} fill={color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </div>

                    <div className="card chart-box">
                        <h2>감사 완료율</h2>
                        <PieChart width={260} height={260}>
                            <Pie data={[
                                { name: '완료됨', value: parseFloat(auditCompletionRate.toFixed(1)) },
                                { name: '미완료', value: parseFloat((100 - auditCompletionRate).toFixed(1)) }
                            ]} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                                {COMPLETION_COLORS.map((color, index) => <Cell key={`comp-${index}`} fill={color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </div>
                </div>
            </div>
        </div>
    )
}
