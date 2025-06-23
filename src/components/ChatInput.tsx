import {type FormEvent} from 'react';

interface ChatInputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: FormEvent) => void;
}

export default function ChatInput({value, onChange, onSubmit}: ChatInputProps) {
    return (
        <form className="chat-input" onSubmit={onSubmit}>
            <input
                placeholder="메시지를 입력하세요…"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </form>
    );
}
