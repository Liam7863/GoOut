import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  // === СТЕЙТЫ (СОСТОЯНИЯ) ===
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [viewMode, setViewMode] = useState('events'); 
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date');

  // === ДАННЫЕ ИЗ БАЗЫ (Теперь пустые массивы по умолчанию) ===
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // === ЗАГРУЗКА ДАННЫХ ИЗ FASTAPI ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login'); // Если нет токена, выкидываем на логин
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 1. Завантажуємо категорії
    axios.get('http://127.0.0.1:8000/api/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error("Помилка категорій:", err));

    // 2. Завантажуємо всі події
    axios.get('http://127.0.0.1:8000/api/events')
      .then(res => setEvents(res.data))
      .catch(err => console.error("Помилка подій:", err));

    // 3. Завантажуємо персональні рекомендації (працює ML-алгоритм!)
    axios.get('http://127.0.0.1:8000/api/recommendations?limit=5', config)
      .then(res => setRecommendations(res.data))
      .catch(err => console.error("Помилка рекомендацій:", err));
  }, [navigate]);

  // Логіка виходу
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // === ЛОГІКА ФІЛЬТРАЦІЇ ТА СОРТУВАННЯ ===
  const processedEvents = events
    .filter(ev => {
      const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Перевіряємо, чи є обраний тег у масиві категорій події
      const matchesTag = activeTag ? (ev.categories && ev.categories.includes(activeTag)) : true;
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      // Використовуємо fallback (0), якщо ціни раптом немає в базі
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'date') return new Date(a.date || '2026-01-01') - new Date(b.date || '2026-01-01');
      return 0;
    });

  return (
    <div className="home-container">
      {/* ================= БЛОК 1: ХЕДЕР ================= */}
      <header className="industrial-header">
        <div className="logo-container">
          <span className="logo-go">GO</span><span className="logo-out">OUT</span>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => navigate('/profile')} className="neon-btn btn-small" style={{ width: 'auto' }}>
            МIЙ ПРОФІЛЬ
          </button>
          <button onClick={handleLogout} className="logout-btn">DISCONNECT</button>
        </div>
      </header>

      {/* ================= БЛОК 2: РЕКОМЕНДАЦІЇ ================= */}
      <section className="recommendations-section">
        <h2 className="section-title">Сигнатура збігів (Recommend)</h2>
        <div className="recommendations-scroll">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => {
              // Берем першу категорію для бейджа
              const type = rec.categories && rec.categories.length > 0 ? rec.categories[0] : 'Event';
              // Ставимо заглушку, якщо в базі поки немає картинки
              const img = rec.image_url || "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800";
              
              return (
                <div 
                  key={rec.id} 
                  className="recommendation-card" 
                  onClick={() => navigate(`/event/${rec.id}`)}
                >
                  <div className="rec-image-wrapper">
                    <img src={img} alt={rec.title} />
                    <div className="match-badge">Top Match</div>
                    <div className="rec-overlay">
                      <span className="event-type">{type}</span>
                      <h3>{rec.title}</h3>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
             <p style={{color: '#555', fontStyle: 'italic', padding: '20px 0'}}>Алгоритм аналізує ваш профіль...</p>
          )}
        </div>
      </section>

      {/* ================= БЛОК 3: ПАНЕЛЬ ФІЛЬТРІВ ТА ПОШУК ================= */}
      <div className="filter-panel">
        <div className="filter-tags">
          {categories.slice(0, 5).map(tag => (
            <span 
              key={tag} 
              className={`filter-tag ${activeTag === tag ? 'active' : ''}`}
              onClick={() => {
                setActiveTag(activeTag === tag ? '' : tag);
                setViewMode('events'); 
              }}
            >
              {tag}
            </span>
          ))}
          <span 
            className={`filter-tag filter-tag-all ${viewMode === 'categories' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'categories' ? 'events' : 'categories')}
          >
            УСІ...
          </span>
        </div>

        {/* СОРТУВАННЯ */}
        <div className="sort-wrapper">
          <select 
            className="industrial-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Дата (найближчі)</option>
            <option value="price_asc">Ціна (від дешевих)</option>
            <option value="price_desc">Ціна (від дорогих)</option>
          </select>
        </div>

        {/* Анімоване поле пошуку */}
        <div className={`search-wrapper ${isSearchOpen ? 'open' : ''}`}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder={isSearchOpen ? "Ідентифікація події..." : ""} 
            className="industrial-search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setViewMode('events'); 
            }}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => {
              if (searchQuery.trim() === '') {
                setIsSearchOpen(false);
              }
            }}
          />
        </div>
      </div>

      {/* ================= БЛОК 4: ДИНАМІЧНА СІТКА ================= */}
      <main className="events-grid">
        {viewMode === 'categories' ? (
          categories.map(cat => (
            <div key={cat} className="category-card" onClick={() => { setActiveTag(cat); setViewMode('events'); }}>
              <h3>{cat}</h3>
              <div className="category-decor"></div>
            </div>
          ))
        ) : (
          processedEvents.map(ev => {
            const type = ev.categories && ev.categories.length > 0 ? ev.categories[0] : 'Event';
            const img = ev.image_url || "https://images.unsplash.com/photo-1507676184212-d0330a156f95?w=500";
            const price = ev.price || 0;

            return (
              <div key={ev.id} className="event-card">
                <div className="card-image-wrapper">
                  <img src={img} alt={ev.title} />
                  <div className="card-overlay">
                    <span className="event-type">{type}</span>
                  </div>
                </div>
                <div className="card-info">
                  <h3>{ev.title}</h3>               
                  <div className="card-bottom">
                    <span style={{ color: 'var(--neon-blue)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {ev.price} ₴
                    </span>
                    <button className="neon-btn btn-small" style={{ width: 'auto', padding: '6px 16px' }}
                    onClick={() => navigate(`/event/${ev.id}`)}
                    >
                      ДЕТАЛІ
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Повідомлення, якщо подій немає */}
        {viewMode === 'events' && processedEvents.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#555', padding: '40px' }}>
            Подій не знайдено.
          </div>
        )}
      </main>
    </div>
  );
}