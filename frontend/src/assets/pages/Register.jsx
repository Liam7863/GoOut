import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [availableCategories, setAvailableCategories] = useState([]); 
  const [selectedCategories, setSelectedCategories] = useState([]);   
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    axios.get(`${API_URL}/api/categories`)
      .then(response => {
        setAvailableCategories(response.data);
      })
      .catch(err => console.error("Помилка:", err));
  }, []);

  const handleCategoryChange = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(`${API_URL}/api/register`, {
        name, email, password, preferred_categories: selectedCategories
      });
      
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const loginResponse = await axios.post(`${API_URL}/api/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('token', loginResponse.data.access_token);
      window.location.href = '/'; 
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка реєстрації');
    }
  };

  return (
    <div className="split-layout">
      <div className="auth-form-side">
        <div className="logo-container" style={{ marginBottom: '20px' }}>
          <span className="logo-go">GO</span><span className="logo-out">OUT</span>
        </div>
        <h2>Ініціалізація</h2>
        
        {error && <p style={{ color: '#ff003c' }}>{error}</p>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <input type="text" placeholder="NICKNAME (ІМ'Я)" className="industrial-input" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="EMAIL" className="industrial-input" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="PASSWORD" className="industrial-input" value={password} onChange={e => setPassword(e.target.value)} required />
          
          <div className="chips-container" style={{ marginTop: '15px' }}>
            <p style={{ color: 'white', marginBottom: '10px', fontSize: '12px' }}>СИГНАТУРА ІНТЕРЕСІВ (Для рекомендацій):</p>
            <div className="chips-grid">
              {availableCategories.map(cat => (
                <div 
                  key={cat}
                  className={`neon-chip ${selectedCategories.includes(cat) ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="neon-btn" style={{ marginTop: '20px' }}>Підтвердити</button>
        </form>
        
        <div className="auth-links" style={{ marginTop: '20px' }}>
          Вже в системі? <Link to="/login">Авторизація</Link>
        </div>
      </div>

      <div className="auth-image-side register-bg"></div>
    </div>
  );
}