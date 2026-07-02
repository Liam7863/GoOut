from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    # Добавляем поле для холодного старта. По умолчанию пустой список.
    preferred_categories: Optional[List[str]] = []

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    preferred_categories: Optional[List[str]] = []

    class Config:
        from_attributes = True