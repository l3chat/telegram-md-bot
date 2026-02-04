import MarkdownIt from "markdown-it";
const VERSION = "v2-preprocess-test-1";

// Markdown renderer configured for Telegram-safe output.
// - html: false prevents raw HTML injection from user input.
// - linkify: true auto-detects links.
// - breaks: true treats single newlines as <br>.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

// Convert Markdown to Telegram-compatible HTML.
// Telegram only supports a subset of HTML tags, so we:
// 1) render Markdown to HTML
// 2) rewrite tags to Telegram equivalents
// 3) normalize whitespace/line breaks for chat display
// Telegram HTML rules (practical subset for this bot):
// - Allowed tags we rely on: <b>, <i>, <s>, <pre>
// - Headings (<h1>.. <h6>) are NOT supported, so we map to <b>
// - <code> is supported by Telegram, but we normalize code blocks to <pre>
// - <br> is effectively a newline; we collapse excessive breaks
// - Lists/paragraphs are not real HTML in Telegram; we flatten to text
function mdToTelegramHtml(markdownText) {
  let html = md.render(markdownText);

  // === 1. strong / em / del ===
  // Telegram supports <b>, <i>, <s> but not <strong>/<em>/<del>.
  html = html.replaceAll("<strong>", "<b>").replaceAll("</strong>", "</b>");
  html = html.replaceAll("<em>", "<i>").replaceAll("</em>", "</i>");
  html = html.replaceAll("<del>", "<s>").replaceAll("</del>", "</s>");

  // === 2. code blocks: <pre><code>...</code></pre> → <pre>...</pre> ===
  // Telegram allows <pre> for monospaced blocks.
  html = html.replace(/<pre><code[^>]*>/gi, "<pre>");
  html = html.replace(/<\/code><\/pre>/gi, "</pre>");

  // === 3. headings → bold line + line break ===
  // Telegram doesn't support heading tags; we map to bold.
  html = html.replace(
    /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi,
    "<b>$1</b>"
  );

  // === 4. horizontal rules <hr> → separator ===
  // Use a simple text separator line.
  html = html.replace(/<hr\s*\/?>/gi, "\n— — —\n");

  // === 5. paragraphs → line breaks ===
  // Telegram treats line breaks as newlines in plain text.
  html = html.replace(/<\/p>\s*<p>/gi, "\n\n");
  html = html.replace(/<p>/gi, "");
  html = html.replace(/<\/p>/gi, "");

  // === 6. lists → bullets ===
  // Convert list items to bullet lines.
  html = html.replace(/<\/li>\s*<li>/gi, "\n• ");
  html = html.replace(/<li>/gi, "• ");
  html = html.replace(/<\/li>/gi, "");
  html = html.replace(/<\/?(ul|ol)[^>]*>/gi, "");

  // === 7. collapse too many breaks ===
  // Replace excessive <br> sequences with double newlines.
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, "\n\n");

  // Convert remaining <br> to newlines.
  html = html.replace(/<br\s*\/?>/gi, "\n");

  // Collapse too many newlines (incl. list artifacts).
  // collapse too many newlines (incl. list artifacts)
  html = html.replace(/\n{3,}/g, "\n\n");
  
  // Remove blank lines between bullet items.
  // no blank lines between bullet items
  html = html.replace(/\n\s*\n(?=• )/g, "\n");

  return html.trim();
}

// Preprocess raw Markdown before rendering.
// This adds Telegram-friendly transformations that are easier to do
// on the raw text (headings, lists, tables, etc.).
function preProcessMd(input) {
  let t = input.replace(/\r\n/g, "\n");

  // Telegram style preference: treat __text__ as italics, not bold.
  // Convert double-underscore emphasis to single-asterisk emphasis
  // before markdown-it processes it.
  t = t.replace(/(?<!_)__([^\n]+?)__(?!_)/g, "*$1*");

  // Headings: ## Title -> **Title**
  // We keep it simple by converting to bold inline Markdown.
  t = t.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => {
    return `**${title.trim()}**`;
  });

  // Horizontal rule --- -> separator
  // Render a visible separator line in chat.
  t = t.replace(/^\s*---\s*$/gm, "— — —");

  // Bullet lists: lines starting with "-" or "*" -> "• "
  // NOTE: Do not replace list markers here. We want markdown-it to
  // parse lists so inline formatting (**, __, etc.) works inside items.

  // Tables: detect markdown tables and convert to monospaced block
  // Very simple detection: a block containing | and a separator row like |---|
  // This is a best-effort conversion to a fixed-width table.
  t = t.replace(
    /((?:^\|?.*\|.*$\n)+)(^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$\n)((?:^\|?.*\|.*$\n?)*)/gm,
    (m, headerBlock, sep, bodyBlock) => {
      // Split rows into cells and trim spacing.
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

      // Helpers to pad cells and build lines.
      const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));
      const toLine = (r) => r.map((c,i)=>pad(c,widths[i])).join(" | ");

      // Build a simple ASCII table with a header separator.
      const outLines = [];
      outLines.push(toLine(rows[0]));
      outLines.push(widths.map(w => "-".repeat(w)).join("-+-"));
      for (let i = 1; i < rows.length; i++) outLines.push(toLine(rows[i]));

      // Wrap in a code block so Telegram renders monospaced.
      return "```\ntext\n" + outLines.join("\n") + "\n```\n";
    }
  );

  return t;
}

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

// Split long messages to avoid Telegram length limits.
// We use a conservative default of 3500 chars.
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
    // Telegram will include this header if you configured a webhook secret.
    // We reject requests that don't match to prevent spoofed updates.
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!secret || secret !== env.WEBHOOK_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    // Parse Telegram update payload.
    const update = await request.json();
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;

    // Ignore non-text updates or malformed payloads.
    if (!text || !chatId) return new Response("OK");

    // Preprocess Markdown then convert to Telegram HTML.
    //const htmlOut = mdToTelegramHtml(text);
    const htmlOut = mdToTelegramHtml(preProcessMd(text));
    if (!htmlOut) return new Response("OK");

    // Send in chunks to stay under Telegram's message size limit.
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

// Named exports for unit tests.
export { mdToTelegramHtml, preProcessMd, splitTelegram };
