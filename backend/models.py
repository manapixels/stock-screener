from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    telegram_chat_id = Column(String, nullable=True)
    telegram_bot_token = Column(String, nullable=True)

    watchlist = relationship("WatchlistItem", back_populates="owner")
    stock_notes = relationship("StockNote", back_populates="owner")
    alerts = relationship("Alert", back_populates="owner")

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    company_name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="watchlist")

class StockNote(Base):
    __tablename__ = "stock_notes"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    note = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="stock_notes")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    alert_type = Column(String) # e.g., "PE_RATIO_BELOW", "RSI_BELOW", etc.
    threshold = Column(Float)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="alerts")
