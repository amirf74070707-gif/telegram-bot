import asyncio
import os
from pathlib import Path

import aiohttp

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode


def load_env(path=".env"):
    file = Path(path)
    if not file.exists():
        return
    for line in file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env()
TOKEN = os.environ.get("BOT_TOKEN", "")
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "")

bot = Bot(
    token=TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)

dp = Dispatcher()

keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="🎬 رفرنس سناریو"),
            KeyboardButton(text="💡 ایده‌یابی")
        ]
    ],
    resize_keyboard=True
)


@dp.message(CommandStart())
async def start(message: Message):
    await message.answer(
        "سلام! به ربات سناریونویسی خوش اومدی ❤️",
        reply_markup=keyboard
    )


@dp.message(F.text)
async def handle_message(message: Message):
    await message.answer("⏳ دارم فکر می‌کنم...")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                N8N_WEBHOOK_URL,
                json={
                    "message": {
                        "text": message.text
                    },
                    "user_id": message.from_user.id
                },
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:

                response.raise_for_status()
                data = await response.json()

        reply = data.get("reply", "پاسخی دریافت نشد.")

        await message.answer(reply)

    except Exception as e:
        print("ERROR:", e)
        await message.answer("ارتباط با هوش مصنوعی برقرار نشد. دوباره تلاش کن.")


async def main():
    if not TOKEN or not N8N_WEBHOOK_URL:
        raise SystemExit("BOT_TOKEN و N8N_WEBHOOK_URL را در فایل .env قرار بده.")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())