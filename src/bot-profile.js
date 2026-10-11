const BOT_PUBLIC_CONFIG_VERSION = "public-profile-v8";

const DEFAULT_LOCALE = "en";
const PUBLIC_LOCALES = ["en", "ru", "de", "fr", "uk"];

const PROFILE = {
  en: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown → Rich Messages. Built with GPT-6.1.",
    description:
      "Markdown → Rich Message. Converts Markdown, .md files and text with photos, audio and video into Telegram Rich Messages. Supports headings, lists, tables, code and formulas. Long text is split automatically. EN/RU/DE/FR/UK. Built with GPT-6.1. GitHub: github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "How to use the bot" },
      { command: "test", description: "Show the Rich Message Test Page" },
      { command: "media", description: "Show media in the current draft" },
      { command: "send", description: "Build and send the current draft" },
      { command: "clear", description: "Discard the current draft" },
      { command: "privacy", description: "Privacy and temporary storage" },
      { command: "stats", description: "Show bot usage statistics" },
      { command: "share", description: "Get a shareable referral link" },
    ],
  },
  ru: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown и медиа → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Преобразует Markdown, .md-файлы и текст с фото, аудио и видео в Telegram Rich Messages. Поддерживает заголовки, списки, таблицы, код и формулы. Длинный текст делится автоматически. RU/EN/DE/FR/UK. GPT-6.1. GitHub: github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Как пользоваться ботом" },
      { command: "test", description: "Показать тестовую Rich Message страницу" },
      { command: "media", description: "Показать медиа текущего черновика" },
      { command: "send", description: "Собрать и отправить текущий черновик" },
      { command: "clear", description: "Удалить текущий черновик" },
      { command: "privacy", description: "Конфиденциальность и хранение данных" },
      { command: "stats", description: "Показать статистику использования" },
      { command: "share", description: "Получить ссылку для друзей" },
    ],
  },
  de: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown und Medien → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Wandelt Markdown, .md-Dateien und Text mit Fotos, Audio und Video in Telegram Rich Messages um. Unterstützt Überschriften, Listen, Tabellen, Code und Formeln. Lange Texte werden automatisch geteilt. EN/RU/DE/FR/UK. GPT-6.1. GitHub: github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Hilfe zur Benutzung" },
      { command: "test", description: "Rich-Message-Testseite anzeigen" },
      { command: "media", description: "Medien im aktuellen Entwurf anzeigen" },
      { command: "send", description: "Aktuellen Entwurf erstellen und senden" },
      { command: "clear", description: "Aktuellen Entwurf löschen" },
      { command: "privacy", description: "Datenschutz und temporäre Speicherung" },
      { command: "stats", description: "Nutzungsstatistik anzeigen" },
      { command: "share", description: "Link zum Teilen anzeigen" },
    ],
  },
  fr: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown et médias → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Convertit Markdown, fichiers .md et texte avec photos, audio et vidéo en Telegram Rich Messages. Prend en charge titres, listes, tableaux, code et formules. Les longs textes sont découpés automatiquement. EN/RU/DE/FR/UK. GPT-6.1. GitHub: github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Mode d’emploi du bot" },
      { command: "test", description: "Afficher la page de test Rich Message" },
      { command: "media", description: "Afficher les médias du brouillon" },
      { command: "send", description: "Construire et envoyer le brouillon" },
      { command: "clear", description: "Supprimer le brouillon actuel" },
      { command: "privacy", description: "Confidentialité et stockage temporaire" },
      { command: "stats", description: "Afficher les statistiques d’utilisation" },
      { command: "share", description: "Obtenir un lien à partager" },
    ],
  },
  uk: {
    name: "Markdown → Rich Message",
    shortDescription:
      "Telegram Markdown & Media Converter — Markdown і медіа → Rich Messages. GPT-6.1.",
    description:
      "Markdown → Rich Message. Перетворює Markdown, .md-файли й текст із фото, аудіо та відео на Telegram Rich Messages. Підтримує заголовки, списки, таблиці, код і формули. Довгий текст ділиться автоматично. EN/RU/DE/FR/UK. GPT-6.1. GitHub: github.com/l3chat/telegram-md-bot",
    commands: [
      { command: "help", description: "Як користуватися ботом" },
      { command: "test", description: "Показати тестову сторінку Rich Message" },
      { command: "media", description: "Показати медіа поточної чернетки" },
      { command: "send", description: "Зібрати й надіслати поточну чернетку" },
      { command: "clear", description: "Видалити поточну чернетку" },
      { command: "privacy", description: "Конфіденційність і зберігання даних" },
      { command: "stats", description: "Показати статистику використання" },
      { command: "share", description: "Отримати посилання для друзів" },
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
};


async function telegramApiCall(method, token, payload, context = {}) {
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
    const locale = context.locale ? " locale=" + context.locale : "";
    const language = payload?.language_code
      ? " language_code=" + payload.language_code
      : " default-language";
    throw new Error(
      method +
        " failed" +
        locale +
        language +
        ": " +
        (data.description || JSON.stringify(data))
    );
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
      withLanguage({ commands: config.commands }),
      { locale }
    );
    await telegramApiCall(
      "setMyName",
      token,
      withLanguage({ name: config.name }),
      { locale }
    );
    await telegramApiCall(
      "setMyShortDescription",
      token,
      withLanguage({ short_description: config.shortDescription }),
      { locale }
    );
    await telegramApiCall(
      "setMyDescription",
      token,
      withLanguage({ description: config.description }),
      { locale }
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
