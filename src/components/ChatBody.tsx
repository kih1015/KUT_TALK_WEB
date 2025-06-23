import { type UIEvent, forwardRef } from 'react';

interface Message {
    id: number;
    sender: number;
    sender_nick: string;
    content: string;
    created_at: number;
    unread_cnt: number;
}

interface ChatBodyProps {
    messages: Message[];
    loading: boolean;
    hasMore: boolean;
    onScroll: (e: UIEvent<HTMLDivElement>) => void;
}

const avatarUrl = (id: number) => `https://api.dicebear.com/6.x/identicon/svg?seed=${id}`;
const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true,
});

// forwardRef를 이용해 부모에서 ref로 스크롤 컨트롤 가능
export default forwardRef<HTMLDivElement, ChatBodyProps>(
    function ChatBody({ messages, loading, hasMore, onScroll }, ref) {
        return (
            <div className="chat-body" ref={ref} onScroll={onScroll}>
                {loading && hasMore && <p className="history-loading">이전 메시지 로드 중…</p>}
                {messages.map(m => (
                    <div key={m.id} className="msg">
                        <img className="msg-avatar" src={avatarUrl(m.sender)} alt="" />
                        <div className="msg-body">
                            <div className="msg-meta">
                                <span className="nick">{m.sender_nick}</span>
                                <span className="time">{formatTime(m.created_at)}</span>
                                {m.unread_cnt > 0 && <span className="msg-unread-badge">{m.unread_cnt}</span>}
                            </div>
                            <div className="msg-text">{m.content}</div>
                        </div>
                    </div>
                ))}
                {!messages.length && <p className="placeholder">메시지가 없습니다.</p>}
            </div>
        );
    }
);
