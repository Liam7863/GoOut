import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tickets'); 
  
  const [userData, setUserData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [likes, setLikes] = useState([]);
  const [allEvents, setAllEvents] = useState([]); // НОВИЙ СТЕЙТ: для всіх подій з бази
  const [loading, setLoading] = useState(true);
  
  // === ДИНАМИЧЕСКИЕ ДАННЫЕ ДЛЯ РАДАРА (ИЗ БАЗЫ ДАННЫХ) ===
  const chartData = useMemo(() => {
    // 1. Збираємо всі унікальні категорії, які існують в усій базі подій
    const uniqueCategories = new Set();
    allEvents.forEach(ev => {
      // Перевіряємо обидва варіанти: масив categories або рядок category
      if (ev.categories && ev.categories.length > 0) uniqueCategories.add(ev.categories[0]);
      else if (ev.category) uniqueCategories.add(ev.category);
    });
    
    const dbCategories = Array.from(uniqueCategories);

    // Якщо події ще не завантажились, повертаємо заглушку-трикутник, щоб SVG не зламався
    if (dbCategories.length === 0) {
      return [
        { subject: '', value: 0.05 },
        { subject: 'Ініціалізація...', value: 0.05 },
        { subject: '', value: 0.05 }
      ];
    }

    // 2. Рахуємо кількість твоїх лайків та квитків
    const counts = {};
    const countInteraction = (item) => {
      // Шукаємо подію в загальній базі по ID
      const event = allEvents.find(e => e.id === item.event_id);
      if (event) {
        const cat = (event.categories && event.categories.length > 0) ? event.categories[0] : event.category;
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      }
    };

    tickets.forEach(countInteraction);
    likes.forEach(countInteraction);

    // 3. Знаходимо максимальне значення (для розрахунку 100% заповнення)
    const maxCount = Math.max(1, ...Object.values(counts));

    // 4. Будуємо графік на основі ВСІХ категорій з бази
    return dbCategories.map(cat => {
      const userInteractions = counts[cat] || 0;
      // Якщо лайків у цій категорії 0, ставимо 0.05, щоб точка просто лежала близько до центру
      const val = userInteractions === 0 ? 0.05 : (userInteractions / maxCount);
      
      return {
        subject: cat.length > 12 ? cat.substring(0, 12) + '...' : cat, // Обрізаємо довгі назви
        value: val
      };
    });
  }, [tickets, likes, allEvents]);

  // === МАТЕМАТИКА ОТРИСОВКИ РАДАРА ===
  const size = 300; // Общий размер SVG
  const center = size / 2; // Центр (150)
  const maxRadius = 100; // Радиус самой большой паутины

  // Функция для вычисления X и Y по углу и радиусу
  const getPoint = (index, total, radius) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  };

  // 1. Рисуем многоугольник самих данных
  const dataPolygon = chartData.map((d, i) => {
    const point = getPoint(i, chartData.length, maxRadius * d.value);
    return `${point.x},${point.y}`;
  }).join(' ');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Робимо 4 запити одночасно (включаючи завантаження всієї бази)
    Promise.all([
      axios.get('http://127.0.0.1:8000/api/users/me', config).catch(() => null),
      axios.get('http://127.0.0.1:8000/api/users/me/tickets', config).catch(() => ({ data: [] })),
      axios.get('http://127.0.0.1:8000/api/users/me/likes', config).catch(() => ({ data: [] })),
      axios.get('http://127.0.0.1:8000/api/events', config).catch(() => ({ data: [] }))
    ])
    .then(([userRes, ticketsRes, likesRes, eventsRes]) => {
      setUserData(userRes?.data || { name: "Олексій", email: "user@network.local", status: "Active" });
      setTickets(ticketsRes.data);
      setLikes(likesRes.data);
      setAllEvents(eventsRes.data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div className="loading-screen">АВТОРИЗАЦІЯ СИСТЕМИ...</div>;

  return (
    <div className="profile-container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← ГОЛОВНИЙ ТЕРМІНАЛ
      </button>

      {/* ДОСЬЄ КОРИСТУВАЧА З РАДАРОМ */}
      <div className="profile-header">
        <div className="profile-info-block">
          <div className="user-avatar">
            {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h1>{userData?.name || 'User'}</h1>
            <p className="user-email">{userData?.email || 'email@unknown.com'}</p>
            <span className="user-status">СТАТУС: {userData?.status || 'ОНЛАЙН'}</span>
          </div>
        </div>

        {/* НАШ КАСТОМНЫЙ SVG РАДАР */}
        <div className="radar-container" style={{ width: size, height: size, position: 'relative' }}>
          <h3 className="radar-title" style={{ position: 'absolute', top: 0, width: '100%', textAlign: 'center' }}>
            СИГНАТУРА ІНТЕРЕСІВ
          </h3>
          
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Рисуем фоновую паутину (уровни 20%, 40%, 60%, 80%, 100%) */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
              <polygon 
                key={level}
                points={chartData.map((_, i) => {
                  const p = getPoint(i, chartData.length, maxRadius * level);
                  return `${p.x},${p.y}`;
                }).join(' ')}
                fill="none" 
                stroke="#333" 
                strokeDasharray={level === 1 ? "0" : "3 3"} 
              />
            ))}

            {/* Рисуем оси от центра к краям и подписи */}
            {chartData.map((d, i) => {
              const edgePoint = getPoint(i, chartData.length, maxRadius);
              const labelPoint = getPoint(i, chartData.length, maxRadius + 25); // Подписи чуть дальше края
              return (
                <g key={d.subject}>
                  {/* Линия оси */}
                  <line x1={center} y1={center} x2={edgePoint.x} y2={edgePoint.y} stroke="#444" />
                  {/* Текст категории */}
                  <text 
                    x={labelPoint.x} 
                    y={labelPoint.y} 
                    fill="#888" 
                    fontSize="12" 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                    letterSpacing="1px"
                  >
                    {d.subject}
                  </text>
                  {/* Значение (опционально, можно убрать) */}
                  <text 
                    x={labelPoint.x} 
                    y={labelPoint.y + 15} 
                    fill="var(--neon-blue)" 
                    fontSize="10" 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                  >
                    {Math.round(d.value * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Рисуем сам многоугольник данных юзера */}
            <polygon 
              points={dataPolygon} 
              fill="rgba(0, 243, 255, 0.2)" 
              stroke="var(--neon-blue)" 
              strokeWidth="2" 
            />
            {/* Точки на углах многоугольника */}
            {chartData.map((d, i) => {
              const point = getPoint(i, chartData.length, maxRadius * d.value);
              return <circle key={`dot-${i}`} cx={point.x} cy={point.y} r="4" fill="var(--neon-blue)" />;
            })}
          </svg>
        </div>
      </div>
      
      {/* НАВІГАЦІЯ (ТАБИ) */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          МОЇ КВИТКИ
        </button>
        <button 
          className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
          onClick={() => setActiveTab('likes')}
        >
          ЗБЕРЕЖЕНІ СИГНАТУРИ (MATCH)
        </button>
      </div>

      {/* КОНТЕНТ ТАБІВ */}
      <div className="tab-content">
        
        {activeTab === 'tickets' && (
          <div className="tickets-grid">
            {tickets.length > 0 ? (
              tickets.map((ticket, index) => (
                <div key={ticket.id || index} className="ticket-card">
                  <div className="ticket-info">
                    <h3>{ticket.event?.title || 'Невідома подія'}</h3>
                    <p className="ticket-date">Дата: {ticket.event?.date || 'Не вказана'}</p>
                    <p className="ticket-id">ID транзакції: #{ticket.id || 'N/A'}</p>
                  </div>
                  <div className="ticket-barcode">
                    |||| || ||| || |||| | ||
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>У вас ще немає придбаних квитків.</p>
                <button className="neon-btn btn-small" onClick={() => navigate('/')}>ЗНАЙТИ ПОДІЇ</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="likes-grid">
            {likes.length > 0 ? (
              likes.map((like, index) => (
                <div key={like.id || index} className="liked-event-card" onClick={() => navigate(`/event/${like.event_id}`)}>
                  <h4>{like.event?.title || 'Подія'}</h4>
                  <span className="neon-text">Перейти до події →</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>Ви ще не додали жодної події до обраного.</p>
                <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>Алгоритм чекає на ваші дані для навчання.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}