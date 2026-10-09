const BOT_PUBLIC_CONFIG_VERSION = "public-profile-v3";

const DEFAULT_LOCALE = "en";
const PUBLIC_LOCALES = ["en", "ru", "de", "fr", "uk"];

const PROFILE = {
  en: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown → Rich Messages. Built with GPT-6.1.",
    description:
      "Markdown → Rich Message. Telegram Markdown & Media Converter for text, .md files, photos, audio, video and documents. Media are linked automatically and long documents are split safely. Built with GPT-6.1. GitHub: https://github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "How to use the bot" },
      { command: "test", description: "Show the Rich Message Test Page" },
      { command: "media", description: "Show media in the current draft" },
      { command: "send", description: "Build and send the current draft" },
      { command: "clear", description: "Discard the current draft" },
      { command: "privacy", description: "Privacy and temporary storage" },
    ],
  },
  ru: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown и медиа → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Telegram Markdown & Media Converter: Markdown, .md-файлы, фото, аудио, видео и документы превращаются в Telegram Rich Messages. Сделано с помощью GPT-6.1. GitHub: https://github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Как пользоваться ботом" },
      { command: "test", description: "Показать тестовую Rich Message страницу" },
      { command: "media", description: "Показать медиа текущего черновика" },
      { command: "send", description: "Собрать и отправить текущий черновик" },
      { command: "clear", description: "Удалить текущий черновик" },
      { command: "privacy", description: "Конфиденциальность и хранение данных" },
    ],
  },
  de: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown und Medien → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Telegram Markdown & Media Converter für Markdown, .md-Dateien, Fotos, Audio, Video und Dokumente. Medien werden automatisch verknüpft. Erstellt mit GPT-6.1. GitHub: https://github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Hilfe zur Benutzung" },
      { command: "test", description: "Rich-Message-Testseite anzeigen" },
      { command: "media", description: "Medien im aktuellen Entwurf anzeigen" },
      { command: "send", description: "Aktuellen Entwurf erstellen und senden" },
      { command: "clear", description: "Aktuellen Entwurf löschen" },
      { command: "privacy", description: "Datenschutz und temporäre Speicherung" },
    ],
  },
  fr: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown et médias → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Telegram Markdown & Media Converter pour Markdown, fichiers .md, photos, audio, vidéo et documents. Les médias sont liés automatiquement. Créé avec GPT-6.1. GitHub : https://github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Mode d’emploi du bot" },
      { command: "test", description: "Afficher la page de test Rich Message" },
      { command: "media", description: "Afficher les médias du brouillon" },
      { command: "send", description: "Construire et envoyer le brouillon" },
      { command: "clear", description: "Supprimer le brouillon actuel" },
      { command: "privacy", description: "Confidentialité et stockage temporaire" },
    ],
  },
  uk: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown і медіа → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Telegram Markdown & Media Converter для Markdown, .md-файлів, фото, аудіо, відео та документів. Медіа прив’язуються автоматично. Створено за допомогою GPT-6.1. GitHub: https://github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Як користуватися ботом" },
      { command: "test", description: "Показати тестову сторінку Rich Message" },
      { command: "media", description: "Показати медіа поточної чернетки" },
      { command: "send", description: "Зібрати й надіслати поточну чернетку" },
      { command: "clear", description: "Видалити поточну чернетку" },
      { command: "privacy", description: "Конфіденційність і зберігання даних" },
    ],
  },
};

function telegramLanguageCode(locale) {
  return locale === DEFAULT_LOCALE ? undefined : locale;
}

function publicBotConfig(locale) {
  return PROFILE[locale] || PROFILE[DEFAULT_LOCALE];
}

export {
  BOT_PUBLIC_CONFIG_VERSION,
  DEFAULT_LOCALE,
  PUBLIC_LOCALES,
  PROFILE,
  telegramLanguageCode,
  publicBotConfig,
  syncBotProfile,
  ensureBotProfile,
};


async function telegramApiCall(method, token, payload) {
  const response = await fetch(
    "https://api.telegram.org/bot" + token + "/" + method,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!data.ok) {
    throw new Error(method + " failed: " + JSON.stringify(data));
  }
  return data;
}

async function syncBotProfile(token) {
  if (!token) throw new Error("BOT_TOKEN is not configured");

  const applyLocale = async (locale, includeLanguageCode = true) => {
    const config = publicBotConfig(locale);
    const language_code = includeLanguageCode
      ? telegramLanguageCode(locale) || locale
      : undefined;

    const withLanguage = (payload) =>
      language_code ? { ...payload, language_code } : payload;

    await telegramApiCall(
      "setMyCommands",
      token,
      withLanguage({ commands: config.commands })
    );
    await telegramApiCall(
      "setMyName",
      token,
      withLanguage({ name: config.name })
    );
    await telegramApiCall(
      "setMyShortDescription",
      token,
      withLanguage({ short_description: config.shortDescription })
    );
    await telegramApiCall(
      "setMyDescription",
      token,
      withLanguage({ description: config.description })
    );
  };

  // English is also the default profile for users whose Telegram language is
  // not explicitly localized by this bot.
  await applyLocale(DEFAULT_LOCALE, false);

  for (const locale of PUBLIC_LOCALES) {
    await applyLocale(locale, true);
  }

  return BOT_PUBLIC_CONFIG_VERSION;
}

let profileSyncPromise = null;

function ensureBotProfile(token) {
  if (!profileSyncPromise) {
    profileSyncPromise = syncBotProfile(token).catch((error) => {
      profileSyncPromise = null;
      throw error;
    });
  }
  return profileSyncPromise;
}
