import { useState } from 'react';
import axios from 'axios';

interface SignupData {
    userid: string;
    nickname: string;
    password: string;
}

interface UseSignupReturn {
    signup: (data: SignupData) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function useSignup(): UseSignupReturn {
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function signup({ userid, nickname, password }: SignupData) {
        setLoading(true);
        setError(null);
        try {
            await axios.post(
                `${API_BASE}/users`,
                { userid, nickname, password },
                { headers: { 'Content-Type': 'application/json' } }
            );
            // 성공 시 아무 것도 반환하지 않음
        } catch (err: any) {
            // axios 에러 메시지 우선, 없으면 기본 메시지
            const message =
                err.response?.data?.message ?? err.message ?? '회원가입 실패';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }

    return { signup, isLoading, error };
}
