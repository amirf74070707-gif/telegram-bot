const { Markup } = require("telegraf");
const { MAIN_MENU_LABEL, findModeById, findModeByLabel } = require("../constants/modes");
const { mainKeyboard } = require("../keyboards/menus");
const { askAgent, transcribeAudio, messageFor } = require("../services/n8nClient");
const { clearMode, getSession, tryLock, unlock } = require("../services/sessions");
const { splitText } = require("../utils/text");

const WELCOME = [
  "سلام. من دستیار سناریونویسی‌ات هستم.",
  "یکی از دکمه‌ها را انتخاب کن.",
  "برای برگشت به منوی اصلی /menu را بزن.",
].join("\n");

function startTyping(ctx) {
  let stopped = false;

  const run = async () => {
    while (!stopped) {
      try {
        await ctx.sendChatAction("typing");
      } catch {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  };

  run();
  return () => { stopped = true; };
}

function ideationKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💡 تحلیل این ایده و پیشنهاد ایده‌های مشابه", "ideation:use")],
    [Markup.button.callback("✏️ ویرایش متن استخراج‌شده", "ideation:edit")],
    [Markup.button.callback("🎙 ارسال صوت جدید", "ideation:new")],
  ]);
}

async function showTranscript(ctx, transcript) {
  const chunks = splitText(transcript);

  for (let i = 0; i < chunks.length; i++) {
    if (i === chunks.length - 1) {
      await ctx.reply(chunks[i], ideationKeyboard());
    } else {
      await ctx.reply(chunks[i]);
    }
  }
}

function settingsText(config, session) {
  const active = findModeById(session.mode);
  const connection = config.n8nWebhookUrl ? "آماده" : "آدرس Webhook وارد نشده";

  return [
    "تنظیمات",
    `قابلیت فعال: ${active ? active.label : "انتخاب نشده"}`,
    `اتصال n8n: ${connection}`,
    `حداکثر زمان انتظار: ${Math.round(config.n8nTimeoutMs / 1000)} ثانیه`,
  ].join("\n");
}

async function showWelcome(ctx) {
  clearMode(ctx.from.id);
  await ctx.reply(WELCOME, mainKeyboard());
}

async function showMainMenu(ctx) {
  clearMode(ctx.from.id);
  await ctx.reply("به منوی اصلی برگشتی. یک قابلیت انتخاب کن.", mainKeyboard());
}

async function handleAudio(ctx, config) {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (session.mode !== "ideation") {
    await ctx.reply("برای استفاده از صوت، ابتدا دکمه «ایده‌یابی» را انتخاب کن.");
    return;
  }

  if (!["voice", "audio", "document"].some((type) => ctx.message[type])) {
    await ctx.reply("لطفاً ویس یا فایل صوتی بفرست.");
    return;
  }

  const media = ctx.message.voice || ctx.message.audio || ctx.message.document;

  if (
    ctx.message.document &&
    !ctx.message.document.mime_type?.startsWith("audio/")
  ) {
    await ctx.reply("این فایل صوتی نیست. لطفاً ویس، MP3 یا M4A بفرست.");
    return;
  }

  if (media.file_size && media.file_size > 25 * 1024 * 1024) {
    await ctx.reply("حجم فایل نباید بیشتر از ۲۵ مگابایت باشد.");
    return;
  }

  if (!tryLock(userId)) {
    await ctx.reply("درخواست قبلی هنوز در حال انجام است. کمی صبر کن.");
    return;
  }

  const stopTyping = startTyping(ctx);

  try {
    await ctx.reply("🎧 دارم صوتت رو به متن تبدیل می‌کنم...");

    const fileLink = await ctx.telegram.getFileLink(media.file_id);
    const fileResponse = await fetch(fileLink);

    if (!fileResponse.ok) {
      throw new Error("download");
    }

    const audioBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const mimeType =
      media.mime_type ||
      (ctx.message.voice ? "audio/ogg" : "application/octet-stream");

    const transcript = await transcribeAudio(config, audioBuffer, mimeType);

    session.ideationTranscript = transcript;
    session.ideationStage = "confirm";

    await ctx.reply("✅ متن استخراج‌شده از صوت:");
    await showTranscript(ctx, transcript);
  } catch (error) {
    console.error("خطا در دریافت یا تبدیل صوت:", error.code || error.message);
    await ctx.reply(
      error.code ? messageFor(error) : "دریافت یا تبدیل صوت ناموفق بود. دوباره تلاش کن."
    );
  } finally {
    stopTyping();
    unlock(userId);
  }
}

function registerHandlers(bot, config) {
  bot.start(showWelcome);
  bot.command("menu", showMainMenu);
  bot.command("help", showWelcome);

  bot.command("cancel", async (ctx) => {
    clearMode(ctx.from.id);
    await ctx.reply("درخواست لغو شد.", mainKeyboard());
  });

  bot.action("ideation:edit", async (ctx) => {
    const session = getSession(ctx.from.id);
    await ctx.answerCbQuery();

    if (!session.ideationTranscript) return;

    session.ideationStage = "editing";
    await ctx.reply("متن اصلاح‌شده رو در یک پیام بفرست.");
  });

  bot.action("ideation:new", async (ctx) => {
    const session = getSession(ctx.from.id);
    await ctx.answerCbQuery();

    session.ideationTranscript = null;
    session.ideationStage = "awaiting_audio";

    await ctx.reply("باشه! ویس یا فایل صوتی جدیدت رو بفرست.");
  });

  bot.action("ideation:use", async (ctx) => {
    const userId = ctx.from.id;
    const session = getSession(userId);

    await ctx.answerCbQuery();

    if (!session.ideationTranscript) {
      await ctx.reply("متنی برای تحلیل پیدا نکردم. لطفاً دوباره صوت بفرست.");
      return;
    }

    if (!tryLock(userId)) {
      await ctx.reply("درخواست قبلی هنوز در حال انجام است.");
      return;
    }

    const stopTyping = startTyping(ctx);

    try {
      await ctx.reply("💡 دارم ایده رو تحلیل می‌کنم و ایده‌های مشابه می‌سازم...");

      const request = {
        user_id: userId,
        username: ctx.from.username || null,
        mode: "ideation",
        message: [
          "متن استخراج‌شده از صوت کاربر:",
          session.ideationTranscript,
          "",
          "این ایده را برای تولید محتوای اینستاگرام تحلیل کن.",
          "موضوع و پیام اصلی، جذابیت، قلاب، نقطه کنجکاوی، نقاط قوت و ضعف را مشخص کن.",
          "سپس حداقل ۵ ایده مشابه اما خلاقانه و متفاوت پیشنهاد بده.",
          "برای هر ایده یک عنوان و توضیح کوتاه بنویس.",
          "فعلاً سناریوی کامل ننویس.",
        ].join("\n"),
        timestamp: new Date().toISOString(),
      };

      const reply = await askAgent(config, request);

      for (const chunk of splitText(reply)) {
        await ctx.reply(chunk);
      }

      clearMode(userId);
      await ctx.reply("برای شروع دوباره، یک قابلیت از منو انتخاب کن.", mainKeyboard());
    } catch (error) {
      console.error("خطا در تحلیل ایده:", error.code || "unknown");
      await ctx.reply(messageFor(error));
    } finally {
      stopTyping();
      unlock(userId);
    }
  });

  bot.on("message", async (ctx, next) => {
    if (ctx.message.text) return next();

    const session = getSession(ctx.from.id);
    if (session.mode === "ideation") {
      await handleAudio(ctx, config);
    } else {
      await ctx.reply("لطفاً از منو یک قابلیت انتخاب کن.", mainKeyboard());
    }
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const session = getSession(userId);

    if (text === MAIN_MENU_LABEL) {
      await showMainMenu(ctx);
      return;
    }

    if (text.startsWith("/")) {
      await ctx.reply("این دستور شناخته نشد.", mainKeyboard());
      return;
    }

    const selected = findModeByLabel(text);

    if (selected) {
      if (selected.id === "settings") {
        await ctx.reply(settingsText(config, session), mainKeyboard());
        return;
      }

      session.mode = selected.id;
      session.referenceScenario = null;
      session.ideationTranscript = null;
      session.ideationStage = selected.id === "ideation" ? "awaiting_audio" : null;

      if (selected.id === "reference") {
        await ctx.reply("سناریوی نمونه‌ات رو بفرست.");
        return;
      }

      await ctx.reply(selected.intro, mainKeyboard());
      return;
    }

    if (!session.mode) {
      await ctx.reply("اول یکی از دکمه‌های منو رو انتخاب کن.", mainKeyboard());
      return;
    }

    if (session.mode === "ideation") {
      if (session.ideationStage === "editing" || session.ideationStage === "confirm") {
        session.ideationTranscript = text;
        session.ideationStage = "confirm";
        await ctx.reply("متن اصلاح‌شده ثبت شد:");
        await showTranscript(ctx, text);
      } else {
        await ctx.reply("برای ایده‌یابی لطفاً ویس یا فایل صوتی بفرست.");
      }
      return;
    }

    if (session.mode === "reference" && !session.referenceScenario) {
      session.referenceScenario = text;
      await ctx.reply("سناریوی نمونه دریافت شد. حالا موضوع یا محصول جدیدت رو بفرست.");
      return;
    }

    const isReference = session.mode === "reference";

    const request = {
      user_id: userId,
      username: ctx.from.username || null,
      mode: session.mode,
      message: isReference
        ? `سناریوی مرجع:\n${session.referenceScenario}\n\nموضوع یا محصول جدید:\n${text}\n\nیک سناریوی تازه با حفظ ساختار کلی رفرنس بنویس.`
        : text,
      timestamp: new Date().toISOString(),
    };

    if (!tryLock(userId)) {
      await ctx.reply("درخواست قبلی هنوز تمام نشده. کمی صبر کن.");
      return;
    }

    const stopTyping = startTyping(ctx);

    try {
      await ctx.reply("در حال آماده‌کردن پاسخ هستم...");
      const reply = await askAgent(config, request);

      for (const chunk of splitText(reply)) {
        await ctx.reply(chunk);
      }

      if (isReference) clearMode(userId);
    } catch (error) {
      console.error("خطا در درخواست:", error.code || "unknown");
      await ctx.reply(messageFor(error));
    } finally {
      stopTyping();
      unlock(userId);
    }
  });
}

module.exports = { registerHandlers };