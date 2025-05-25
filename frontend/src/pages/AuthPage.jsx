import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AuthPage.css'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
        confirmPassword: ''
    })
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const access = localStorage.getItem('access')
        if (access) {
            navigate('/')
        } else {
            setLoading(false)
        }
    }, [navigate])

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const endpoint = isLogin ? '/api/auth/login/' : '/api/auth/register/';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const text = await res.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`서버 응답 오류 (원시 응답): ${text}`);
            }

            if (!res.ok) {
                const msg = data?.detail;
                if (msg === 'No active account found with the given credentials') {
                    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
                }
                throw new Error(msg || data?.error || '로그인 중 오류가 발생했습니다.');
            }

            if (isLogin) {
                localStorage.setItem('access', data.access);
                localStorage.setItem('refresh', data.refresh);
                window.location.href = '/';  // 💡이 부분을 변경!
            } else {
                alert('회원가입 완료! 로그인 해주세요.');
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message || '알 수 없는 오류 발생');
        }
    };

    if (loading) {
        return <div>로딩 중...</div>
    }

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                <div className="logo-wrapper">
                    <img src="/logo.png" alt="로고" className="auth-logo" />
                </div>

                <h2>{isLogin ? '로그인' : '회원가입'}</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="text"
                        name="username"
                        placeholder="아이디"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                    {!isLogin && (
                        <>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="비밀번호 확인"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder="이메일"
                                value={form.email}
                                onChange={handleChange}
                            />
                        </>
                    )}
                    <button type="submit">{isLogin ? '로그인' : '회원가입'}</button>
                </form>
                <p className="toggle-mode" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? '회원가입 하기' : '로그인 하기'}
                </p>
                {error && <p className="error-text">{error}</p>}
            </div>
        </div>
    )
}
