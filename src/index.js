import {
  markdownToEntities,
  splitTelegramWithEntities,
} from "./format.js";
import {
  localeFromMessage,
  localeFromHelpCommand,
  localeFromTestCommand,
  t,
  helpMarkdown,
} from "./i18n.js";
import {
  isMarkdownLikeDocument,
  detectIncomingMedia,
  prepareRichMarkdownMedia,
  mediaStoredText,
  mediaListText,
} from "./media.js";
import {
  DraftSession,
  draftSessionStub,
  getDraftSession,
  clearDraftSession,
  addDraftMedia,
  setDraftMarkdown,
  touchDraftSession,
  replaceDraftSession,
} from "./draft-session.js";
import {
  splitRichMessage,
} from "./rich-split.js";
import {
  ensureBotProfile,
} from "./bot-profile.js";
import {
  privacyMarkdown,
  privacyHtml,
} from "./privacy.js";
import {
  testPageMarkdown,
} from "./test-page.js";
import {
  testPageWithMedia,
} from "./test-media-page.js";
import {
  TestFixtureStore,
  getOrCreateTestFixtures,
} from "./test-fixture-store.js";

const MAX_TEXT_FILE_BYTES = 20 * 1024 * 1024;
const MAX_RICH_MESSAGE_PARTS = 10;

class BotOperationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BotOperationError";
    this.code = code;
    Object.assign(this, details);
  }
}

class TelegramApiError extends Error {
  constructor(method, response) {
    super(method + " failed: " + JSON.stringify(response));
    this.name = "TelegramApiError";
    this.method = method;
    this.telegram = response;
  }
}

async function tgCall(method, token, payload) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!data.ok) throw new TelegramApiError(method, data);
  return data;
}

function errorMessageKey(error) {
  if (error?.code === "TEXT_FILE_TOO_LARGE") return "textFileTooLarge";
  if (error?.code === "DOCUMENT_TOO_LONG") return "documentTooLong";

  const code = error?.telegram?.error_code;
  const description = String(
    error?.telegram?.description || error?.message || ""
  ).toLowerCase();

  if (code === 429 || description.includes("flood")) {
    return "telegramFloodWait";
  }

  if (
    description.includes("file_id") ||
    description.includes("file reference") ||
    description.includes("wrong file") ||
    description.includes("failed to get file")
  ) {
    return "telegramFileError";
  }

  if (
    description.includes("too long") ||
    description.includes("too many") ||
    description.includes("limit")
  ) {
    return "platformLimitError";
  }

  if (error instanceof TelegramApiError && error.method === "sendRichMessage") {
    return "telegramFormatError";
  }

  return "unexpectedError";
}

async function sendLocalizedError(chatId, token, locale, error) {
  console.error("User-facing bot error", error);
  try {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text: t(locale, errorMessageKey(error)),
    });
  } catch (sendError) {
    console.error("Failed to send localized error", sendError);
  }
}

function rateLimitKey(message) {
  const userId = message?.from?.id || message?.chat?.id || "unknown";
  return String(userId);
}

function isHeavyUpdate(message) {
  if (
    message?.document ||
    message?.photo ||
    message?.audio ||
    message?.voice ||
    message?.video
  ) {
    return true;
  }

  const text = message?.text || "";
  if (isCommand(text, ["help", "start", "privacy", "media", "clear"])) {
    return false;
  }
  return Boolean(text || message?.caption);
}

async function consumeLimiter(binding, key) {
  if (!binding?.limit) return true;
  try {
    const result = await binding.limit({ key });
    return Boolean(result?.success);
  } catch (error) {
    console.error("Rate limiter error", error);
    return true;
  }
}

async function notifyRateLimited(env, chatId, locale, key, messageKey) {
  const mayNotify = await consumeLimiter(env.RATE_NOTICE_LIMITER, key);
  if (!mayNotify) return;

  try {
    await tgCall("sendMessage", env.BOT_TOKEN, {
      chat_id: chatId,
      text: t(locale, messageKey),
    });
  } catch (error) {
    console.error("Failed to send rate-limit notice", error);
  }
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
  if (
    Number.isFinite(document?.file_size) &&
    document.file_size > MAX_TEXT_FILE_BYTES
  ) {
    throw new BotOperationError(
      "TEXT_FILE_TOO_LARGE",
      "Text file exceeds Telegram getFile limit"
    );
  }

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

  const parts = splitRichMessage(markdown, media);

  if (parts.length > MAX_RICH_MESSAGE_PARTS) {
    throw new BotOperationError(
      "DOCUMENT_TOO_LONG",
      "Document would produce " + parts.length + " Rich Messages",
      { parts: parts.length }
    );
  }

  for (const part of parts) {
    try {
      await tgCall("sendRichMessage", token, {
        chat_id: chatId,
        rich_message:
          part.media.length > 0
            ? { markdown: part.markdown, media: part.media }
            : { markdown: part.markdown },
      });
      continue;
    } catch (error) {
      if (part.media.length > 0) throw error;
      console.warn(
        "sendRichMessage failed for chunk; falling back to sendMessage",
        error
      );
    }

    const { text: outText, entities: outEntities } =
      markdownToEntities(part.markdown);
    if (!outText) continue;

    for (const chunk of splitTelegramWithEntities(outText, outEntities)) {
      await tgCall("sendMessage", token, {
        chat_id: chatId,
        text: chunk.text,
        entities: chunk.entities,
        disable_web_page_preview: true,
      });
    }
  }
}

async function sendPreparedDraft(chatId, token, stub, session, markdown, locale) {
  const prepared = prepareRichMarkdownMedia(markdown, session, {
    appendUnreferenced: true,
  });

  if (prepared.tooMany) {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text: t(locale, "tooManyMedia"),
    });
    return false;
  }

  if (prepared.missing.length > 0) {
    await tgCall("sendMessage", token, {
      chat_id: chatId,
      text:
        t(locale, "missingMediaHeader") +
        "\n\n" +
        prepared.missing.map((name) => "• " + name).join("\n") +
        "\n\n" +
        t(locale, "missingMediaFooter"),
    });
    return false;
  }

  await sendMarkdown(chatId, prepared.markdown, token, prepared.media);
  await clearDraftSession(stub);
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      if (url.pathname === "/privacy") {
        const lang = url.searchParams.get("lang") || "en";
        return new Response(privacyHtml(lang), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/health/telegram") {
        try {
          const me = await tgCall("getMe", env.BOT_TOKEN, {});
          const webhook = await tgCall("getWebhookInfo", env.BOT_TOKEN, {});
          return Response.json({
            ok: true,
            bot: {
              id: me.result?.id,
              username: me.result?.username,
            },
            webhook: {
              url_set: Boolean(webhook.result?.url),
              pending_update_count: webhook.result?.pending_update_count || 0,
              last_error_date: webhook.result?.last_error_date || null,
              last_error_message: webhook.result?.last_error_message || null,
            },
          });
        } catch (error) {
          console.error("Telegram health check failed", error);
          return Response.json(
            { ok: false, error: String(error?.message || error) },
            { status: 503 }
          );
        }
      }

      return new Response("tg-md-bot: OK recovery-v1");
    }

    if (request.method !== "POST") return new Response("OK");

    if (env.WEBHOOK_SECRET) {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!secret || secret !== env.WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    if (ctx?.waitUntil) {
      ctx.waitUntil(
        ensureBotProfile(env.BOT_TOKEN).catch((error) => {
          console.error("Failed to sync Telegram public profile", error);
        })
      );
    }

    const update = await request.json();
    const message = update.message;
    const chatId = message?.chat?.id;
    if (!message || !chatId) return new Response("OK");

    if (isCommand(message.text, "ping")) {
      try {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: "pong",
        });
      } catch (error) {
        console.error("Ping failed", error);
      }
      return new Response("OK");
    }

    const locale = localeFromMessage(message);
    const draftStub = draftSessionStub(env.DRAFT_SESSIONS, message);
    const limiterKey = rateLimitKey(message);

    const withinGeneralLimit = await consumeLimiter(
      env.USER_RATE_LIMITER,
      limiterKey
    );
    if (!withinGeneralLimit) {
      await notifyRateLimited(
        env,
        chatId,
        locale,
        limiterKey,
        "rateLimited"
      );
      return new Response("OK");
    }

    if (isHeavyUpdate(message)) {
      const withinHeavyLimit = await consumeLimiter(
        env.HEAVY_RATE_LIMITER,
        limiterKey
      );
      if (!withinHeavyLimit) {
        await notifyRateLimited(
          env,
          chatId,
          locale,
          limiterKey,
          "heavyRateLimited"
        );
        return new Response("OK");
      }
    }

    if (isHelpCommand(message.text)) {
      const helpLocale = localeFromHelpCommand(message.text, locale);
      try {
        await sendMarkdown(chatId, helpMarkdown(helpLocale), env.BOT_TOKEN);
      } catch (error) {
        await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
      }
      return new Response("OK");
    }

    if (isCommand(message.text, "privacy")) {
      const publicUrl =
        url.origin + "/privacy?lang=" + encodeURIComponent(locale);
      try {
        await sendMarkdown(
          chatId,
          privacyMarkdown(locale, publicUrl),
          env.BOT_TOKEN
        );
      } catch (error) {
        await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
      }
      return new Response("OK");
    }

    if (isCommand(message.text, "test")) {
      try {
        const fixtures = await getOrCreateTestFixtures(
          env.TEST_FIXTURES,
          chatId
        );
        const testLocale = localeFromTestCommand(message.text, locale);
        await sendMarkdown(
          chatId,
          testPageWithMedia(testLocale),
          env.BOT_TOKEN,
          [
            { id: "test_photo", media: { type: "photo", media: fixtures.photo } },
            { id: "test_audio", media: { type: "audio", media: fixtures.audio } },
            { id: "test_video", media: { type: "video", media: fixtures.video } },
          ]
        );
      } catch (error) {
        await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
      }
      return new Response("OK");
    }

    if (isCommand(message.text, "media")) {
      const session = await getDraftSession(draftStub);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: mediaListText(session, locale),
      });
      return new Response("OK");
    }

    if (isCommand(message.text, "clear")) {
      await clearDraftSession(draftStub);
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: env.DRAFT_SESSIONS
          ? t(locale, "draftCleared")
          : t(locale, "storageMissing"),
      });
      return new Response("OK");
    }

    if (isCommand(message.text, "send")) {
      const session = await getDraftSession(draftStub);
      if (!session.markdown) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: t(locale, "noDraftText"),
        });
        return new Response("OK");
      }

      try {
        await sendPreparedDraft(
          chatId,
          env.BOT_TOKEN,
          draftStub,
          session,
          session.markdown,
          locale
        );
      } catch (error) {
        await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
      }
      return new Response("OK");
    }

    const currentSession = await getDraftSession(draftStub);
    const incomingMedia = detectIncomingMedia(message, currentSession);

    if (incomingMedia) {
      if (!env.DRAFT_SESSIONS) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: t(locale, "mediaStorageNeeded"),
        });
        return new Response("OK");
      }

      let nextSession = await addDraftMedia(draftStub, incomingMedia);
      nextSession = await touchDraftSession(draftStub, message);

      // A caption attached to a single media message is treated as Markdown
      // for that same Rich Message. Albums are accumulated and finalized with /send.
      if (message.caption?.trim()) {
        nextSession = await setDraftMarkdown(
          draftStub,
          message.caption,
          message
        );
      }

      if (message.caption?.trim() && !message.media_group_id) {
        try {
          await sendPreparedDraft(
            chatId,
            env.BOT_TOKEN,
            draftStub,
            nextSession,
            message.caption,
            locale
          );
        } catch (error) {
          await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
        }
        return new Response("OK");
      }

      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text:
          mediaStoredText(incomingMedia, locale) +
          (message.media_group_id
            ? "\n\n" + t(locale, "albumHint")
            : ""),
      });
      return new Response("OK");
    }

    let markdown = message.text;

    if (!markdown && message.document) {
      if (!isMarkdownDocument(message.document)) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: t(locale, "textDocumentExpected"),
        });
        return new Response("OK");
      }

      try {
        markdown = await downloadTelegramDocument(env.BOT_TOKEN, message.document);
      } catch (error) {
        if (error?.code === "TEXT_FILE_TOO_LARGE") {
          await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
        } else {
          console.error("Failed to read uploaded document", error);
          await tgCall("sendMessage", env.BOT_TOKEN, {
            chat_id: chatId,
            text: t(locale, "textDocumentReadFailed"),
          });
        }
        return new Response("OK");
      }
    }

    if (!markdown) return new Response("OK");

    // If Telegram marks this as part of a media group, keep it as a draft and
    // let /send finalize after all separate updates have arrived.
    if (message.media_group_id && env.DRAFT_SESSIONS) {
      await setDraftMarkdown(draftStub, markdown, message);
      return new Response("OK");
    }

    // Media first, Markdown last: this is the zero-extra-step workflow.
    if (currentSession.items.length > 0) {
      try {
        await sendPreparedDraft(
          chatId,
          env.BOT_TOKEN,
          draftStub,
          currentSession,
          markdown,
          locale
        );
      } catch (error) {
        await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
      }
      return new Response("OK");
    }

    try {
      await sendMarkdown(chatId, markdown, env.BOT_TOKEN);
    } catch (error) {
      await sendLocalizedError(chatId, env.BOT_TOKEN, locale, error);
    }
    return new Response("OK");
  },
};

export {
  DraftSession,
  TestFixtureStore,
  markdownToEntities,
  splitTelegramWithEntities,
  isCommand,
  isHelpCommand,
  isMarkdownDocument,
  sendMarkdown,
  sendPreparedDraft,
  errorMessageKey,
  isHeavyUpdate,
  MAX_RICH_MESSAGE_PARTS,
  MAX_TEXT_FILE_BYTES,
};
