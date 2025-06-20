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
const WS_URL = API.replace(/^http/, 'ws'); // "wss://api.kuttalk.kro.kr"
const PAGE_SIZE = 20;
const FIRST_PAGE = 0;

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

// localStorage에서 sid 꺼내기
const getSid = (): string => localStorage.getItem('KTA_SESSION_ID') ?? '';

export default function ChatPage() {
    const nav = useNavigate();

    // 로그인 체크
    const [ready, setReady] = useState(false);
    useEffect(() => {
        fetch(`${API}/users/me`, { credentials: 'include' })
            .then(r => (r.status === 401 ? null : r.json()))
            .then(d => {
                if (!d) nav('/login');
            })
            .finally(() => setReady(true));
    }, [nav]);

    // 방 목록
    const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
    const [pubRooms, setPubRooms] = useState<PublicRoom[]>([]);
    const [roomId, setRoomId] = useState<number | null>(null);
    const roomIdRef = useRef<number | null>(null);
    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    const loadRooms = () => {
        fetch(`${API}/chat/rooms/me`, { credentials: 'include' })
            .then(r => r.json())
            .then(setMyRooms);
        fetch(`${API}/chat/rooms/public`, { credentials: 'include' })
            .then(r => r.json())
            .then(setPubRooms);
    };
    useEffect(loadRooms, []);

    // 메시지 리스트 & 무한 스크롤
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
                        chatBodyRef.current.scrollHeight -
                        chatBodyRef.current.clientHeight;
                    chatBodyRef.current.scrollTop =
                        chatBodyRef.current.scrollHeight - diff;
                }
            })
            .finally(() => setLoadingMsg(false));
    };

    useEffect(() => {
        if (roomId == null) {
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
        if (tgt.scrollTop === 0 && hasMore && !loadingMsg && roomId != null) {
            fetchMessages(roomId, page + 1);
        }
    };

    // WebSocket 연결 (마운트 시 단 한번)
    const socketRef = useRef<WebSocket | null>(null);
    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => console.log('WebSocket 연결됨:', WS_URL);
        ws.onmessage = e => {
            const data = JSON.parse(e.data);
            if (
                data.type === 'message' &&
                data.room === roomIdRef.current
            ) {
                // 메시지 받으면 전체 재조회
                if (roomIdRef.current != null) {
                    fetchMessages(roomIdRef.current, FIRST_PAGE);
                    setTimeout(() => {
                        if (chatBodyRef.current)
                            chatBodyRef.current.scrollTop =
                                chatBodyRef.current.scrollHeight;
                    }, 0);
                }
            } else if (data.type === 'unread') {
                setMyRooms(rs =>
                    rs.map(r =>
                        r.room_id === data.room ? { ...r, unread: data.count } : r
                    )
                );
            }
        };
        ws.onerror = e => console.error('WebSocket 에러:', e);
        ws.onclose = () => console.log('WebSocket 종료');

        return () => ws.close();
    }, []);

    // 모든 WS 페이로드에 sid 포함하여 전송
    const sendWs = (obj: object) => {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    ...obj,
                    sid: getSid(),
                })
            );
        }
    };

    // 채팅방 생성 / 참가 / 나가기
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
                loadRooms();
                setRoomId(room_id);
                sendWs({ type: 'join', room: room_id });
            });
    };
    const joinRoom = (id: number) =>
        fetch(`${API}/chat/rooms/${id}/join`, {
            method: 'POST',
            credentials: 'include',
        }).then(() => {
            loadRooms();
            setRoomId(id);
            sendWs({ type: 'join', room: id });
        });
    const leaveRoom = (id: number, e: MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('정말로 이 채팅방을 나가시겠습니까?')) return;
        fetch(`${API}/chat/rooms/${id}/member`, {
            method: 'DELETE',
            credentials: 'include',
        }).then(() => {
            if (roomId === id) {
                sendWs({ type: 'leave', room: id });
                setRoomId(null);
            }
            loadRooms();
        });
    };

    // 메시지 전송
    const [newMsg, setNewMsg] = useState('');
    const submitMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || roomId == null) return;
        sendWs({ type: 'message', room: roomId, content: newMsg.trim() });
        setNewMsg('');
    };

    if (!ready) return <div className="loading">Loading…</div>;

    return (
        <div className="layout">
            {/* 왼쪽: 내 채팅방 */}
            <aside className="panel left">
                <header>내 채팅방</header>
                <ul className="rooms">
                    {myRooms.map(r => (
                        <li
                            key={r.room_id}
                            className={roomId === r.room_id ? 'sel' : undefined}
                            onClick={() => {
                                if (roomId !== r.room_id) {
                                    if (roomId != null) sendWs({ type: 'leave', room: roomId });
                                    setRoomId(r.room_id);
                                    sendWs({ type: 'join', room: r.room_id });
                                }
                            }}
                        >
                            <span className="avatar" />
                            <span className="title">{r.title}</span>
                            {r.unread > 0 && <span className="badge">{r.unread}</span>}
                            <button
                                className="leave"
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

            {/* 중앙: 채팅 */}
            <main className="chat">
                {roomId != null ? (
                    <>
                        <div className="chat-header">
                            <h2>
                                # {myRooms.find(r => r.room_id === roomId)?.title}
                            </h2>
                        </div>
                        <div
                            className="chat-body"
                            ref={chatBodyRef}
                            onScroll={onScroll}
                        >
                            {loadingMsg && hasMore && (
                                <p className="history-loading">
                                    이전 메시지 로드 중…
                                </p>
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
                    <p className="placeholder-center">방을 선택하세요.</p>
                )}
            </main>

            {/* 오른쪽: 공개 채팅방 */}
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
