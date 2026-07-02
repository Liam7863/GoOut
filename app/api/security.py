from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

# Секретний ключ для підпису токенів (у реальному проекті його ховають у файл .env)
SECRET_KEY = "my_super_secret_diploma_key_change_me_later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Токен живе 7 днів

# Налаштування алгоритму хешування (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Перетворює звичайний пароль на хеш"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Перевіряє, чи збігається введений пароль із хешем у базі"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    """Створює JWT токен (електронну перепустку)"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt