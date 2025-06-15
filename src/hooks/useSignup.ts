import { useState } from 'react';
import { signupUser, type SignupData } from '../api/users';

interface UseSignupReturn {
    signup: (data: SignupData) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export function useSignup(): UseSignupReturn {
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function signup(data: SignupData) {
        setLoading(true);
        setError(null);
        try {
            await signupUser(data);
            // 성공 시 추가 로직 필요 없으면 그대로 리턴
        } catch (err: any) {
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
