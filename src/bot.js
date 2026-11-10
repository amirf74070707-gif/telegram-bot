const { Telegraf } = require("telegraf");
const { registerHandlers } = require("./handlers/messages");

function createBot(config) {
  const bot = new Telegraf(config.botToken);
  registerHandlers(bot, config);

  bot.catch((error, ctx) => {
    console.error(`خطای داخلی: ${error.message}`);
    if (!ctx || !ctx.reply) return;
    ctx.reply("یک خطای داخلی پیش آمد. دوباره تلاش کن.").catch(() => {});
  });

  return bot;
}

module.exports = { createBot };
