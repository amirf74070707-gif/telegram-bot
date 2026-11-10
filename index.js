require("dotenv").config();

const config = require("./src/config");
const { createBot } = require("./src/bot");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!config.botToken) {
  fail("BOT_TOKEN در فایل .env خالی است. توکن را از BotFather بگیر و همان‌جا قرار بده.");
}

if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken)) {
  fail("فرمت BOT_TOKEN درست نیست. توکن را دوباره از BotFather کپی کن.");
}

if (!config.n8nWebhookUrl) {
  console.warn("N8N_WEBHOOK_URL خالی است. منو باز می‌شود، اما پاسخ هوش مصنوعی ارسال نمی‌شود.");
}

const bot = createBot(config);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.telegram
  .setMyCommands([
    { command: "start", description: "شروع و نمایش منو" },
    { command: "menu", description: "بازگشت به منوی اصلی" },
  ])
  .catch((error) => {
    console.error(`ثبت دستورهای منو انجام نشد: ${error.message}`);
  });

bot.launch(() => {
  console.log("ربات روشن شد. برای توقف، Ctrl+C را بزن.");
}).catch((error) => {
  console.error(`ربات روشن نشد: ${error.message}`);
  process.exit(1);
});
