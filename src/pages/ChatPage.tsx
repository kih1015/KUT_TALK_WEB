import {
    useEffect,
    useState,
    type FormEvent,
    type MouseEvent,
    useRef,
    type UIEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatPage.css';

const API = 'https://api.kuttalk.kro.kr';
const PAGE_SIZE = 20;
const FIRST_PAGE = 0;

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
    created_at: number; // unix epoch(sec)
    unread_cnt: number;
}

/* ========= Helpers ========= */
const avatarUrl = (id: number) =>
    `https://api.dicebear.com/6.x/identicon/svg?seed=${id}`;
const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

export default function ChatPage() {
    const nav = useNavigate();

    /* ─ 로그인 체크 ─ */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        fetch(`${API}/users/me`, { credentials: 'include' })
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
        fetch(`${API}/chat/rooms/me`, { credentials: 'include' })
            .then(r => r.json())
            .then(setMyRooms);
        fetch(`${API}/chat/rooms/public`, { credentials: 'include' })
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_type: 'PUBLIC',
                title: newTitle.trim(),
                member_ids: [],
            }),
        })
            .then(r => r.json())
            .then(({ room_id }) => {
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
    const [page, setPage] = useState(FIRST_PAGE);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const fetchMessages = (room: number, pageNo: number) => {
        setLoadingMsg(true);
        fetch(
            `${API}/chat/rooms/${room}/messages?page=${pageNo}&limit=${PAGE_SIZE}`,
            { credentials: 'include' }
        )
            .then(r => r.json())
            .then((data: Message[]) => {
                setMessages(prev => [...data.reverse(), ...prev]);
                setHasMore(data.length === PAGE_SIZE);
                setPage(pageNo);
                if (chatBodyRef.current && pageNo > FIRST_PAGE) {
                    const diff =
                        chatBodyRef.current.scrollHeight - chatBodyRef.current.clientHeight;
                    chatBodyRef.current.scrollTop =
                        chatBodyRef.current.scrollHeight - diff;
                }
            })
            .finally(() => setLoadingMsg(false));
    };

    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            return;
        }
        setMessages([]);
        setPage(FIRST_PAGE);
        setHasMore(true);
        fetchMessages(roomId, FIRST_PAGE);
        setTimeout(() => {
            if (chatBodyRef.current)
                chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }, 0);
    }, [roomId]);

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        const tgt = e.currentTarget;
        if (tgt.scrollTop === 0 && hasMore && !loadingMsg && roomId) {
            fetchMessages(roomId, page + 1);
        }
    };

    /* ─ 웹소켓 연결 ─ */
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!roomId) {
            // 방 떠날 때
            socketRef.current?.close();
            socketRef.current = null;
            return;
        }

        const ws = new WebSocket(
            'wss://api.kuttalk.kro.kr'
        );
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket 연결됨');
            ws.send(JSON.stringify({ type: 'join', room: roomId }));
        };

        ws.onmessage = e => {
            const data = JSON.parse(e.data);
            switch (data.type) {
                case 'message':
                    setMessages(prev => [...prev, data]);
                    // 스크롤 맨 아래
                    setTimeout(() => {
                        if (chatBodyRef.current)
                            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
                    }, 0);
                    break;
                case 'unread':
                    setMyRooms(rs =>
                        rs.map(r =>
                            r.room_id === data.room ? { ...r, unread: data.count } : r
                        )
                    );
                    break;
                case 'error':
                    console.error('WebSocket 오류:', data.message);
                    break;
                // pong, joined 등 기타 이벤트는 필요시 처리
            }
        };

        ws.onerror = err => {
            console.error('WebSocket 에러:', err);
        };

        ws.onclose = () => {
            console.log('WebSocket 연결 종료');
        };

        return () => {
            ws.close();
        };
    }, [roomId]);

    /* ─ 메시지 전송 ─ */
    const [newMsg, setNewMsg] = useState('');
    const sendMessage = (content: string) => {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && roomId) {
            ws.send(
                JSON.stringify({
                    type: 'message',
                    room: roomId,
                    content,
                })
            );
        }
    };
    const submitMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim()) return;
        sendMessage(newMsg.trim());
        setNewMsg('');
    };

    if (!ready) return <div className="loading">Loading…</div>;

    return (
        <div className="layout">
            {/* 왼쪽 */}
            <aside className="panel left">
                <header>내 채팅방</header>
                <ul className="rooms">
                    {myRooms.map(r => (
                        <li
                            key={r.room_id}
                            className={roomId === r.room_id ? 'sel' : undefined}
                            onClick={() => setRoomId(r.room_id)}
                        >
                            <span className="avatar" />
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

            {/* 중앙 */}
            <main className="chat">
                {roomId ? (
                    <>
                        <div className="chat-header">
                            <h2># {myRooms.find(r => r.room_id === roomId)?.title}</h2>
                        </div>
                        <div
                            className="chat-body"
                            ref={chatBodyRef}
                            onScroll={onScroll}
                        >
                            {hasMore && loadingMsg && (
                                <p className="history-loading">이전 메시지 로드 중…</p>
                            )}
                            {messages.map(m => (
                                <div key={m.id} className="msg">
                                    <img
                                        className="msg-avatar"
                                        src={avatarUrl(m.sender)}
                                        alt=""
                                        onError={e =>
                                            ((e.target as HTMLImageElement).style.display = 'none')
                                        }
                                    />
                                    <div className="msg-body">
                                        <div className="msg-meta">
                                            <span className="nick">{m.sender_nick}</span>
                                            <span className="time">
                        {formatTime(m.created_at)}
                      </span>
                                            {m.unread_cnt > 0 && (
                                                <span className="unread">{m.unread_cnt}</span>
                                            )}
                                        </div>
                                        <div className="msg-text">{m.content}</div>
                                    </div>
                                </div>
                            ))}
                            {!messages.length && (
                                <p className="placeholder">메시지가 없습니다.</p>
                            )}
                        </div>
                        <form className="chat-input" onSubmit={submitMessage}>
                            <input
                                placeholder="메시지를 입력하세요…"
                                value={newMsg}
                                onChange={e => setNewMsg(e.target.value)}
                            />
                        </form>
                    </>
                ) : (
                    <p className="placeholder-center">좌측에서 방을 선택하세요.</p>
                )}
            </main>

            {/* 오른쪽 */}
            <aside className="panel right">
                <header>공개 채팅방</header>
                <ul className="rooms">
                    {pubRooms.map(r => (
                        <li key={r.room_id}>
                            <span className="avatar" />
                            <span className="title">
                {r.title} <small>({r.member_cnt})</small>
              </span>
                            {!myRooms.find(m => m.room_id === r.room_id) && (
                                <button
                                    className="join"
                                    onClick={() => joinRoom(r.room_id)}
                                >
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
