from telegram import Bot
import os

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def send_telegram_message(chat_id: str, message: str):
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable not set.")
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    await bot.send_message(chat_id=chat_id, text=message)
