import {Routes, Route, BrowserRouter, Navigate} from 'react-router-dom';
import Login from './pages/Login.tsx';
import './App.css';
import MyPage from "./pages/MyPage.tsx";
import {AuthProvider} from "./auth.tsx";
import {RequireAuth} from "./RequireAuth.tsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"  element={<Login />} />
                    <Route path="/mypage" element={
                        <RequireAuth><MyPage /></RequireAuth>
                    } />
                    <Route path="/"       element={<Navigate to="/mypage" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
