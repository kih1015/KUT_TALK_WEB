import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login.tsx';
import Signup from './pages/Signup/Signup.tsx';
import './App.css';

function App() {
    return (
        <div className="app-wrapper">
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </div>
    );
}

export default App;
