import { useState } from 'react';
import './Login.css';

function Login() {
    const [form, setForm] = useState({ userid: '', password: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.userid || !form.password) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        alert('로그인 시도');
    };

    const handleSignup = () => {
        alert('회원가입으로 이동');
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
            <button className="signup-btn" onClick={handleSignup}>회원가입</button>
        </div>
    );
}

export default Login;
