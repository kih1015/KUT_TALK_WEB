import {type MouseEvent} from 'react';

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

export default function RoomList({rooms, selectedId, onSelect, onLeave}: RoomListProps) {
    return (
        <ul className="rooms">
            {rooms.map(r => (
                <li
                    key={r.room_id}
                    className={selectedId === r.room_id ? 'sel' : ''}
                    onClick={() => onSelect(r.room_id)}
                >
                    <span className="avatar"/>
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
