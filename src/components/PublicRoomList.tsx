interface PublicRoom {
    room_id: number;
    title: string;
    member_cnt: number;
}

interface MyRoomRef {
    room_id: number;
}

interface PublicRoomListProps {
    rooms: PublicRoom[];
    onJoin: (id: number) => void;
    myRooms: MyRoomRef[];
}

export default function PublicRoomList({rooms, onJoin, myRooms}: PublicRoomListProps) {
    return (
        <ul className="rooms">
            {rooms.map(r => (
                <li key={r.room_id}>
                    <span className="avatar"/>
                    <span className="title">
            {r.title} <small>({r.member_cnt})</small>
          </span>
                    {!myRooms.find(m => m.room_id === r.room_id) && (
                        <button className="join" onClick={() => onJoin(r.room_id)}>
                            참가
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
