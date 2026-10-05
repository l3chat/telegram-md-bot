import {
  markdownToEntities,
  splitTelegramWithEntities,
} from "./format.js";
import {
  mediaSessionKey,
  detectIncomingMedia,
  addMediaToSession,
  prepareRichMarkdownMedia,
  loadMediaSession,
  saveMediaSession,
  clearMediaSession,
  mediaStoredText,
  mediaListText,
} from "./media.js";

const HELP_MARKDOWN = [
  "# Markdown Formatter",
  "",
  "Бот превращает Markdown в **одно красиво оформленное Rich Message**.",
  "",
  "## Обычный текст",
  "",
  "1. Пришлите Markdown прямо сообщением или файлом `.md`, `.markdown` или `.txt`.",
  "2. Бот вернёт готовое форматированное сообщение.",
  "3. Перешлите его в нужный чат.",
  "",
  "## Текст с картинками и аудио",
  "",
  "1. Сначала пришлите боту картинку как **Фото**, аудиофайл как **Аудио** или голосовое сообщение.",
  "2. Бот выдаст короткое имя, например `photo_1` или имя аудиофайла.",
  "3. В Markdown вставьте медиа отдельной строкой:",
  "",
  '`![](photo_1 "Подпись")`',
  "",
  "4. Пришлите Markdown — бот соберёт текст и медиа в **одно Rich Message**.",
  "",
  "Если у фотографии есть короткая подпись без пробелов, она будет использована как имя. Например подпись `schema.png` позволяет писать `![](schema.png)`.",
  "",
  "Команды: `/media` — список сохранённых медиа, `/clear` — очистить список, `/help` — эта подсказка.",
  "",
  "> Медиа хранятся 24 часа. Один Rich Message поддерживает до 50 медиа-вложений.",
].join("\n");

// Make a Telegram Bot API call.
// Throws if Telegram returns ok: false, so upstream can log/fail.
async function tgCall(method, token, payload) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`${method} failed: ${JSON.stringify(data)}`);
  return data;
}

function isCommand(text, names) {
  const list = Array.isArray(names) ? names : [names];
  const escaped = list.map((name) =>
    String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(
    "^\\/(" + escaped.join("|") + ")(?:@[A-Za-z0-9_]+)?(?:\\s|$)",
    "i"
  );
  return pattern.test(text || "");
}

function isHelpCommand(text) {
  return isCommand(text, ["start", "help"]);
}

function isMarkdownDocument(document) {
  if (!document) return false;
  const name = (document.file_name || "").toLowerCase();
  const mime = (document.mime_type || "").toLowerCase();
  return (
    /\.(md|markdown|txt)$/.test(name) ||
    mime === "text/markdown" ||
    mime.startsWith("text/")
  );
}

async function downloadTelegramDocument(token, document) {
  const fileInfo = await tgCall("getFile", token, { file_id: document.file_id });
  const filePath = fileInfo.result?.file_path;
  if (!filePath) throw new Error("Telegram did not return file_path");

  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`document download failed: HTTP ${r.status}`);
  return r.text();
}

async function sendMarkdown(chatId, markdown, token, media = []) {
  if (!markdown?.trim()) return;

  try {
    await tgCall("sendRichMessage", token, {
      chat_id: chatId,
      rich_message: media.length > 0 ? { markdown, media } : { markdown },
    });
    return;
  } catch (error) {
    if (media.length > 0) throw error;
    console.warn("sendRichMessage failed; falling back to sendMessage", error);
  }

  const { text: outText, entities: outEntities } = markdownToEntities(markdown);
  if (!outText) return;

  for (const chunk of splitTelegramWithEntities(outText, outEntities)) {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text: chunk.text,
      entities: chunk.entities,
      disable_web_page_preview: true,
    });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("tg-md-bot: OK media-v1");
    }

    if (request.method !== "POST") return new Response("OK");

    if (env.WEBHOOK_SECRET) {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!secret || secret !== env.WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const update = await request.json();
    const message = update.message;
    const chatId = message?.chat?.id;
    if (!message || !chatId) return new Response("OK");

    const sessionKey = mediaSessionKey(message);

    if (isHelpCommand(message.text)) {
      await sendMarkdown(chatId, HELP_MARKDOWN, env.BOT_TOKEN);
      return new Response("OK");
    }

    if (isCommand(message.text, "media")) {
      const session = await loadMediaSession(env.MEDIA_STORE, sessionKey);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: mediaListText(session),
      });
      return new Response("OK");
    }

    if (isCommand(message.text, "clear")) {
      await clearMediaSession(env.MEDIA_STORE, sessionKey);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: env.MEDIA_STORE
          ? "Список сохранённых картинок и аудио очищен."
          : "Хранилище медиа пока не подключено.",
      });
      return new Response("OK");
    }

    const currentSession = await loadMediaSession(env.MEDIA_STORE, sessionKey);
    const incomingMedia = detectIncomingMedia(message, currentSession);

    if (incomingMedia) {
      if (!env.MEDIA_STORE) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "Поддержка картинок и аудио уже есть в коде, но для неё нужно один раз подключить Cloudflare KV binding MEDIA_STORE. Обычный Markdown продолжает работать.",
        });
        return new Response("OK");
      }

      const nextSession = addMediaToSession(currentSession, incomingMedia);
      await saveMediaSession(env.MEDIA_STORE, sessionKey, nextSession);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: mediaStoredText(incomingMedia),
      });
      return new Response("OK");
    }

    let markdown = message.text;

    if (!markdown && message.document) {
      if (!isMarkdownDocument(message.document)) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "Для форматирования пришлите Markdown-текст или файл .md/.markdown/.txt. Картинку отправляйте как Фото, аудио — как Аудио или голосовое сообщение.",
        });
        return new Response("OK");
      }

      try {
        markdown = await downloadTelegramDocument(env.BOT_TOKEN, message.document);
      } catch (error) {
        console.error("Failed to read uploaded document", error);
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "Не удалось прочитать файл. Попробуйте ещё раз с UTF-8 файлом .md или .txt.",
        });
        return new Response("OK");
      }
    }

    if (!markdown) return new Response("OK");

    const session = await loadMediaSession(env.MEDIA_STORE, sessionKey);
    const prepared = prepareRichMarkdownMedia(markdown, session);

    if (prepared.tooMany) {
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: "В одном Rich Message можно использовать не более 50 медиа-вложений.",
      });
      return new Response("OK");
    }

    if (prepared.missing.length > 0) {
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text:
          "Не найдены медиа:\n\n" +
          prepared.missing.map((name) => "• " + name).join("\n") +
          "\n\nСначала пришлите эти картинки/аудио боту или используйте публичный https:// URL. Команда /media покажет уже сохранённые имена.",
      });
      return new Response("OK");
    }

    try {
      await sendMarkdown(
        chatId,
        prepared.markdown,
        env.BOT_TOKEN,
        prepared.media
      );
    } catch (error) {
      console.error("Failed to send rich message with media", error);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text:
          "Не удалось собрать Rich Message с медиа. Проверьте, что картинка была отправлена как Фото, а звук — как Аудио или голосовое сообщение.",
      });
    }

    return new Response("OK");
  },
};

// Named exports for unit tests.
export {
  HELP_MARKDOWN,
  markdownToEntities,
  splitTelegramWithEntities,
  isCommand,
  isHelpCommand,
  isMarkdownDocument,
  sendMarkdown,
};
