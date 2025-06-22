import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import './MyPage.css';

interface UserInfo {
    userid: string;
    nickname: string;
}

function MyPage() {
    const [info, setInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    /* ───────── 내 정보 조회 ───────── */
    useEffect(() => {
        fetch('https://api.kuttalk.kro.kr/users/me', {credentials: 'include'})
            .then(async res => (res.status === 401 ? null : res.json()))
            .then(data => {
                if (data) setInfo(data); else navigate('/login');
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    /* ───────── 로그아웃 ───────── */
    const handleLogout = async () => {
        try {
            const res = await fetch('https://api.kuttalk.kro.kr/users/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (res.status === 204) {
                alert('로그아웃 되었습니다.');
            } else {
                console.warn('logout res', res.status);
                alert('세션이 이미 만료되었습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            navigate('/login', {replace: true});
        }
    };

    if (loading) return <div>로딩 중…</div>;
    if (!info) return null;          // redirect 중

    return (
        <div className="mypage-wrapper">
            <h2>마이페이지</h2>

            <p><strong>ID:</strong> {info.userid}</p>
            <p><strong>닉네임:</strong> {info.nickname}</p>

            <button className="logout-btn" onClick={handleLogout}>
                로그아웃
            </button>
        </div>
    );
}

export default MyPage;
