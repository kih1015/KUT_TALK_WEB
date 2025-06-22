import {type FormEvent, type MouseEvent, type UIEvent, useEffect, useRef, useState,} from 'react';
import {useNavigate} from 'react-router-dom';
import './ChatPage.css';

const API = 'https://api.kuttalk.kro.kr';
const WS_URL = API.replace(/^http/, 'ws');
const PAGE_SIZE = 20;
const FIRST_PAGE = 0;

// pong timeout (ms): 서버가 보낸 ping에 응답해야 할 최대 시간
const APP_PONG_TIMEOUT = 10_000;

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
    // 더 이상 화면에 표시하지 않으므로 unused
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
const getSid = (): string => localStorage.getItem('KTA_SESSION_ID') ?? '';

export default function ChatPage() {
    const nav = useNavigate();

    // — 로그인 & 내 정보 —
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<{ nickname: string } | null>(null);
    useEffect(() => {
        fetch(`${API}/users/me`, {credentials: 'include'})
            .then(r => (r.status === 401 ? null : r.json()))
            .then(d => {
                if (!d) return nav('/login');
                setUser(d);
            })
            .finally(() => setReady(true));
    }, [nav]);

    const handleLogout = () => {
        fetch(`${API}/users/logout`, {
            method: 'POST',
            credentials: 'include',
        }).finally(() => {
            localStorage.removeItem('KTA_SESSION_ID');
            nav('/login');
        });
    };

    // — 방 목록 —
    const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
    const [pubRooms, setPubRooms] = useState<PublicRoom[]>([]);
    const [roomId, setRoomId] = useState<number | null>(null);
    const roomIdRef = useRef<number | null>(null);
    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    const loadRooms = () => {
        fetch(`${API}/chat/rooms/me`, {credentials: 'include'})
            .then(r => r.json())
            .then(setMyRooms);
        fetch(`${API}/chat/rooms/public`, {credentials: 'include'})
            .then(r => r.json())
            .then(setPubRooms);
    };
    useEffect(loadRooms, []);

    // — 새 방 생성 —
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
                loadRooms();
                // 생성 후 바로 join
                setRoomId(room_id);
                // unread 초기화
                setMyRooms(rs =>
                    rs.map(r =>
                        r.room_id === room_id ? {...r, unread: 0} : r
                    )
                );
                sendWs({type: 'join', room: room_id});
                setNewTitle('');
            });
    };

    // — 메시지 & 무한스크롤 —
    const [messages, setMessages] = useState<Message[]>([]);
    const [page, setPage] = useState(FIRST_PAGE);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const fetchMessages = (room: number, pageNo: number) => {
        setLoadingMsg(true);
        fetch(
            `${API}/chat/rooms/${room}/messages?page=${pageNo}&limit=${PAGE_SIZE}`,
            {credentials: 'include'}
        )
            .then(r => r.json())
            .then((data: Message[]) => {
                setMessages(prev => [...data.reverse(), ...prev]);
                setHasMore(data.length === PAGE_SIZE);
                setPage(pageNo);
                // 이전 페이지 로드 시 스크롤 위치 보존
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
        if (roomId == null) return setMessages([]);
        setMessages([]);
        setPage(FIRST_PAGE);
        setHasMore(true);
        fetchMessages(roomId, FIRST_PAGE);
    }, [roomId]);

    // 새 메시지나 페이지 로드 후 항상 스크롤 최하단
    useEffect(() => {
        if (!chatBodyRef.current) return;
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages]);

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        const tgt = e.currentTarget;
        if (
            tgt.scrollTop === 0 &&
            hasMore &&
            !loadingMsg &&
            roomId != null
        ) {
            fetchMessages(roomId, page + 1);
        }
    };

    // — WebSocket & Heartbeat —
    const socketRef = useRef<WebSocket | null>(null);
    const lastPongRef = useRef<number>(Date.now());

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            lastPongRef.current = Date.now();
            sendWs({type: 'auth'});
        };

        ws.onmessage = e => {
            const raw = JSON.parse(e.data);

            if (raw.type === 'auth_ok') {
                // 인증 성공: user_id가 server에서 세션으로 확인됨
                return;
            }

            // 서버 ping → pong 응답, 타임스탬프 갱신
            if (raw.type === 'ping') {
                sendWs({type: 'pong'});
                lastPongRef.current = Date.now();
                return;
            }
            // 서버가 보낸 pong(선택) → 타임스탬프 갱신
            if (raw.type === 'pong') {
                lastPongRef.current = Date.now();
                return;
            }

            // 일반 메시지
            if (
                raw.type === 'message' &&
                raw.room === roomIdRef.current
            ) {
                const newMsg: Message = {
                    id: raw.id,
                    sender: raw.sender,
                    sender_nick: raw.nick,
                    content: raw.content,
                    created_at: raw.ts,
                    unread_cnt: raw.unread_cnt ?? 0,
                };
                setMessages(prev => [...prev, newMsg]);
            } else if (raw.type === 'unread') {
                // unread 카운트 갱신
                setMyRooms(rs =>
                    rs.map(r =>
                        r.room_id === raw.room
                            ? {...r, unread: raw.count}
                            : r
                    )
                );
            }
        };

        const timeoutId = setInterval(() => {
            if (
                ws.readyState === WebSocket.OPEN &&
                Date.now() - lastPongRef.current > APP_PONG_TIMEOUT
            ) {
                ws.close();
            }
        }, APP_PONG_TIMEOUT / 2);

        return () => {
            clearInterval(timeoutId);
            ws.close();
        };
    }, []);

    const sendWs = (obj: object) => {
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({...obj, sid: getSid()}));
        }
    };

    // 메시지 전송
    const [newMsg, setNewMsg] = useState('');
    const submitMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || roomId == null) return;
        sendWs({type: 'message', room: roomId, content: newMsg.trim()});
        setNewMsg('');
    };

    if (!ready) return <div className="loading">Loading…</div>;

    return (
        <>
            {/* 상단바 */}
            <div className="topbar">
                <div className="user-info">
                    {user ? `${user.nickname}님` : '…'}
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    로그아웃
                </button>
            </div>

            {/* 3컬럼 레이아웃 */}
            <div className="layout">
                <aside className="panel left">
                    <header>내 채팅방</header>
                    <ul className="rooms">
                        {myRooms.map(r => (
                            <li
                                key={r.room_id}
                                className={roomId === r.room_id ? 'sel' : undefined}
                                onClick={() => {
                                    if (roomId !== r.room_id) {
                                        // 1) leave 이전 방
                                        if (roomId != null) sendWs({type: 'leave', room: roomId});
                                        // 2) enter 새 방
                                        setRoomId(r.room_id);
                                        // unread 초기화
                                        setMyRooms(rs =>
                                            rs.map(x =>
                                                x.room_id === r.room_id ? {...x, unread: 0} : x
                                            )
                                        );
                                        sendWs({type: 'join', room: r.room_id});
                                    }
                                }}
                            >
                                <span className="avatar"/>
                                <span className="title">{r.title}</span>
                                {r.unread > 0 && <span className="badge">{r.unread}</span>}
                                <button
                                    className="leave"
                                    onClick={(e: MouseEvent) => {
                                        e.stopPropagation();
                                        if (window.confirm('나가시겠습니까?')) {
                                            fetch(
                                                `${API}/chat/rooms/${r.room_id}/member`,
                                                {method: 'DELETE', credentials: 'include'}
                                            ).then(() => {
                                                if (roomId === r.room_id) {
                                                    sendWs({type: 'leave', room: r.room_id});
                                                    setRoomId(null);
                                                }
                                                loadRooms();
                                            });
                                        }
                                    }}
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
                                                    <span className="msg-unread-badge">
                        {m.unread_cnt}
                        </span>
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
                                    <button
                                        className="join"
                                        onClick={() => {
                                            fetch(
                                                `${API}/chat/rooms/${r.room_id}/join`,
                                                {method: 'POST', credentials: 'include'}
                                            ).then(() => {
                                                loadRooms();
                                                setRoomId(r.room_id);
                                                sendWs({type: 'join', room: r.room_id});
                                            });
                                        }}
                                    >
                                        참가
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </>
    );
}
