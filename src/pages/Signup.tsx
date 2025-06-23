// src/pages/Signup/index.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../hooks/useSignup.ts';
import './Signup.css';

function Signup() {
    const navigate = useNavigate();
    const { signup, isLoading, error: hookError } = useSignup();
    const [form, setForm] = useState({
        userid: '',
        nickname: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { userid, nickname, password } = form;
        if (!userid || !nickname || !password) {
            setError('모든 필드를 채워주세요.');
            return;
        }

        try {
            await signup({ userid, nickname, password });
            alert('회원가입 성공! 로그인 페이지로 이동합니다.');
            navigate('/');
        } catch (err: any) {
            // 409: 아이디 또는 닉네임 중복
            if (err.response?.status === 409) {
                setError('이미 사용 중인 아이디 또는 닉네임입니다.');
            } else {
                // hook 내부에서 설정된 메시지 또는 기타 에러
                setError(hookError || '회원가입에 실패했습니다.');
            }
        }
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
                    disabled={isLoading}
                    required
                />
                <input
                    type="text"
                    name="nickname"
                    placeholder="닉네임"
                    value={form.nickname}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                />
                <button
                    type="submit"
                    className="signup-btn"
                    disabled={isLoading}
                >
                    {isLoading ? '가입 중…' : '가입하기'}
                </button>
            </form>

            {error && (
                <p className="error-message">
                    {error}
                </p>
            )}

            <p className="redirect-text">
                이미 계정이 있으신가요?{' '}
                <Link to="/" className="login-link">
                    로그인
                </Link>
            </p>
        </div>
    );
}

export default Signup;
