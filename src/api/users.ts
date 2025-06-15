import axios from 'axios';

export interface SignupData {
    userid: string;
    nickname: string;
    password: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function signupUser(data: SignupData): Promise<void> {
    await axios.post(
        `${API_BASE}/users`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
    );
}
