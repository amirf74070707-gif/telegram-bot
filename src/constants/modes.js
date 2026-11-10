const MAIN_MENU_LABEL = "🏠 منوی اصلی";

const MODES = [
  {
    id: "reference",
    label: "📚 رفرنس سناریو",
    intro: "سناریوی نمونه‌ات را بفرست.",
  },
  {
    id: "ideation",
    label: "💡 ایده‌یابی",
    intro: "ویس یا فایل صوتی (MP3، M4A) بفرست تا متنش را استخراج کنم.",
  },
  {
    id: "writing",
    label: "✍️ سناریونویسی",
    intro: "موضوع سناریو را بنویس.",
  },
  {
    id: "research",
    label: "🔎 تحقیق و ترند",
    intro: "موضوع تحقیق را بنویس.",
  },
  {
    id: "rewrite",
    label: "🔄 بازنویسی سناریو",
    intro: "متن سناریو را بفرست.",
  },
  {
    id: "calendar",
    label: "📅 تقویم محتوا",
    intro: "موضوع و بازه زمانی را بنویس.",
  },
  {
    id: "audience",
    label: "🎯 تحلیل مخاطب",
    intro: "محصول یا موضوع را معرفی کن.",
  },
  {
    id: "settings",
    label: "⚙️ تنظیمات",
    intro: "",
  },
];

function findModeByLabel(label) {
  return MODES.find((mode) => mode.label === label) || null;
}

function findModeById(id) {
  return MODES.find((mode) => mode.id === id) || null;
}

module.exports = {
  MAIN_MENU_LABEL,
  MODES,
  findModeByLabel,
  findModeById,
};