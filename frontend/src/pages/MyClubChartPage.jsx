import { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid,
    Bar, Line, ComposedChart
} from 'recharts';
import { authFetch } from '../utils/authFetch';

const COLORS = ['#2ecc71', '#f39c12', '#e74c3c'];

export default function MyClubChartPage() {
    const [summaryData, setSummaryData] = useState(null);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedChartType, setSelectedChartType] = useState('bar');
    const [clubName, setClubName] = useState('');

    useEffect(() => {
        // 클럽명 요청 없이 API 내부에서 처리
        authFetch(`/api/audit/my-club/statistics/`)
            .then(res => res.json())
            .then(data => {
                setSummaryData(data);
                setClubName(data.club); // 클럽명 출력용
            });

        authFetch(`/api/audit/my-club/monthly-summary/`)
            .then(res => res.json())
            .then(data => setMonthlyData(data));
    }, []);

    if (!summaryData) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>로딩 중...</p>;

    const pieChartData = [
        { name: '✔ 완료', value: summaryData.completed },
        { name: '⏳ 진행중', value: summaryData.in_progress },
        { name: '❗ 미완료', value: summaryData.not_reviewed },
    ].filter(entry => entry.value > 0);

    const cardStyle = {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        padding: '1.5rem',
        marginBottom: '2rem',
    };

    const buttonStyle = (type) => ({
        padding: '0.5rem 1rem',
        marginRight: '0.5rem',
        borderRadius: '8px',
        border: '1px solid #ccc',
        backgroundColor: selectedChartType === type ? '#3498db' : '#ecf0f1',
        color: selectedChartType === type ? 'white' : 'black',
        cursor: 'pointer',
    });

    return (
        <div style={{ width: '90%', margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '3rem' }}>
                📊 {clubName} 감사 통계 분석
            </h1>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: '1rem' }}>📌 감사 상태 비율</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                                percent === 0 ? '' : `${name} (${(percent * 100).toFixed(1)}%)`
                            }
                            outerRadius={130}
                            dataKey="value"
                        >
                            {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: '1rem' }}>📊 월별 수입/지출 추이</h3>
                {monthlyData.length === 0 ? (
                    <p style={{ textAlign: 'center', marginTop: '1rem' }}>지출 내역이 없습니다.</p>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart
                                data={monthlyData}
                                margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis
                                    tickFormatter={(value) => `${(value / 10000).toFixed(1)}만원`}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        `${(value / 10000).toFixed(1)}만원`,
                                        name === 'income' ? '수입' : '지출',
                                    ]}
                                />
                                <Legend />
                                {selectedChartType === 'bar' ? (
                                    <>
                                        <Bar dataKey="expense" name="지출" fill="#e74c3c" barSize={20} />
                                        <Bar dataKey="income" name="수입" fill="#3498db" barSize={20} />
                                    </>
                                ) : (
                                    <>
                                        <Line
                                            type="monotone"
                                            dataKey="expense"
                                            name="지출"
                                            stroke="#e74c3c"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="income"
                                            name="수입"
                                            stroke="#3498db"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <button style={buttonStyle('bar')} onClick={() => setSelectedChartType('bar')}>막대그래프</button>
                            <button style={buttonStyle('line')} onClick={() => setSelectedChartType('line')}>선그래프</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
