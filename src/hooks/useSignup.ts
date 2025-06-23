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
        } catch (err: any) {
            // 409 에러: 아이디 또는 닉네임 중복
            if (err.response?.status === 409) {
                const msg = '이미 사용 중인 아이디 또는 닉네임입니다.';
                setError(msg);
                throw err; // 원본 에러를 던져 상태 코드를 호출자에게 전달
            }
            // 그 외 기타 에러 메시지 처리
            const message =
                err.response?.data?.message ?? err.message ?? '회원가입 실패';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    return { signup, isLoading, error };
}