from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt

SECRET_KEY = "my_super_secret_diploma_key_change_me_later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """
    Converts a plain text password into a securely hashed string.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies if the provided plain text password matches the hashed password from the database.
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """
    Generates a JWT access token for user authentication.
    """
    to_encode = data.copy()
    
    # Using timezone-aware datetime is recommended in modern Python
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt