import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import Login from './pages/Login.tsx';
import './App.css';
import MyPage from "./pages/MyPage.tsx";
import {AuthProvider} from "./auth.tsx";
import {RequireAuth} from "./RequireAuth.tsx";
import Signup from "./pages/Signup.tsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/signup" element={<Signup/>}/>
                    <Route path="/mypage" element={
                        <RequireAuth><MyPage/></RequireAuth>
                    }/>
                    <Route path="/" element={<Navigate to="/mypage"/>}/>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
