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
  const [allEvents, setAllEvents] = useState([]); // State to store all events from the database
  const [loading, setLoading] = useState(true);
  
  // DYNAMIC DATA FOR RADAR CHART (BASED ON DATABASE ENTRIES)
  const chartData = useMemo(() => {
    // 1. Collect all unique categories that exist across the entire event database
    const uniqueCategories = new Set();
    allEvents.forEach(ev => {
      // Check both variations: 'categories' array or 'category' string
      if (ev.categories && ev.categories.length > 0) uniqueCategories.add(ev.categories[0]);
      else if (ev.category) uniqueCategories.add(ev.category);
    });
    
    const dbCategories = Array.from(uniqueCategories);

    // If events haven't loaded yet, return a placeholder geometry (e.g., a triangle)
    if (dbCategories.length === 0) {
      return [
        { subject: '', value: 0.05 },
        { subject: 'Ініціалізація...', value: 0.05 },
        { subject: '', value: 0.05 }
      ];
    }

    // 2. Count user interactions (tickets + likes) per category
    const counts = {};
    const countInteraction = (item) => {
      // Find the corresponding event in the allEvents array
      const event = allEvents.find(e => e.id === item.event_id);
      if (event) {
        const cat = (event.categories && event.categories.length > 0) ? event.categories[0] : event.category;
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      }
    };

    tickets.forEach(countInteraction);
    likes.forEach(countInteraction);

    // 3. Find the maximum value (for calculating 100% fill)
    const maxCount = Math.max(1, ...Object.values(counts));

    // 4. Build the chart based on ALL categories from the database
    return dbCategories.map(cat => {
      const userInteractions = counts[cat] || 0;
      const val = userInteractions === 0 ? 0.05 : (userInteractions / maxCount);
      
      return {
        subject: cat.length > 12 ? cat.substring(0, 12) + '...' : cat,
        value: val
      };
    });
  }, [tickets, likes, allEvents]);

  const size = 300; 
  const center = size / 2; 
  const maxRadius = 100; 

  const getPoint = (index, total, radius) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  };

  // 1. Generate the polygon points for the radar chart based on the chartData
  const dataPolygon = chartData.map((d, i) => {
    const point = getPoint(i, chartData.length, maxRadius * d.value);
    return `${point.x},${point.y}`;
  }).join(' ');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    
    // Fetch user data, tickets, likes, and all events in parallel
    Promise.all([
      axios.get(`${API_URL}/api/users/me`, config).catch(() => null),
      axios.get(`${API_URL}/api/users/me/tickets`, config).catch(() => ({ data: [] })),
      axios.get(`${API_URL}/api/users/me/likes`, config).catch(() => ({ data: [] })),
      axios.get(`${API_URL}/api/events`, config).catch(() => ({ data: [] }))
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

      {/* User Info */}
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

        {/* Radar Chart */}
        <div className="radar-container" style={{ width: size, height: size, position: 'relative' }}>
          <h3 className="radar-title" style={{ position: 'absolute', top: 0, width: '100%', textAlign: 'center' }}>
            СИГНАТУРА ІНТЕРЕСІВ
          </h3>
          
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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

            {chartData.map((d, i) => {
              const edgePoint = getPoint(i, chartData.length, maxRadius);
              const labelPoint = getPoint(i, chartData.length, maxRadius + 25); 
              return (
                <g key={d.subject}>
                  <line x1={center} y1={center} x2={edgePoint.x} y2={edgePoint.y} stroke="#444" />
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

            <polygon 
              points={dataPolygon} 
              fill="rgba(0, 243, 255, 0.2)" 
              stroke="var(--neon-blue)" 
              strokeWidth="2" 
            />
            {chartData.map((d, i) => {
              const point = getPoint(i, chartData.length, maxRadius * d.value);
              return <circle key={`dot-${i}`} cx={point.x} cy={point.y} r="4" fill="var(--neon-blue)" />;
            })}
          </svg>
        </div>
      </div>
      
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

      {/* Tab Content */}
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