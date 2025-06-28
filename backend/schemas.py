from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    telegram_chat_id: Optional[str] = None
    telegram_bot_token: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    telegram_chat_id: Optional[str] = None
    telegram_bot_token: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class WatchlistItemBase(BaseModel):
    symbol: str
    company_name: str

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItem(WatchlistItemBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class StockNoteBase(BaseModel):
    symbol: str
    note: str

class StockNoteCreate(StockNoteBase):
    pass

class StockNote(StockNoteBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    symbol: str
    alert_type: str
    threshold: float
    is_active: bool = True

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True