import os
import sys

# Third-party libraries (FastAPI, SQLAlchemy, JWT)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError

# Path configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Local project imports
from app.api.database import SessionLocal, engine
from app.api import models, schemas, security
from app.api.recommendations import get_recommendations

# Application initialization
app = FastAPI(title="Kyiv Events API")

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://go-out-seven.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for safe database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# BASE ROUTES

@app.get("/")
def read_root():
    return {"status": "Сервер працює!", "project": "Diploma Backend"}

@app.get("/api/events")
def get_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    return events

# NEW ROUTE FOR COLD START: Retrieve the list of categories
@app.get("/api/categories", response_model=list[str])
def get_all_categories(db: Session = Depends(get_db)):
    """
    Returns a list of unique categories from all events.
    Used on the frontend for selecting interests during registration.
    """
    events = db.query(models.Event.categories).filter(models.Event.categories.isnot(None)).all()
    
    unique_categories = set()
    for event in events:
        if event[0]: 
            for category in event[0]:
                unique_categories.add(category)
                
    return sorted(list(unique_categories))


# AUTHENTICATION AND REGISTRATION

@app.post("/api/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Користувач з таким Email вже існує")
    
    hashed_password = security.get_password_hash(user.password)
    
    # SAVE CATEGORIES FROM REGISTRATION FORM
    new_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        preferred_categories=user.preferred_categories 
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неправильний email або пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ROUTE PROTECTION (Tokens)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не вдалося перевірити токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# INTERACTION AND RECOMMENDATIONS

@app.post("/api/events/{event_id}/like", status_code=status.HTTP_201_CREATED)
def like_event(event_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Подію не знайдено")

    existing_like = db.query(models.Like).filter(
        models.Like.user_id == current_user.id,
        models.Like.event_id == event_id
    ).first()

    if existing_like:
        db.delete(existing_like)
        db.commit()
        return {"message": "Лайк видалено"}

    new_like = models.Like(user_id=current_user.id, event_id=event_id)
    db.add(new_like)
    db.commit()
    return {"message": "Лайк додано успішно"}

@app.post("/api/events/{event_id}/buy", status_code=status.HTTP_201_CREATED)
def buy_ticket(event_id: int, quantity: int = 1, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Подію не знайдено")

    for _ in range(quantity):
        new_ticket = models.Ticket(user_id=current_user.id, event_id=event_id)
        db.add(new_ticket)
        
    db.commit()
    return {"message": f"Квитки ({quantity} шт.) успішно придбано"}

@app.get("/api/recommendations")
def get_personal_recommendations(limit: int = 5, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns a personalized list of events based on the cosine similarity algorithm (or Jaccard index for new users).
    """
    recommended_events = get_recommendations(db, user_id=current_user.id, limit=limit)
    return recommended_events

@app.get("/api/events/{event_id}")
def get_single_event(event_id: int, db: Session = Depends(get_db)):
    # Search for an event in the database by its ID (using models.Event)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    
    # If the event does not exist, return a formatted error
    if not event:
        raise HTTPException(status_code=404, detail="Подію не знайдено")
        
    return event

@app.get("/api/users/me")
def get_user_profile(current_user: models.User = Depends(get_current_user)):

    real_name = current_user.name if getattr(current_user, 'name', None) else current_user.email.split('@')[0].capitalize()

    return {
        "id": current_user.id,
        "name": real_name,
        "email": current_user.email,
        "status": "ОНЛАЙН"
    }

@app.get("/api/users/me/tickets")
def get_user_tickets(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all tickets for this user
    tickets = db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id).all()
    
    result = []
    for t in tickets:
        # Fetch the title and date of the event for each ticket
        event = db.query(models.Event).filter(models.Event.id == t.event_id).first()
        result.append({
            "id": t.id,
            "event_id": t.event_id,
            "event": {
                "title": event.title if event else "Видалена подія",
                "date": str(event.date) if event and event.date else "Не вказана"
            }
        })
    return result

@app.get("/api/users/me/likes")
def get_user_likes(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all likes for this user
    likes = db.query(models.Like).filter(models.Like.user_id == current_user.id).all()
    
    result = []
    for l in likes:
        event = db.query(models.Event).filter(models.Event.id == l.event_id).first()
        if event:
            result.append({
                "id": l.id,
                "event_id": l.event_id,
                "event": {
                    "title": event.title
                }
            })
    return result