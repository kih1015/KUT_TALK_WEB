import {type FormEvent, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import './ChatPage.css';

const API = 'https://api.kuttalk.kro.kr';

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

    /* ─ 로그인 체크 ─ */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        fetch(`${API}/users/me`, {credentials: 'include'})
            .then(r => (r.status === 401 ? null : r.json()))
            .then(d => {
                if (!d) nav('/login');
            })
            .finally(() => setReady(true));
    }, [nav]);

    /* ─ 방 목록 ─ */
    const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
    const [pubRooms, setPubRooms] = useState<PublicRoom[]>([]);
    const [roomId, setRoomId] = useState<number | null>(null);

    const loadRooms = () => {
        fetch(`${API}/chat/rooms/me`, {credentials: 'include'})
            .then(r => r.json())
            .then(setMyRooms);
        fetch(`${API}/chat/rooms/public`, {credentials: 'include'})
            .then(r => r.json())
            .then(setPubRooms);
    };
    useEffect(loadRooms, []);

    /* ─ 새 방 만들기 ─ */
    const [newTitle, setNewTitle] = useState('');
    const createRoom = (e: FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        fetch(`${API}/chat/rooms`, {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                room_type: 'PUBLIC',
                title: newTitle.trim(),
                member_ids: [],
            }),
        })
            .then(r => r.json())
            .then(({room_id}) => {
                setNewTitle('');
                loadRooms();
                setRoomId(room_id);
            });
    };

    /* ─ 공개방 참가 ─ */
    const join = (id: number) =>
        fetch(`${API}/chat/rooms/${id}/join`, {
            method: 'POST',
            credentials: 'include',
        }).then(loadRooms);

    if (!ready) return <div className="loading">Loading…</div>;

    return (
        <div className="layout">
            {/* —— 왼쪽: 내 방 —— */}
            <aside className="panel left">
                <header>내 채팅방</header>
                <ul className="rooms">
                    {myRooms.map(r => (
                        <li
                            key={r.room_id}
                            className={roomId === r.room_id ? 'sel' : undefined}
                            onClick={() => setRoomId(r.room_id)}
                        >
                            <span className="title">{r.title}</span>
                            {r.unread > 0 && <span className="badge">{r.unread}</span>}
                        </li>
                    ))}
                </ul>

                <form onSubmit={createRoom} className="new">
                    <input
                        placeholder="새 공개방 제목"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                    />
                    <button>＋</button>
                </form>
            </aside>

            {/* —— 중앙: 채팅 —— */}
            <main className="chat">
                {roomId ? (
                    <>
                        <div className="chat-header">
                            <h2># {myRooms.find(r => r.room_id === roomId)?.title}</h2>
                        </div>
                        <div className="chat-body">
                            <p className="placeholder">
                                Room #{roomId} 메시지 영역<br/>(WebSocket 연동 예정)
                            </p>
                        </div>
                        <form className="chat-input">
                            <input placeholder="메시지를 입력하세요…" disabled/>
                        </form>
                    </>
                ) : (
                    <p className="placeholder-center">좌측에서 방을 선택하세요.</p>
                )}
            </main>

            {/* —— 오른쪽: 공개방 —— */}
            <aside className="panel right">
                <header>공개 채팅방</header>
                <ul className="rooms">
                    {pubRooms.map(r => (
                        <li key={r.room_id}>
              <span className="title">
                {r.title} <small>({r.member_cnt})</small>
              </span>
                            {!myRooms.find(m => m.room_id === r.room_id) && (
                                <button className="join" onClick={() => join(r.room_id)}>
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
