import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('token', response.data.access_token);
      window.location.href = '/'; 
    } catch (err) {
      setError(err.response?.data?.detail || 'Невірний логін або пароль');
    }
  };

  return (
    <div className="split-layout">
      <div className="auth-form-side">
        <div className="logo-container" style={{ marginBottom: '40px' }}>
          <span className="logo-go">GO</span>
          <span className="logo-out">OUT</span>
        </div>
        
        <h2>Вхід у систему</h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>Отримай доступ до кращих подій міста.</p>
        
        {error && <p style={{ color: '#ff003c', margin: '0 0 10px 0' }}>{error}</p>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="EMAIL" 
            className="industrial-input" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="PASSWORD" 
            className="industrial-input" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="neon-btn">Увійти</button>
        </form>
        
        <div className="auth-links" style={{ marginTop: '20px' }}>
          Немає акаунту? <Link to="/register">Створити (Реєстрація)</Link>
        </div>
      </div>

      <div className="auth-image-side login-bg"></div>
    </div>
  );
}