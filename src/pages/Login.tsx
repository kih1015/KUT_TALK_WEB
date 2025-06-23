// src/pages/Login/index.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.tsx';
import './Login.css';

function Login() {
    const [form, setForm] = useState({ userid: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { refresh } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null); // 입력시 기존 에러 초기화
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.userid || !form.password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('https://api.kuttalk.kro.kr/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                if (data.sid) localStorage.setItem('KTA_SESSION_ID', data.sid);
                refresh();
                navigate('/chat');
            } else if (res.status === 401) {
                setError(data.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
            } else {
                setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }
        } catch (e) {
            console.error(e);
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <h2><strong>Kuttalk</strong> 로그인</h2>

            <form onSubmit={handleSubmit} className="login-form">
                <input
                    type="text"
                    name="userid"
                    placeholder="아이디"
                    value={form.userid}
                    onChange={handleChange}
                    disabled={loading}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                />
                <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? '로그인 중…' : '로그인'}
                </button>
            </form>

            {error && <p className="error-message">{error}</p>}

            <p className="redirect-text">
                아직 계정이 없으신가요?{' '}
                <Link to="/signup" className="signup-link">회원가입</Link>
            </p>
        </div>
    );
}

export default Login;
