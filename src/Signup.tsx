import { useState } from 'react';
import './Signup.css';

function Signup() {
    const [form, setForm] = useState({
        userid: '',
        nickname: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const { userid, nickname, password } = form;
        if (!userid || !nickname || !password) {
            alert('모든 필드를 채워주세요.');
            return;
        }

        // TODO: 실제 회원가입 API 호출
        console.log('회원가입 데이터:', form);
        alert('회원가입 요청이 전송되었습니다.');
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
                <button type="submit" className="signup-btn">
                    가입하기
                </button>
            </form>
        </div>
    );
}

export default Signup;
