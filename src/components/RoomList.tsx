import {type MouseEvent } from 'react';

interface MyRoom {
    room_id: number;
    title: string;
    unread: number;
    member_cnt: number;
}

interface RoomListProps {
    rooms: MyRoom[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onLeave: (id: number) => void;
}

// avatarUrl 유틸을 가져오거나 복사하세요
const avatarUrl = (id: number) =>
    `https://api.dicebear.com/6.x/identicon/svg?seed=public-room-${id}`;

export default function RoomList({
                                     rooms,
                                     selectedId,
                                     onSelect,
                                     onLeave,
                                 }: RoomListProps) {
    return (
        <ul className="rooms">
            {rooms.map(r => (
                <li
                    key={r.room_id}
                    className={selectedId === r.room_id ? 'sel room-item' : 'room-item'}
                    onClick={() => onSelect(r.room_id)}
                >
                    {/* 기존 span.avatar 대신 img.avatar */}
                    <img
                        className="avatar"
                        src={avatarUrl(r.room_id)}
                        alt={`${r.title} avatar`}
                    />
                    <span className="title">{r.title}</span>
                    {r.unread > 0 && <span className="badge">{r.unread}</span>}
                    <button
                        className="leave"
                        onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            onLeave(r.room_id);
                        }}
                    >
                        ×
                    </button>
                </li>
            ))}
        </ul>
    );
}
