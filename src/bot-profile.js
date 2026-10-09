const BOT_PUBLIC_CONFIG_VERSION = "public-profile-v1";

const DEFAULT_LOCALE = "en";
const PUBLIC_LOCALES = ["en", "ru", "de", "fr", "uk"];

const PROFILE = {
  en: {
    name: "Markdown Formatter",
    shortDescription:
      "Turn Markdown, images and audio into structured Telegram Rich Messages.",
    description:
      "Convert Markdown text or files into Telegram Rich Messages. Add photos, audio, video and documents; the bot links media automatically, keeps temporary drafts for up to 24 hours, and splits oversized documents into multiple Rich Messages.",
    commands: [
      { command: "help", description: "How to use the bot" },
      { command: "media", description: "Show media in the current draft" },
      { command: "send", description: "Build and send the current draft" },
      { command: "clear", description: "Discard the current draft" },
      { command: "privacy", description: "Privacy and temporary storage" },
    ],
  },
  ru: {
    name: "Форматтер Markdown",
    shortDescription:
      "Превращает Markdown, изображения и аудио в Telegram Rich Messages.",
    description:
      "Преобразует Markdown-текст и файлы в Telegram Rich Messages. Можно добавлять фото, аудио, видео и документы: бот сам связывает медиа, хранит черновик не более 24 часов и автоматически разбивает слишком длинные документы.",
    commands: [
      { command: "help", description: "Как пользоваться ботом" },
      { command: "media", description: "Показать медиа текущего черновика" },
      { command: "send", description: "Собрать и отправить текущий черновик" },
      { command: "clear", description: "Удалить текущий черновик" },
      { command: "privacy", description: "Конфиденциальность и хранение данных" },
    ],
  },
  de: {
    name: "Markdown-Formatierer",
    shortDescription:
      "Erstellt aus Markdown, Bildern und Audio Telegram Rich Messages.",
    description:
      "Wandelt Markdown-Text und Dateien in Telegram Rich Messages um. Fotos, Audio, Video und Dokumente werden automatisch verknüpft. Entwürfe bleiben höchstens 24 Stunden gespeichert; zu lange Dokumente werden automatisch aufgeteilt.",
    commands: [
      { command: "help", description: "Hilfe zur Benutzung" },
      { command: "media", description: "Medien im aktuellen Entwurf anzeigen" },
      { command: "send", description: "Aktuellen Entwurf erstellen und senden" },
      { command: "clear", description: "Aktuellen Entwurf löschen" },
      { command: "privacy", description: "Datenschutz und temporäre Speicherung" },
    ],
  },
  fr: {
    name: "Formateur Markdown",
    shortDescription:
      "Transforme Markdown, images et audio en Rich Messages Telegram.",
    description:
      "Transforme du texte ou des fichiers Markdown en Rich Messages Telegram. Photos, audio, vidéo et documents sont reliés automatiquement. Les brouillons sont conservés au plus 24 h et les documents trop longs sont découpés automatiquement.",
    commands: [
      { command: "help", description: "Mode d’emploi du bot" },
      { command: "media", description: "Afficher les médias du brouillon" },
      { command: "send", description: "Construire et envoyer le brouillon" },
      { command: "clear", description: "Supprimer le brouillon actuel" },
      { command: "privacy", description: "Confidentialité et stockage temporaire" },
    ],
  },
  uk: {
    name: "Форматувач Markdown",
    shortDescription:
      "Перетворює Markdown, зображення й аудіо на Telegram Rich Messages.",
    description:
      "Перетворює Markdown-текст і файли на Telegram Rich Messages. Фото, аудіо, відео та документи прив’язуються автоматично. Чернетки зберігаються не більше 24 годин, а надто довгі документи автоматично розбиваються.",
    commands: [
      { command: "help", description: "Як користуватися ботом" },
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
