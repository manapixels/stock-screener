import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import Base
from backend import crud, models, schemas

# Setup a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db")
def db_fixture():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_create_user(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    assert user.email == "test@example.com"
    assert hasattr(user, "hashed_password")

def test_get_user_by_email(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    crud.create_user(db, user_in)
    user = crud.get_user_by_email(db, "test@example.com")
    assert user.email == "test@example.com"

def test_authenticate_user(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    crud.create_user(db, user_in)
    user = crud.authenticate_user(db, "test@example.com", "password")
    assert user is not False
    assert user.email == "test@example.com"

def test_authenticate_user_wrong_password(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    crud.create_user(db, user_in)
    user = crud.authenticate_user(db, "test@example.com", "wrongpassword")
    assert user is False

def test_create_watchlist_item(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    item_in = schemas.WatchlistItemCreate(symbol="AAPL", company_name="Apple Inc.")
    item = crud.create_watchlist_item(db, item_in, user.id)
    assert item.symbol == "AAPL"
    assert item.owner_id == user.id

def test_get_watchlist_items(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    item_in1 = schemas.WatchlistItemCreate(symbol="AAPL", company_name="Apple Inc.")
    item_in2 = schemas.WatchlistItemCreate(symbol="GOOG", company_name="Alphabet Inc.")
    crud.create_watchlist_item(db, item_in1, user.id)
    crud.create_watchlist_item(db, item_in2, user.id)
    watchlist = crud.get_watchlist_items(db, user.id)
    assert len(watchlist) == 2
    assert watchlist[0].symbol == "AAPL"

def test_delete_watchlist_item(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    item_in = schemas.WatchlistItemCreate(symbol="AAPL", company_name="Apple Inc.")
    item = crud.create_watchlist_item(db, item_in, user.id)
    deleted_item = crud.delete_watchlist_item(db, item.id, user.id)
    assert deleted_item.id == item.id
    watchlist = crud.get_watchlist_items(db, user.id)
    assert len(watchlist) == 0

def test_create_stock_note(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    note_in = schemas.StockNoteCreate(symbol="AAPL", note="My first note.")
    note = crud.create_or_update_stock_note(db, user.id, note_in.symbol, note_in.note)
    assert note.symbol == "AAPL"
    assert note.note == "My first note."
    assert note.owner_id == user.id

def test_update_stock_note(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    note_in = schemas.StockNoteCreate(symbol="AAPL", note="My first note.")
    crud.create_or_update_stock_note(db, user.id, note_in.symbol, note_in.note)
    updated_note_content = "Updated note content."
    updated_note = crud.create_or_update_stock_note(db, user.id, note_in.symbol, updated_note_content)
    assert updated_note.note == updated_note_content

def test_get_stock_note(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    note_in = schemas.StockNoteCreate(symbol="AAPL", note="My first note.")
    crud.create_or_update_stock_note(db, user.id, note_in.symbol, note_in.note)
    note = crud.get_stock_note(db, user.id, "AAPL")
    assert note.note == "My first note."

def test_create_alert(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    alert_in = schemas.AlertCreate(symbol="AAPL", alert_type="RSI_BELOW", threshold=30.0)
    alert = crud.create_alert(db, alert_in, user.id)
    assert alert.symbol == "AAPL"
    assert alert.alert_type == "RSI_BELOW"
    assert alert.threshold == 30.0
    assert alert.owner_id == user.id

def test_get_alerts(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    alert_in1 = schemas.AlertCreate(symbol="AAPL", alert_type="RSI_BELOW", threshold=30.0)
    alert_in2 = schemas.AlertCreate(symbol="GOOG", alert_type="PE_RATIO_BELOW", threshold=15.0)
    crud.create_alert(db, alert_in1, user.id)
    crud.create_alert(db, alert_in2, user.id)
    alerts = crud.get_alerts(db, user.id)
    assert len(alerts) == 2
    assert alerts[0].symbol == "AAPL"

def test_delete_alert(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    alert_in = schemas.AlertCreate(symbol="AAPL", alert_type="RSI_BELOW", threshold=30.0)
    alert = crud.create_alert(db, alert_in, user.id)
    deleted_alert = crud.delete_alert(db, alert.id, user.id)
    assert deleted_alert.id == alert.id
    alerts = crud.get_alerts(db, user.id)
    assert len(alerts) == 0

def test_update_user_settings(db):
    user_in = schemas.UserCreate(email="test@example.com", password="password")
    user = crud.create_user(db, user_in)
    settings_in = schemas.UserUpdate(telegram_chat_id="12345", telegram_bot_token="abc")
    updated_user = crud.update_user_settings(db, user, settings_in)
    assert updated_user.telegram_chat_id == "12345"
    assert updated_user.telegram_bot_token == "abc"
