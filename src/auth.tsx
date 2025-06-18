import {
    createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';

interface UserInfo { userid: string; nickname: string; }
interface AuthCtx {
    user: UserInfo | null;
    loading: boolean;
    refresh: () => void;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    loading: true,
    refresh: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = () => {
        setLoading(true);
        fetch('https://api.kuttalk.kro.kr/users/me', { credentials: 'include' })
            .then(async res => (res.ok ? res.json() : null))
            .then(data => setUser(data))
            .finally(() => setLoading(false));
    };

    useEffect(fetchMe, []);

    return (
        <AuthContext.Provider value={{ user, loading, refresh: fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);