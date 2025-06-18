import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from "../auth.tsx";
import './Login.css';

function Login() {
    const [form, setForm] = useState({userid: '', password: ''});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const {refresh} = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({...prev, [e.target.name]: e.target.value}));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.userid || !form.password) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        setLoading(true);

        try {
            const res = await fetch('https://api.kuttalk.kro.kr/users/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',        // ← 세션 쿠키 포함
                body: JSON.stringify(form),
            });

            if (res.ok) {
                alert('로그인 성공!');
                refresh();            // 세션 정보 다시 가져오기
                navigate('/mypage');  // 이동       // 메인 페이지로 이동
            } else if (res.status === 401) {
                const {error} = await res.json();
                alert(error || '아이디/비밀번호가 올바르지 않습니다.');
            } else {
                alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }
        } catch (err) {
            console.error(err);
            alert('네트워크 오류가 발생했습니다.');
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
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                />
                <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? '로그인 중...' : '로그인'}
                </button>
            </form>

            <p>
                아직 계정이 없으신가요?{' '}
                <Link to="/signup" className="signup-link">회원가입</Link>
            </p>
        </div>
    );
}

export default Login;
