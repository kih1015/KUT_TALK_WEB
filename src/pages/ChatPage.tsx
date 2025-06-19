import {type FormEvent, type MouseEvent, type UIEvent, useEffect, useRef, useState,} from 'react';
import {useNavigate} from 'react-router-dom';
import './ChatPage.css';

const API = 'https://api.kuttalk.kro.kr';
const PAGE_SIZE = 20; // limit=20 고정
const FIRST_SIZE = 0;

/* ========= Type ========= */
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

interface Message {
    id: number;
    sender: number;
    sender_nick: string;
    content: string;
    created_at: number;
    unread_cnt: number;
}

/* ========= Component ========= */
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

    /* ─ 참가 / 나가기 ─ */
    const joinRoom = (id: number) =>
        fetch(`${API}/chat/rooms/${id}/join`, {
            method: 'POST',
            credentials: 'include',
        }).then(loadRooms);

    const leaveRoom = (id: number, e: MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('정말로 이 채팅방을 나가시겠습니까?')) return;

        fetch(`${API}/chat/rooms/${id}/member`, {
            method: 'DELETE',
            credentials: 'include',
        }).then(() => {
            if (roomId === id) setRoomId(null);
            loadRooms();
        });
    };

    /* ─ 메시지 무한 스크롤 ─ */
    const [messages, setMessages] = useState<Message[]>([]);
    const [page, setPage] = useState(FIRST_SIZE);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const fetchMessages = (room: number, pageNo: number) => {
        setLoadingMsg(true);
        fetch(
            `${API}/chat/rooms/${room}/messages?page=${pageNo}&limit=${PAGE_SIZE}`,
            {credentials: 'include'},
        )
            .then(r => r.json())
            .then((data: Message[]) => {
                setMessages(prev => [...data.reverse(), ...prev]); // 오래된 → 위쪽
                setHasMore(data.length === PAGE_SIZE);
                setPage(pageNo);
                // 스크롤 점프 방지: 새 높이 계산
                if (chatBodyRef.current && pageNo > 1) {
                    const diff =
                        chatBodyRef.current.scrollHeight - chatBodyRef.current.clientHeight;
                    chatBodyRef.current.scrollTop =
                        chatBodyRef.current.scrollHeight - diff;
                }
            })
            .finally(() => setLoadingMsg(false));
    };

    /* 방 선택이 바뀌면 새로 로드 */
    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            return;
        }
        setMessages([]);
        setPage(FIRST_SIZE);
        setHasMore(true);
        fetchMessages(roomId, FIRST_SIZE);
        // 맨 밑으로 스크롤 (최신 메시지 보기)
        setTimeout(() => {
            if (chatBodyRef.current)
                chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }, 0);
    }, [roomId]);

    /* 스크롤 핸들러: 맨 위 도달 시 이전 페이지 로드 */
    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollTop === 0 && hasMore && !loadingMsg && roomId) {
            fetchMessages(roomId, page + 1);
        }
    };

    /* 로딩 상태 */
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
                            <span className="avatar"/>
                            <span className="title">{r.title}</span>
                            {r.unread > 0 && <span className="badge">{r.unread}</span>}
                            <button
                                className="leave"
                                title="방 나가기"
                                onClick={e => leaveRoom(r.room_id, e)}
                            >
                                ×
                            </button>
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

                        <div className="chat-body" ref={chatBodyRef} onScroll={onScroll}>
                            {hasMore && loadingMsg && (
                                <p className="history-loading">이전 메시지 로드 중…</p>
                            )}
                            {messages.map(m => (
                                <div key={m.id} className="msg">
                                    <span className="nick">{m.sender_nick}</span>
                                    <span className="text">{m.content}</span>
                                </div>
                            ))}
                            {!messages.length && (
                                <p className="placeholder">메시지가 없습니다.</p>
                            )}
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
                            <span className="avatar"/>
                            <span className="title">
                {r.title} <small>({r.member_cnt})</small>
              </span>
                            {!myRooms.find(m => m.room_id === r.room_id) && (
                                <button className="join" onClick={() => joinRoom(r.room_id)}>
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
