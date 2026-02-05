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

export default {
  async fetch(request, env) {
    // For quick health-check in browser
    if (request.method === "GET") {
      return new Response("tg-md-bot: OK");
    }

    if (request.method !== "POST") return new Response("OK");

    // Verify Telegram webhook secret
    // Telegram will include this header if you configured a webhook secret.
    // We reject requests that don't match to prevent spoofed updates.
    if (env.WEBHOOK_SECRET) {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!secret || secret !== env.WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    // Parse Telegram update payload.
    const update = await request.json();
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;

    // Ignore non-text updates or malformed payloads.
    if (!text || !chatId) return new Response("OK");

    // Preprocess Markdown then convert to Telegram HTML.
    //const htmlOut = mdToTelegramHtml(text);
    const { text: outText, entities: outEntities } = markdownToEntities(text);
    if (!outText) return new Response("OK");

    // Send in chunks to stay under Telegram's message size limit.
    for (const chunk of splitTelegramWithEntities(outText, outEntities)) {
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: chunk.text,
        entities: chunk.entities,
        disable_web_page_preview: true,
      });
    }

    return new Response("OK");
  },
};

// Named exports for unit tests.
export { markdownToEntities, splitTelegramWithEntities };
