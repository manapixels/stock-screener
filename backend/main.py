from datetime import timedelta
import asyncio

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import models, schemas, crud, config, alphavantage, telegram_bot
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency to get the DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def read_root():
    return {"message": "Welcome to Signal App Backend!"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = crud.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(crud.get_current_user)):
    return current_user

@app.put("/users/me/settings", response_model=schemas.User)
async def update_users_me_settings(
    settings: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.update_user_settings(db=db, user=current_user, settings=settings)

@app.get("/search/stock", response_model=dict)
async def search_stock_endpoint(keywords: str):
    try:
        data = await alphavantage.search_stock_async(keywords)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching stock data")

@app.get("/stock/{symbol}", response_model=dict)
async def get_stock_details_endpoint(symbol: str):
    try:
        overview, earnings, daily_data, rsi, bbands, news_sentiment = await asyncio.gather(
            alphavantage.get_company_overview_async(symbol),
            alphavantage.get_earnings_async(symbol),
            alphavantage.get_daily_time_series_async(symbol),
            alphavantage.get_rsi_async(symbol),
            alphavantage.get_bollinger_bands_async(symbol),
            alphavantage.get_news_sentiment_async(symbol),
        )

        return {
            "overview": overview,
            "earnings": earnings,
            "daily_data": daily_data,
            "rsi": rsi,
            "bbands": bbands,
            "news_sentiment": news_sentiment,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching stock details")

@app.post("/watchlist/", response_model=schemas.WatchlistItem)
def add_to_watchlist(
    item: schemas.WatchlistItemCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.create_watchlist_item(db=db, item=item, user_id=current_user.id)

@app.get("/watchlist/", response_model=list[schemas.WatchlistItem])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.get_watchlist_items(db=db, user_id=current_user.id)

@app.delete("/watchlist/{item_id}")
def delete_from_watchlist(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    db_item = crud.delete_watchlist_item(db=db, item_id=item_id, user_id=current_user.id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found in watchlist")
    return {"message": "Item deleted successfully"}

@app.post("/stock_notes/", response_model=schemas.StockNote)
def create_stock_note(
    note: schemas.StockNoteCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.create_or_update_stock_note(db=db, user_id=current_user.id, symbol=note.symbol, note_content=note.note)

@app.get("/stock_notes/{symbol}", response_model=schemas.StockNote | None)
def get_stock_note(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.get_stock_note(db=db, user_id=current_user.id, symbol=symbol)

@app.post("/alerts/", response_model=schemas.Alert)
def create_alert(
    alert: schemas.AlertCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.create_alert(db=db, alert=alert, user_id=current_user.id)

@app.get("/alerts/", response_model=list[schemas.Alert])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    return crud.get_alerts(db=db, user_id=current_user.id)

@app.delete("/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user),
):
    db_alert = crud.delete_alert(db=db, alert_id=alert_id, user_id=current_user.id)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted successfully"}

@app.post("/send_telegram_message/")
async def send_telegram_message_endpoint(chat_id: str, message: str):
    try:
        await telegram_bot.send_telegram_message(chat_id, message)
        return {"message": "Message sent successfully!"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error sending message")

@app.get("/users/", response_model=list[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
