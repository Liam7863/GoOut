import numpy as np
from sqlalchemy.orm import Session
from app.api import models

def get_user_vector(db: Session, user_id: int):
    """
    Аналізує історію користувача та створює зважений словник його інтересів.
    """
    likes = db.query(models.Like).filter(models.Like.user_id == user_id).all()
    tickets = db.query(models.Ticket).filter(models.Ticket.user_id == user_id).all()

    category_weights = {}

    for like in likes:
        event = db.query(models.Event).filter(models.Event.id == like.event_id).first()
        if event and event.categories:
            for cat in event.categories:
                category_weights[cat] = category_weights.get(cat, 0) + 1

    for ticket in tickets:
        event = db.query(models.Event).filter(models.Event.id == ticket.event_id).first()
        if event and event.categories:
            for cat in event.categories:
                category_weights[cat] = category_weights.get(cat, 0) + 3

    return category_weights

def get_recommendations(db: Session, user_id: int, limit: int = 5):
    """
    Гібридний алгоритм: 
    - Коефіцієнт Жаккара для Холодного старту (нових користувачів).
    - Косинусна подібність для активних користувачів.
    """
    user_profile = get_user_vector(db, user_id)
    
    # Отримуємо об'єкт користувача, щоб дістати його стартові інтереси
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Збираємо ID подій, з якими юзер ВЖЕ взаємодіяв
    interacted_ids = [l.event_id for l in db.query(models.Like).filter(models.Like.user_id == user_id).all()] + \
                     [t.event_id for t in db.query(models.Ticket).filter(models.Ticket.user_id == user_id).all()]

    # Дістаємо всі події, які юзер ще не бачив
    query = db.query(models.Event)
    if interacted_ids:
        query = query.filter(~models.Event.id.in_(interacted_ids))
    all_unseen_events = query.all()

    recommendations = []

    # ==========================================
    # СЦЕНАРІЙ 1: ХОЛОДНИЙ СТАРТ (Метод Жаккара)
    # ==========================================
    if not user_profile:
        # Якщо юзер навіть при реєстрації не вибрав категорії — повертаємо просто останні події
        if not user or not user.preferred_categories:
            return db.query(models.Event).limit(limit).all()
        
        user_cats = set(user.preferred_categories)
        
        for event in all_unseen_events:
            if not event.categories:
                continue
            
            event_cats = set(event.categories)
            
            # Математика Жаккара: |A ∩ B| / |A ∪ B|
            intersection = len(user_cats.intersection(event_cats))
            union = len(user_cats.union(event_cats))
            
            sim = intersection / union if union > 0 else 0.0
            recommendations.append({"event": event, "similarity": sim})

    # ==========================================
    # СЦЕНАРІЙ 2: АКТИВНИЙ ЮЗЕР (Косинусна подібність)
    # ==========================================
    else:
        vocab = list(user_profile.keys())
        user_vector = np.array([user_profile[cat] for cat in vocab])
        norm_user = np.linalg.norm(user_vector)
        
        for event in all_unseen_events:
            if not event.categories:
                continue

            event_vector = np.array([1 if cat in event.categories else 0 for cat in vocab])
            norm_event = np.linalg.norm(event_vector)

            if norm_user == 0 or norm_event == 0:
                sim = 0.0
            else:
                dot_product = np.dot(user_vector, event_vector)
                sim = dot_product / (norm_user * norm_event)

            recommendations.append({"event": event, "similarity": sim})

    # Сортуємо від найбільш схожих (близьких до 1.0) до найменш схожих
    recommendations.sort(key=lambda x: x["similarity"], reverse=True)

    # Повертаємо об'єкти подій для API
    return [item["event"] for item in recommendations[:limit]]