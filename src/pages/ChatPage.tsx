import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatPage.css';

const API_BASE = 'https://api.kuttalk.kro.kr';

interface MyRoom {
    room_id: number;
    title: string;
    unread: number;
    member_cnt: number;
}

interface PublicRoom {
    room_id: number;
    title: string;
    member_cnt: number;
}

export default function ChatPage() {
    const nav = useNavigate();

    /* ───────── 내 정보 & 로그인 체크 ───────── */
    const [meChecked, setMeChecked] = useState(false);
    useEffect(() => {
        fetch(`${API_BASE}/users/me`, { credentials: 'include' })
            .then(res => (res.status === 401 ? null : res.json()))
            .then(data => {
                if (!data) nav('/login');
            })
            .finally(() => setMeChecked(true));
    }, [nav]);

    /* ───────── 채팅방 데이터 ───────── */
    const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
    const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

    const refreshLists = () => {
        fetch(`${API_BASE}/chat/rooms/me`, { credentials: 'include' })
            .then(res => res.json())
            .then(setMyRooms);
        fetch(`${API_BASE}/chat/rooms/public`, { credentials: 'include' })
            .then(res => res.json())
            .then(setPublicRooms);
    };

    useEffect(refreshLists, []);

    /* ───────── 채팅방 생성 ───────── */
    const [newTitle, setNewTitle] = useState('');
    const createRoom = (e: FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        fetch(`${API_BASE}/chat/rooms`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_type: 'PUBLIC',
                title: newTitle.trim(),
                member_ids: [], // 최초엔 본인만 참가
            }),
        })
            .then(res => res.json())
            .then(({ room_id }) => {
                setNewTitle('');
                refreshLists();
                setSelectedRoom(room_id);
            });
    };

    /* ───────── 공개방 참가 ───────── */
    const joinRoom = (roomId: number) => {
        fetch(`${API_BASE}/chat/rooms/${roomId}/join`, {
            method: 'POST',
            credentials: 'include',
        }).then(() => refreshLists());
    };

    if (!meChecked) return <div className="loading">로딩 중…</div>;

    return (
        <div className="chat-layout">
            {/* ───────── 좌측: 내 채팅방 ───────── */}
            <aside className="sidebar">
                <h3 className="sidebar-title">내 채팅방</h3>
                <ul className="room-list">
                    {myRooms.map(r => (
                        <li
                            key={r.room_id}
                            className={selectedRoom === r.room_id ? 'active' : undefined}
                            onClick={() => setSelectedRoom(r.room_id)}
                        >
                            <span className="title">{r.title}</span>
                            {r.unread > 0 && <span className="badge">{r.unread}</span>}
                        </li>
                    ))}
                </ul>

                <form onSubmit={createRoom} className="new-room-form">
                    <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="새 공개방 제목"
                    />
                    <button type="submit">＋</button>
                </form>
            </aside>

            {/* ───────── 중앙: 채팅 화면(placeholder) ───────── */}
            <main className="chat-main">
                {selectedRoom ? (
                    <div className="chat-placeholder">
                        <p>Room #{selectedRoom} 메시지 영역 (추후 WebSocket 연동)</p>
                    </div>
                ) : (
                    <div className="chat-placeholder">
                        <p>좌측에서 채팅방을 선택하세요.</p>
                    </div>
                )}
            </main>

            {/* ───────── 우측: 공개 채팅방 ───────── */}
            <aside className="sidebar">
                <h3 className="sidebar-title">공개 채팅방</h3>
                <ul className="room-list">
                    {publicRooms.map(r => (
                        <li key={r.room_id}>
              <span className="title">
                {r.title} <small>({r.member_cnt})</small>
              </span>
                            {!myRooms.find(m => m.room_id === r.room_id) && (
                                <button className="join-btn" onClick={() => joinRoom(r.room_id)}>
                                    참가
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
}
