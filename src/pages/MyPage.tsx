import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyPage.css';

interface UserInfo {
    userid: string;
    nickname: string;
}

function MyPage() {
    const [info, setInfo]   = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('https://api.kuttalk.kro.kr/users/me', {
            credentials: 'include',
        })
            .then(res => {
                if (res.status === 401) {
                    // 세션 없음 → 로그인 페이지로
                    navigate('/login');
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) setInfo(data);
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    if (loading) return <div>로딩 중…</div>;
    if (!info)   return null; // 이미 /login 으로 redirect 됨

    return (
        <div className="mypage-wrapper">
            <h2>마이페이지</h2>
            <p><strong>ID:</strong> {info.userid}</p>
            <p><strong>닉네임:</strong> {info.nickname}</p>
        </div>
    );
}

export default MyPage;
