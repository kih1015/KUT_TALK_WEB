import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import './App.css';
import MyPage from "./pages/MyPage.tsx";

function App() {
    return (
        <div className="app-wrapper">
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/mypage" element={<MyPage />} />
            </Routes>
        </div>
    );
}

export default App;
