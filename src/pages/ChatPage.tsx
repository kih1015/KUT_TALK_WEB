import {type FormEvent, type UIEvent, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import './ChatPage.css';
import TopBar from '../components/TopBar';
import RoomList from '../components/RoomList';
import PublicRoomList from '../components/PublicRoomList';
import NewRoomForm from '../components/NewRoomForm';
import ChatHeader from '../components/ChatHeader';
import ChatBody from '../components/ChatBody';
import ChatInput from '../components/ChatInput';

const API = 'https://api.kuttalk.kro.kr';
const WS_URL = API.replace(/^http/, 'ws');
const PAGE_SIZE = 20;
const FIRST_PAGE = 0;
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
    unread_cnt: number;
}

const getSid = (): string => localStorage.getItem('KTA_SESSION_ID') ?? '';

export default function ChatPage() {
    const nav = useNavigate();
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<{ nickname: string } | null>(null);

    // 로그인 & 내 정보 로드
    useEffect(() => {
        fetch(`${API}/users/me`, {credentials: 'include'})
            .then(r => (r.status === 401 ? null : r.json()))
            .then(d => {
                if (!d) nav('/login'); else setUser(d);
            })
            .finally(() => setReady(true));
    }, [nav]);

    const handleLogout = () => {
        fetch(`${API}/users/logout`, {method: 'POST', credentials: 'include'})
            .finally(() => {
                localStorage.removeItem('KTA_SESSION_ID');
                nav('/login');
            });
    };

    // 방 목록 상태
    const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
    const [pubRooms, setPubRooms] = useState<PublicRoom[]>([]);
    const [roomId, setRoomId] = useState<number | null>(null);
    const roomIdRef = useRef<number | null>(null);
    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    const loadRooms = () => {
        fetch(`${API}/chat/rooms/me`, {credentials: 'include'}).then(r => r.json()).then(setMyRooms);
        fetch(`${API}/chat/rooms/public`, {credentials: 'include'}).then(r => r.json()).then(setPubRooms);
    };
    useEffect(loadRooms, []);

    const createRoom = (title: string) => {
        fetch(`${API}/chat/rooms`, {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({room_type: 'PUBLIC', title, member_ids: []}),
        })
            .then(r => r.json())
            .then(({room_id}) => {
                loadRooms();
                setRoomId(room_id);
                setMyRooms(rs => rs.map(r => r.room_id === room_id ? {...r, unread: 0} : r));
                sendWs({type: 'join', room: room_id});
                sendWs({type: 'update-chat-room'});
            });
    };

    const leaveRoom = (id: number) => {
        fetch(`${API}/chat/rooms/${id}/member`, {method: 'DELETE', credentials: 'include'})
            .then(() => {
                if (roomId === id) {
                    sendWs({type: 'leave', room: id});
                    setRoomId(null);
                }
                loadRooms();
                sendWs({type: 'update-chat-room'});
            });
    };

    // 메시지 및 페이지네이션
    const [messages, setMessages] = useState<Message[]>([]);
    const [page, setPage] = useState(FIRST_PAGE);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const fetchMessages = (room: number, pageNo: number) => {
        setLoadingMsg(true);
        fetch(`${API}/chat/rooms/${room}/messages?page=${pageNo}&limit=${PAGE_SIZE}`, {credentials: 'include'})
            .then(r => r.json())
            .then((data: Message[]) => {
                setMessages(prev => [...data.reverse(), ...prev]);
                setHasMore(data.length === PAGE_SIZE);
                setPage(pageNo);
                if (chatBodyRef.current && pageNo > FIRST_PAGE) {
                    const diff = chatBodyRef.current.scrollHeight - chatBodyRef.current.clientHeight;
                    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight - diff;
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

    useEffect(() => {
        if (!chatBodyRef.current) return;
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages]);

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        const tgt = e.currentTarget;
        if (tgt.scrollTop === 0 && hasMore && !loadingMsg && roomId != null) {
            fetchMessages(roomId, page + 1);
        }
    };

    // WebSocket & Heartbeat
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

            // ── updated-message: 기존 메시지의 unread_cnt 갱신
            if (raw.type === 'updated-message') {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === raw.id
                            ? {...m, unread_cnt: raw.unread_cnt}
                            : m
                    )
                );
                return;
            }

            // public rooms 갱신
            if (raw.type === 'updated-chat-room') {
                fetch(`${API}/chat/rooms/public`, {credentials: 'include'})
                    .then(r => r.json())
                    .then(setPubRooms);
                return;
            }

            // 인증 확인
            if (raw.type === 'auth_ok') {
                return;
            }

            // ping-pong heartbeat
            if (raw.type === 'ping') {
                sendWs({type: 'pong'});
                lastPongRef.current = Date.now();
                return;
            }
            if (raw.type === 'pong') {
                lastPongRef.current = Date.now();
                return;
            }

            // 새로운 메시지
            if (raw.type === 'message' && raw.room === roomIdRef.current) {
                const newMsg: Message = {
                    id: raw.id,
                    sender: raw.sender,
                    sender_nick: raw.nick,
                    content: raw.content,
                    created_at: raw.ts,
                    unread_cnt: raw.unread_cnt ?? 0,
                };
                setMessages(prev => [...prev, newMsg]);
            }
            // unread count 업데이트
            else if (raw.type === 'unread') {
                setMyRooms(rs =>
                    rs.map(r =>
                        r.room_id === raw.room
                            ? {...r, unread: raw.count}
                            : r
                    )
                );
            }
        };
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && Date.now() - lastPongRef.current > APP_PONG_TIMEOUT) ws.close();
        }, APP_PONG_TIMEOUT / 2);
        return () => {
            clearInterval(interval);
            ws.close();
        };
    }, []);

    const sendWs = (obj: object) => {
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({...obj, sid: getSid()}));
    };

    // 새 메시지 전송
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
            <TopBar user={user} onLogout={handleLogout}/>
            <div className="layout">
                <aside className="panel left">
                    <header>내 채팅방</header>
                    <RoomList rooms={myRooms} selectedId={roomId} onSelect={id => {
                        if (roomId !== id) {
                            if (roomId != null) sendWs({type: 'leave', room: roomId});
                            setRoomId(id);
                            setMyRooms(rs => rs.map(r => r.room_id === id ? {...r, unread: 0} : r));
                            sendWs({type: 'join', room: id});
                        }
                    }} onLeave={leaveRoom}/>
                    <NewRoomForm onCreate={createRoom}/>
                </aside>
                <main className="chat">
                    {roomId != null ? (
                        <>
                            <ChatHeader title={myRooms.find(r => r.room_id === roomId)?.title || ''}/>
                            <ChatBody messages={messages} loading={loadingMsg} hasMore={hasMore} onScroll={onScroll}/>
                            <ChatInput value={newMsg} onChange={setNewMsg} onSubmit={submitMessage}/>
                        </>
                    ) : (
                        <p className="placeholder-center">방을 선택하세요.</p>
                    )}
                </main>
                <aside className="panel right">
                    <header>공개 채팅방</header>
                    <PublicRoomList rooms={pubRooms} onJoin={id => {
                        fetch(`${API}/chat/rooms/${id}/join`, {method: 'POST', credentials: 'include'})
                            .then(() => {
                                loadRooms();
                                setRoomId(id);
                                sendWs({type: 'join', room: id});
                                sendWs({type: 'update-chat-room'});
                            });
                    }} myRooms={myRooms}/>
                </aside>
            </div>
        </>
    );
}
