import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

function mdToTelegramHtml(markdownText) {
  let html = md.render(markdownText);

  // strong/em -> b/i
  html = html.replaceAll("<strong>", "<b>").replaceAll("</strong>", "</b>");
  html = html.replaceAll("<em>", "<i>").replaceAll("</em>", "</i>");

  // normalize fenced code blocks
  html = html.replace(/<pre><code[^>]*>/gi, "<pre><code>");

  // paragraphs -> breaks
  html = html.replace(/<\/p>\s*<p>/gi, "<br/><br/>");
  html = html.replace(/<p>/gi, "");
  html = html.replace(/<\/p>/gi, "");

  // headings -> bold line
  html = html.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "<b>$1</b><br/>");

  // lists -> bullets (ul/ol/li unreliable in Telegram)
  html = html.replace(/<\/li>\s*<li>/gi, "<br/>• ");
  html = html.replace(/<li>/gi, "• ");
  html = html.replace(/<\/li>/gi, "");
  html = html.replace(/<\/?(ul|ol)[^>]*>/gi, "");

  // cleanup too many breaks
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, "<br/><br/>");

  return html.trim();
}

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

function splitTelegram(text, max = 3500) {
  const parts = [];
  for (let i = 0; i < text.length; i += max) parts.push(text.slice(i, i + max));
  return parts;
}

export default {
  async fetch(request, env) {
    // For quick health-check in browser
    if (request.method === "GET") {
      return new Response("tg-md-bot: OK");
    }

    if (request.method !== "POST") return new Response("OK");

    // Verify Telegram webhook secret
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!secret || secret !== env.WEBHOOK_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    const update = await request.json();
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;

    if (!text || !chatId) return new Response("OK");

    const htmlOut = mdToTelegramHtml(text);
    if (!htmlOut) return new Response("OK");

    for (const chunk of splitTelegram(htmlOut)) {
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: chunk,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }

    return new Response("OK");
  },
};
