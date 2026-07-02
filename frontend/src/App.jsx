import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './assets/pages/Home';
import Login from './assets/pages/Login';
import Register from './assets/pages/Register';
import EventDetails from './assets/pages/EventDetails'; 
import Profile from './assets/pages/Profile';
import './App.css';

// Компонент-Охранник (Protected Route)
// Проверяет наличие токена. Если его нет -> редирект на регистрацию
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/register" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/event/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;