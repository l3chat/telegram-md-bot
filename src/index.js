import {
  markdownToEntities,
  splitTelegramWithEntities,
} from "./format.js";

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

async function sendMarkdown(chatId, markdown, token) {
  if (!markdown?.trim()) return;

  // Rich Messages (Bot API 10.1+) accept Rich Markdown directly and allow
  // substantially longer, structured messages than sendMessage.
  try {
    await tgCall("sendRichMessage", token, {
      chat_id: chatId,
      rich_message: { markdown },
    });
    return;
  } catch (error) {
    // Keep the previous formatter/splitter as a compatibility fallback for
    // unsupported Markdown constructs or content above Rich Message limits.
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
    // For quick health-check in browser
    if (request.method === "GET") {
      return new Response("tg-md-bot: OK");
    }

    if (request.method !== "POST") return new Response("OK");

    // Verify Telegram webhook secret.
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

    let markdown = message.text;

    // Long Markdown cannot be pasted into one ordinary Telegram message,
    // so accept .md/.markdown/.txt documents as input as well.
    if (!markdown && message.document) {
      if (!isMarkdownDocument(message.document)) {
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: "Send Markdown as text or attach a .md, .markdown, or .txt file.",
        });
        return new Response("OK");
      }

      try {
        markdown = await downloadTelegramDocument(env.BOT_TOKEN, message.document);
      } catch (error) {
        console.error("Failed to read uploaded document", error);
        await tgCall("sendMessage", env.BOT_TOKEN, {
          chat_id: chatId,
          text: "I couldn't read that file. Please try again with a UTF-8 .md or .txt file.",
        });
        return new Response("OK");
      }
    }

    if (!markdown) return new Response("OK");

    await sendMarkdown(chatId, markdown, env.BOT_TOKEN);
    return new Response("OK");
  },
};

// Named exports for unit tests.
export {
  markdownToEntities,
  splitTelegramWithEntities,
  isMarkdownDocument,
  sendMarkdown,
};
