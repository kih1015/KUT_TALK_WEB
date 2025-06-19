import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import Login from './pages/Login.tsx';
import './App.css';
import {AuthProvider} from "./auth.tsx";
import {RequireAuth} from "./RequireAuth.tsx";
import Signup from "./pages/Signup.tsx";
import ChatPage from "./pages/ChatPage.tsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/signup" element={<Signup/>}/>
                    <Route path="/chat" element={
                        <RequireAuth><ChatPage/></RequireAuth>
                    }/>
                    <Route path="/" element={<Navigate to="/chat"/>}/>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
