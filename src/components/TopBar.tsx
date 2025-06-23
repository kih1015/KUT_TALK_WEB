interface TopBarProps {
    user: { nickname: string } | null;
    onLogout: () => void;
}

export default function TopBar({user, onLogout}: TopBarProps) {
    return (
        <div className="topbar">
            <div className="user-info">{user ? `${user.nickname}님` : '…'}</div>
            <button className="logout-btn" onClick={onLogout}>로그아웃</button>
        </div>
    );
}
