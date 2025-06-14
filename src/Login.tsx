import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

function Login() {
    const [form, setForm] = useState({ userid: '', password: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.userid || !form.password) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        // TODO: 로그인 API 호출
        alert('로그인 요청 완료');
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
                <button type="submit" className="login-btn">로그인</button>
            </form>
            <p>
                아직 계정이 없으신가요?{' '}
                <Link to="/signup" className="signup-link">
                    회원가입
                </Link>
            </p>
        </div>
    );
}

export default Login;
