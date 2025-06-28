from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from . import models, schemas, config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email=email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session, token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def get_watchlist_items(db: Session, user_id: int):
    return db.query(models.WatchlistItem).filter(models.WatchlistItem.owner_id == user_id).all()

def create_watchlist_item(db: Session, item: schemas.WatchlistItemCreate, user_id: int):
    db_item = models.WatchlistItem(**item.model_dump(), owner_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_watchlist_item(db: Session, item_id: int, user_id: int):
    db_item = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == item_id, models.WatchlistItem.owner_id == user_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

def get_stock_note(db: Session, user_id: int, symbol: str):
    return db.query(models.StockNote).filter(models.StockNote.owner_id == user_id, models.StockNote.symbol == symbol).first()

def create_or_update_stock_note(db: Session, user_id: int, symbol: str, note_content: str):
    db_note = get_stock_note(db, user_id, symbol)
    if db_note:
        db_note.note = note_content
    else:
        db_note = models.StockNote(owner_id=user_id, symbol=symbol, note=note_content)
        db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def get_alerts(db: Session, user_id: int):
    return db.query(models.Alert).filter(models.Alert.owner_id == user_id).all()

def create_alert(db: Session, alert: schemas.AlertCreate, user_id: int):
    db_alert = models.Alert(**alert.model_dump(), owner_id=user_id)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def delete_alert(db: Session, alert_id: int, user_id: int):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.owner_id == user_id).first()
    if db_alert:
        db.delete(db_alert)
        db.commit()
    return db_alert

def update_user_settings(db: Session, user: models.User, settings: schemas.UserUpdate):
    if settings.telegram_chat_id is not None:
        user.telegram_chat_id = settings.telegram_chat_id
    if settings.telegram_bot_token is not None:
        user.telegram_bot_token = settings.telegram_bot_token
    db.commit()
    db.refresh(user)
    return user