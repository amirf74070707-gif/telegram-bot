const { extractReply } = require("../utils/text");

class N8nError extends Error {
  constructor(code) {
    super(code);
    this.name = "N8nError";
    this.code = code;
  }
}

function messageFor(error) {
  switch (error.code) {
    case "timeout":
      return "پاسخ بیشتر از زمان تعیین‌شده طول کشید. دوباره تلاش کن.";
    case "config":
      return "آدرس Webhook در فایل .env تنظیم نشده است.";
    case "empty":
      return "n8n متن یا پاسخ معتبری برنگرداند.";
    case "http":
      return "n8n درخواست را نپذیرفت. تنظیمات Webhook را بررسی کن.";
    default:
      return "ارتباط با n8n برقرار نشد. کمی بعد دوباره تلاش کن.";
  }
}

function getHeaders(config) {
  const headers = {};

  if (config.n8nWebhookSecret) {
    headers[config.n8nWebhookHeader] = config.n8nWebhookSecret;
  }

  return headers;
}

async function askAgent(config, payload) {
  if (!config.n8nWebhookUrl) throw new N8nError("config");

  let endpoint;
  try {
    endpoint = new URL(config.n8nWebhookUrl);
  } catch {
    throw new N8nError("config");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.n8nTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getHeaders(config),
        "Content-Type": "application/json",
        Accept: "application/json, text/plain",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) throw new N8nError("http");

    let parsed = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    const reply = extractReply(parsed);
    if (!reply) throw new N8nError("empty");

    return reply;
  } catch (error) {
    if (error instanceof N8nError) throw error;
    if (error.name === "AbortError") throw new N8nError("timeout");
    throw new N8nError("network");
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeAudio(config, audioBuffer, mimeType) {
  if (!config.n8nAudioWebhookUrl) throw new N8nError("config");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.n8nTimeoutMs);

  try {
    const response = await fetch(config.n8nAudioWebhookUrl, {
      method: "POST",
      headers: {
        ...getHeaders(config),
        "Content-Type": mimeType || "application/octet-stream",
      },
      body: audioBuffer,
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) throw new N8nError("http");

    const parsed = JSON.parse(raw);
    const transcript = parsed.transcript;

    if (!transcript || !transcript.trim()) {
      throw new N8nError("empty");
    }

    return transcript.trim();
  } catch (error) {
    if (error instanceof N8nError) throw error;
    if (error.name === "AbortError") throw new N8nError("timeout");
    throw new N8nError("network");
  } finally {
    clearTimeout(timer);
  }
}
 
module.exports = {
  N8nError,
  askAgent,
  transcribeAudio,
  messageFor,
};