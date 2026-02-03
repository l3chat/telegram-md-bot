import MarkdownIt from "markdown-it";
const VERSION = "v2-preprocess-test-1";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

function mdToTelegramHtml(markdownText) {
  let html = md.render(markdownText);

  // === 1. strong / em / del ===
  html = html.replaceAll("<strong>", "<b>").replaceAll("</strong>", "</b>");
  html = html.replaceAll("<em>", "<i>").replaceAll("</em>", "</i>");
  html = html.replaceAll("<del>", "<s>").replaceAll("</del>", "</s>");

  // === 2. code blocks: <pre><code>...</code></pre> → <pre>...</pre> ===
  html = html.replace(/<pre><code[^>]*>/gi, "<pre>");
  html = html.replace(/<\/code><\/pre>/gi, "</pre>");

  // === 3. headings → bold line + line break ===
  html = html.replace(
    /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi,
    "<b>$1</b>"
  );

  // === 4. horizontal rules <hr> → separator ===
  html = html.replace(/<hr\s*\/?>/gi, "\n— — —\n");

  // === 5. paragraphs → line breaks ===
  html = html.replace(/<\/p>\s*<p>/gi, "\n\n");
  html = html.replace(/<p>/gi, "");
  html = html.replace(/<\/p>/gi, "");

  // === 6. lists → bullets ===
  html = html.replace(/<\/li>\s*<li>/gi, "\n• ");
  html = html.replace(/<li>/gi, "• ");
  html = html.replace(/<\/li>/gi, "");
  html = html.replace(/<\/?(ul|ol)[^>]*>/gi, "");

  // === 7. collapse too many breaks ===
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, "\n\n");

  html = html.replace(/<br\s*\/?>/gi, "\n");

  // collapse too many newlines (incl. list artifacts)
  html = html.replace(/\n{3,}/g, "\n\n");
  
  // no blank lines between bullet items
  html = html.replace(/\n\s*\n(?=• )/g, "\n(---)");

  return html.trim();
}

function preProcessMd(input) {
  let t = input.replace(/\r\n/g, "\n");

  // Headings: ## Title -> **Title**
  t = t.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => {
    return `**${title.trim()}**`;
  });

  // Horizontal rule --- -> separator
  t = t.replace(/^\s*---\s*$/gm, "— — —");

  // Bullet lists: lines starting with "-" or "*" -> "• "
  t = t.replace(/^\s*[-*]\s+/gm, "• ");

  // Tables: detect markdown tables and convert to monospaced block
  // Very simple detection: a block containing | and a separator row like |---|
  t = t.replace(
    /((?:^\|?.*\|.*$\n)+)(^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$\n)((?:^\|?.*\|.*$\n?)*)/gm,
    (m, headerBlock, sep, bodyBlock) => {
      const block = (headerBlock + bodyBlock).trimEnd();
      const rows = block.split("\n").map(line =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map(c => c.trim())
      );

      // compute column widths
      const widths = [];
      for (const r of rows) {
        r.forEach((cell, i) => {
          widths[i] = Math.max(widths[i] || 0, cell.length);
        });
      }

      const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));
      const toLine = (r) => r.map((c,i)=>pad(c,widths[i])).join(" | ");

      const outLines = [];
      outLines.push(toLine(rows[0]));
      outLines.push(widths.map(w => "-".repeat(w)).join("-+-"));
      for (let i = 1; i < rows.length; i++) outLines.push(toLine(rows[i]));

      return "```\ntext\n" + outLines.join("\n") + "\n```\n";
    }
  );

  return t;
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

    //const htmlOut = mdToTelegramHtml(text);
    const htmlOut = mdToTelegramHtml(preProcessMd(text));
    if (!htmlOut) return new Response("OK");

    for (const chunk of splitTelegram(htmlOut)) {
      await tgCall("sendMessage", env.BOT_TOKEN, {
        chat_id: chatId,
        text: chunk,
        //text: chunk + "\n\n<i>" + VERSION + "</i>",
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }

    return new Response("OK");
  },
};
