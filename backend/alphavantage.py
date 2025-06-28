import httpx
import os

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
BASE_URL = "https://www.alphavantage.co/query"

async def _get_json_async(params):
    if not ALPHA_VANTAGE_API_KEY:
        raise ValueError("ALPHA_VANTAGE_API_KEY environment variable not set.")
    params["apikey"] = ALPHA_VANTAGE_API_KEY
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()  # Raise an exception for HTTP errors
        return response.json()

async def search_stock_async(keywords: str):
    params = {
        "function": "SYMBOL_SEARCH",
        "keywords": keywords,
    }
    return await _get_json_async(params)

async def get_company_overview_async(symbol: str):
    params = {
        "function": "OVERVIEW",
        "symbol": symbol,
    }
    return await _get_json_async(params)

async def get_earnings_async(symbol: str):
    params = {
        "function": "EARNINGS",
        "symbol": symbol,
    }
    return await _get_json_async(params)

async def get_daily_time_series_async(symbol: str):
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "outputsize": "compact", # or "full"
    }
    return await _get_json_async(params)

async def get_rsi_async(symbol: str, interval: str = "daily", time_period: int = 14):
    params = {
        "function": "RSI",
        "symbol": symbol,
        "interval": interval,
        "time_period": time_period,
        "series_type": "close",
    }
    return await _get_json_async(params)

async def get_bollinger_bands_async(symbol: str, interval: str = "daily", time_period: int = 20):
    params = {
        "function": "BBANDS",
        "symbol": symbol,
        "interval": interval,
        "time_period": time_period,
        "series_type": "close",
    }
    return await _get_json_async(params)

async def get_news_sentiment_async(symbol: str):
    params = {
        "function": "NEWS_SENTIMENT",
        "tickers": symbol,
    }
    return await _get_json_async(params)