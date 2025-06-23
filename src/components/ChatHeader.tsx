interface ChatHeaderProps {
    title: string;
}

export default function ChatHeader({title}: ChatHeaderProps) {
    return (
        <div className="chat-header">
            <h2># {title}</h2>
        </div>
    );
}
