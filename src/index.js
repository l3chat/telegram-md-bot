import {
  markdownToEntities,
  splitTelegramWithEntities,
} from "./format.js";
import {
  mediaSessionKey,
  isMarkdownLikeDocument,
  detectIncomingMedia,
  addMediaToSession,
  setPendingMarkdown,
  touchSession,
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
  "## Текст без медиа",
  "",
  "Пришлите Markdown прямо сообщением или файлом `.md`, `.markdown` или `.txt`.",
  "",
  "## Текст + картинки / аудио / видео / файлы",
  "",
  "Самый простой способ:",
  "",
  "1. Сначала пришлите все медиа.",
  "2. Затем пришлите Markdown-текст или `.md/.txt`.",
  "3. Бот **сам создаст внутренние ссылки** и соберёт всё в одно Rich Message.",
  "",
  "Если в Markdown уже есть строка вроде `![](photo.jpg)`, а файл `photo.jpg` был прислан, он будет вставлен именно туда. Медиа, на которые нет явных ссылок, добавляются в конец автоматически.",
  "",
  "Фото с подписью можно отправить одним сообщением: подпись будет использована как Markdown.",
  "",
  "Для пакетов/альбомов, где Telegram присылает части отдельными update-сообщениями, используйте `/send` после последнего файла.",
  "",
  "Команды: `/media` — показать ожидающие медиа, `/send` — собрать текущий черновик, `/clear` — очистить черновик, `/help` — подсказка.",
  "",
  "> Внутренние `tg://...` ссылки пользователь писать не должен — их строит бот."
].join("\n");

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
    String(name).replace(/[.*+?^$()|[\]\\]/g, "\\$&")
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
  return isMarkdownLikeDocument(document);
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

async function sendPreparedDraft(chatId, token, store, sessionKey, session, markdown) {
  const prepared = prepareRichMarkdownMedia(markdown, session, {
    appendUnreferenced: true,
  });

  if (prepared.tooMany) {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text: "В одном Rich Message можно использовать не более 50 медиа-вложений.",
    });
    return false;
  }

  if (prepared.missing.length > 0) {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text:
        "Не найдены медиа:\n\n" +
        prepared.missing.map((name) => "• " + name).join("\n") +
        "\n\nПришлите эти файлы боту или удалите соответствующие ссылки из Markdown.",
    });
    return false;
  }

  await sendMarkdown(chatId, prepared.markdown, token, prepared.media);
  await clearMediaSession(store, sessionKey);
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("tg-md-bot: OK auto-media-v2");
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
          ? "Черновик очищен."
          : "Хранилище медиа пока не подключено.",
      });
      return new Response("OK");
    }

    if (isCommand(message.text, "send")) {
      const session = await loadMediaSession(env.MEDIA_STORE, sessionKey);
      if (!session.markdown) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "В черновике нет текста. Пришлите Markdown-текст или .md/.txt-файл.",
        });
        return new Response("OK");
      }

      try {
        await sendPreparedDraft(
          chatId,
          env.BOT_TOKEN,
          env.MEDIA_STORE,
          sessionKey,
          session,
          session.markdown
        );
      } catch (error) {
        console.error("Failed to send draft", error);
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: "Не удалось собрать Rich Message из текущего черновика.",
        });
      }
      return new Response("OK");
    }

    const currentSession = await loadMediaSession(env.MEDIA_STORE, sessionKey);
    const incomingMedia = detectIncomingMedia(message, currentSession);

    if (incomingMedia) {
      if (!env.MEDIA_STORE) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "Для автоматической сборки текста с медиа нужно подключить Cloudflare KV binding MEDIA_STORE.",
        });
        return new Response("OK");
      }

      let nextSession = addMediaToSession(currentSession, incomingMedia);
      nextSession = touchSession(nextSession, message);

      // A caption attached to a single media message is treated as Markdown
      // for that same Rich Message. Albums are accumulated and finalized with /send.
      if (message.caption?.trim()) {
        nextSession = setPendingMarkdown(nextSession, message.caption, message);
      }

      await saveMediaSession(env.MEDIA_STORE, sessionKey, nextSession);

      if (message.caption?.trim() && !message.media_group_id) {
        try {
          await sendPreparedDraft(
            chatId,
            env.BOT_TOKEN,
            env.MEDIA_STORE,
            sessionKey,
            nextSession,
            message.caption
          );
        } catch (error) {
          console.error("Failed to send caption+media Rich Message", error);
          await tgCall("sendMessage", env.BOT_TOKEN, {
            chat_id: chatId,
            text: "Не удалось собрать Rich Message из подписи и медиа.",
          });
        }
        return new Response("OK");
      }

      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text:
          mediaStoredText(incomingMedia) +
          (message.media_group_id
            ? "\n\nЭто часть альбома. После последнего элемента пришлите /send или Markdown-текст."
            : ""),
      });
      return new Response("OK");
    }

    let markdown = message.text;

    if (!markdown && message.document) {
      if (!isMarkdownDocument(message.document)) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text:
            "Текстовый документ должен быть .md, .markdown или .txt. Остальные файлы бот воспринимает как вложения.",
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
            "Не удалось прочитать текстовый файл. Используйте UTF-8 .md/.markdown/.txt.",
        });
        return new Response("OK");
      }
    }

    if (!markdown) return new Response("OK");

    // If Telegram marks this as part of a media group, keep it as a draft and
    // let /send finalize after all separate updates have arrived.
    if (message.media_group_id && env.MEDIA_STORE) {
      const nextSession = setPendingMarkdown(currentSession, markdown, message);
      await saveMediaSession(env.MEDIA_STORE, sessionKey, nextSession);
      return new Response("OK");
    }

    // Media first, Markdown last: this is the zero-extra-step workflow.
    if (currentSession.items.length > 0) {
      try {
        await sendPreparedDraft(
          chatId,
          env.BOT_TOKEN,
          env.MEDIA_STORE,
          sessionKey,
          currentSession,
          markdown
        );
      } catch (error) {
        console.error("Failed to send Rich Message with auto media", error);
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: "Не удалось собрать Rich Message с присланными медиа.",
        });
      }
      return new Response("OK");
    }

    await sendMarkdown(chatId, markdown, env.BOT_TOKEN);
    return new Response("OK");
  },
};

export {
  HELP_MARKDOWN,
  markdownToEntities,
  splitTelegramWithEntities,
  isCommand,
  isHelpCommand,
  isMarkdownDocument,
  sendMarkdown,
  sendPreparedDraft,
};
