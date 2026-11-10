const TELEGRAM_LIMIT = 3900;

const REPLY_KEYS = [
  "reply",
  "output",
  "text",
  "message",
  "response",
  "result",
  "content",
  "answer",
  "data",
];

function splitText(text) {
  let rest = String(text || "").trim();
  if (!rest) return [];

  const chunks = [];

  while (rest.length > TELEGRAM_LIMIT) {
    let cut = rest.lastIndexOf("\n", TELEGRAM_LIMIT);
    if (cut < TELEGRAM_LIMIT * 0.5) {
      cut = rest.lastIndexOf(" ", TELEGRAM_LIMIT);
    }
    if (cut < TELEGRAM_LIMIT * 0.5) {
      cut = TELEGRAM_LIMIT;
    }

    const code = rest.charCodeAt(cut - 1);
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

function extractReply(data, depth = 0) {
  if (depth > 6) return "";

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith("<")) return "";
    return trimmed;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => extractReply(item, depth + 1))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (!data || typeof data !== "object") return "";

  for (const key of REPLY_KEYS) {
    if (!(key in data)) continue;
    const nested = extractReply(data[key], depth + 1);
    if (nested) return nested;
  }

  if (data.json) return extractReply(data.json, depth + 1);
  return "";
}

module.exports = {
  splitText,
  extractReply,
};
