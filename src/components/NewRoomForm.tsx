import {type FormEvent, useState} from 'react';

interface NewRoomFormProps {
    onCreate: (title: string) => void;
}

export default function NewRoomForm({onCreate}: NewRoomFormProps) {
    const [title, setTitle] = useState('');
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim());
            setTitle('');
        }
    };

    return (
        <form className="new" onSubmit={submit}>
            <input placeholder="새 공개방 제목" value={title} onChange={e => setTitle(e.target.value)}/>
            <button>＋</button>
        </form>
    );
}
