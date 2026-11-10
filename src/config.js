function read(name) {
  const value = process.env[name];
  if (!value) return "";
  return value.trim();
}

function readTimeout() {
  const value = Number(read("N8N_TIMEOUT_MS"));
  if (!Number.isFinite(value) || value < 1000) return 120000;
  return value;
}

function readHeaderName() {
  const value = read("N8N_WEBHOOK_HEADER") || "X-Webhook-Secret";
  if (!/^[A-Za-z0-9-]+$/.test(value)) return "X-Webhook-Secret";
  return value;
}

module.exports = {
  botToken: read("BOT_TOKEN"),
  n8nWebhookUrl: read("N8N_WEBHOOK_URL"),
  n8nAudioWebhookUrl: read("N8N_AUDIO_WEBHOOK_URL"),
  n8nWebhookSecret: read("N8N_WEBHOOK_SECRET"),
  n8nWebhookHeader: readHeaderName(),
  n8nTimeoutMs: readTimeout(),
};