import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Signup.css';

function Signup() {
    const [form, setForm] = useState({
        userid: '',
        nickname: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.userid || !form.nickname || !form.password) {
            alert('모든 필드를 채워주세요.');
            return;
        }
        // TODO: 회원가입 API 호출
        alert('회원가입 요청 완료');
    };

    return (
        <div className="signup-wrapper">
            <h2><strong>Kuttalk</strong> 회원가입</h2>
            <form onSubmit={handleSubmit} className="signup-form">
                <input
                    type="text"
                    name="userid"
                    placeholder="아이디"
                    value={form.userid}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="nickname"
                    placeholder="닉네임"
                    value={form.nickname}
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
                <button type="submit" className="signup-btn">가입하기</button>
            </form>
            <p>
                이미 계정이 있으신가요?{' '}
                <Link to="/" className="login-link">
                    로그인
                </Link>
            </p>
        </div>
    );
}

export default Signup;
