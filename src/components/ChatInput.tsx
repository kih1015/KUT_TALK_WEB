import {type FormEvent} from 'react';

interface ChatInputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: FormEvent) => void;
}

export default function ChatInput({value, onChange, onSubmit}: ChatInputProps) {
    return (
        <form className="chat-input" onSubmit={onSubmit}>
            <div className="chat-input-inner">
                <input
                    placeholder="메시지를 입력하세요…"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
                <button className="chat-send" type="submit">전송</button>
            </div>
        </form>
    );
}
