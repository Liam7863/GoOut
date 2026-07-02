import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EventDetails.css';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Стейты интерфейса
  const [isLiked, setIsLiked] = useState(false);
  const [isBought, setIsBought] = useState(false);
  const [quantity, setQuantity] = useState(1); // НОВЕ: Кількість квитків
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.get(`http://127.0.0.1:8000/api/events/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setEvent(res.data);
      // Якщо твій бекенд навчиться віддавати статус лайка, він підхопиться тут:
      if (res.data.is_liked) setIsLiked(true); 
      setLoading(false);
    })
    .catch(err => {
      setError("Подію не знайдено або сталася помилка на сервері.");
      setLoading(false);
    });
  }, [id, navigate]);

  // === ВІДРЕФАКТОРЕНА ЛОГІКА ЛАЙКІВ (TOGGLE) ===
  const handleLike = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://127.0.0.1:8000/api/events/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Якщо бекенд повернув повідомлення про видалення або ми просто знаємо, що лайк вже стояв
      if (isLiked) {
        setIsLiked(false);
        showNotification("Подію видалено з обраного.");
      } else {
        setIsLiked(true);
        showNotification("Подію збережено.");
      }
    } catch (err) {
      console.error(err);
      showNotification("Помилка синхронізації з сервером.");
    }
  };

  // === ЛОГІКА КУПІВЛІ (З КІЛЬКІСТЮ) ===
  const handleBuy = async () => {
    try {
      const token = localStorage.getItem('token');
      // Передаємо кількість квитків через Query Parameters
      await axios.post(`http://127.0.0.1:8000/api/events/${id}/buy?quantity=${quantity}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsBought(true);
      showNotification(`Транзакція успішна. Придбано квитків: ${quantity}.`);
    } catch (err) {
      showNotification("Помилка оформлення квитка.");
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  if (loading) return <div className="loading-screen">Ініціалізація даних...</div>;
  if (error) return (
    <div className="event-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2 style={{ color: '#ff003c' }}>{error}</h2>
      <button className="neon-btn" style={{ width: '200px', marginTop: '20px' }} onClick={() => navigate(-1)}>Повернутися</button>
    </div>
  );

  const img = event.image_url || "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1200";
  const type = event.categories && event.categories.length > 0 ? event.categories[0] : 'Подія';
  // Динамічний підрахунок ціни
  const basePrice = event.price || 0;
  const totalPrice = basePrice > 0 ? `${basePrice * quantity} ₴` : 'Free';

  return (
    <div className="event-page-container">
      {notification && <div className="toast-notification">{notification}</div>}

      <button className="back-btn" onClick={() => navigate(-1)}>← ПОВЕРНУТИСЯ</button>

      <div className="event-hero" style={{ backgroundImage: `url(${img})` }}>
        <div className="hero-overlay">
          <span className="event-badge">{type}</span>
          <h1 className="hero-title">{event.title}</h1>
        </div>
      </div>

      <div className="event-content-grid">
        <div className="event-description-col">
          <h2>Про подію</h2>
          <p className="event-text">{event.description || "Опис відсутній."}</p>
          <h2 style={{ marginTop: '40px' }}>Локація</h2>
          <p className="event-text" style={{ color: 'var(--neon-blue)' }}>📍 {event.location || "Секретна локація"}</p>
        </div>

        <div className="event-buy-panel">
          <div className="panel-row">
            <span className="panel-label">Вартість 1 шт:</span>
            <span className="panel-value">{basePrice > 0 ? `${basePrice} ₴` : 'Безкоштовно'}</span>
          </div>

          {/* НОВИЙ БЛОК: Вибір кількості */}
          <div className="panel-row" style={{ alignItems: 'center', marginTop: '15px' }}>
            <span className="panel-label">Кількість:</span>
            <div className="quantity-controls">
              <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
              <span className="qty-value">{quantity}</span>
              <button className="qty-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>
          </div>

          <div className="panel-divider"></div>
          
          <div className="panel-row price-row">
            <span className="panel-label">Разом:</span>
            <span className="panel-price">{totalPrice}</span>
          </div>
          
          <button 
            className={`neon-btn buy-btn ${isBought ? 'btn-success' : ''}`}
            onClick={handleBuy}
            disabled={isBought}
          >
            {isBought ? '✓ ОПЛАЧЕНО' : 'ПРИДБАТИ КВИТКИ'}
          </button>
          
          <button 
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
             {isLiked ? '✓ В ОБРАНОМУ' : 'ДОДАТИ В ОБРАНЕ (MATCH)'}
          </button>
        </div>
      </div>
    </div>
  );
}