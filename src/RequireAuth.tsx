// RequireAuth.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import type {JSX} from "react";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>로딩 중…</div>;
    if (!user)   return <Navigate to="/login" replace />;

    return children;
};
