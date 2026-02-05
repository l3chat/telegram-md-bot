import MarkdownIt from "markdown-it";

const TELEGRAM_MAX_LEN = 3500;
const HR_SEPARATOR = "─────";

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
  html = html.replace(/<hr\s*\/?>/gi, `\n${HR_SEPARATOR}\n`);

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
  t = t.replace(/^\s*---\s*$/gm, HR_SEPARATOR);

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
      const rows = block.split("\n").map((line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim())
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
      const toLine = (r) => r.map((c, i) => pad(c, widths[i])).join(" | ");

      // Build a simple ASCII table with a header separator.
      const outLines = [];
      outLines.push(toLine(rows[0]));
      outLines.push(widths.map((w) => "-".repeat(w)).join("-+-"));
      for (let i = 1; i < rows.length; i++) outLines.push(toLine(rows[i]));

      // Keep as plain text to avoid code block UI (e.g., copy buttons).
      return `\n${outLines.join("\n")}\n`;
    }
  );

  return t;
}

function entityToMarkers(entity) {
  switch (entity.type) {
    case "bold":
      return { open: "**", close: "**" };
    case "italic":
      return { open: "*", close: "*" };
    case "strikethrough":
      return { open: "~~", close: "~~" };
    case "code":
      return { open: "`", close: "`" };
    case "pre":
      return { open: "```\n", close: "\n```" };
    default:
      return null;
  }
}

function applyEntitiesToMarkdown(text, entities) {
  if (!entities || entities.length === 0) return text;

  const opens = new Map();
  const closes = new Map();

  for (const entity of entities) {
    const markers = entityToMarkers(entity);
    if (!markers) continue;

    const start = entity.offset;
    const end = entity.offset + entity.length;
    if (!opens.has(start)) opens.set(start, []);
    if (!closes.has(end)) closes.set(end, []);

    opens.get(start).push({ ...markers, length: entity.length });
    closes.get(end).push({ ...markers, length: entity.length });
  }

  for (const list of opens.values()) {
    list.sort((a, b) => b.length - a.length);
  }
  for (const list of closes.values()) {
    list.sort((a, b) => a.length - b.length);
  }

  const positions = new Set([...opens.keys(), ...closes.keys()]);
  const ordered = Array.from(positions).sort((a, b) => a - b);

  let out = "";
  let pos = 0;
  for (const p of ordered) {
    if (p > pos) out += text.slice(pos, p);
    if (closes.has(p)) {
      for (const m of closes.get(p)) out += m.close;
    }
    if (opens.has(p)) {
      for (const m of opens.get(p)) out += m.open;
    }
    pos = p;
  }

  if (pos < text.length) out += text.slice(pos);
  return out;
}

// Split long messages to avoid Telegram length limits.
// We use a conservative default of 3500 chars.
function splitTelegram(text, max = TELEGRAM_MAX_LEN) {
  const parts = [];
  for (let i = 0; i < text.length; i += max) parts.push(text.slice(i, i + max));
  return parts;
}

function closeEntity(entities, stack, type, endOffset) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i];
    if (entry.type !== type) continue;
    stack.splice(i, 1);
    const length = endOffset - entry.offset;
    if (length <= 0) return;
    entities.push({ type, offset: entry.offset, length, ...entry.extra });
    return;
  }
}

function markdownToEntities(markdownText) {
  const normalized = preProcessMd(markdownText);
  const tokens = md.parse(normalized, {});
  let text = "";
  const entities = [];
  const stack = [];
  let listItemDepth = 0;

  const append = (chunk) => {
    text += chunk;
  };
  const ensureLineStart = () => {
    if (text.length === 0) return;
    if (!text.endsWith("\n")) append("\n");
  };
  const appendBlockGap = () => {
    if (text.length === 0) return;
    if (!text.endsWith("\n\n")) {
      if (!text.endsWith("\n")) append("\n");
      append("\n");
    }
  };

  const openEntity = (type, extra) => {
    stack.push({ type, offset: text.length, extra });
  };

  const handleInline = (children) => {
    for (const child of children || []) {
      switch (child.type) {
        case "text":
          append(child.content);
          break;
        case "softbreak":
        case "hardbreak":
          append("\n");
          break;
        case "strong_open":
          openEntity("bold");
          break;
        case "strong_close":
          closeEntity(entities, stack, "bold", text.length);
          break;
        case "em_open":
          openEntity("italic");
          break;
        case "em_close":
          closeEntity(entities, stack, "italic", text.length);
          break;
        case "s_open":
        case "del_open":
          openEntity("strikethrough");
          break;
        case "s_close":
        case "del_close":
          closeEntity(entities, stack, "strikethrough", text.length);
          break;
        case "link_open": {
          const url = typeof child.attrGet === "function" ? child.attrGet("href") : null;
          openEntity("text_link", { url });
          break;
        }
        case "link_close":
          closeEntity(entities, stack, "text_link", text.length);
          break;
        case "code_inline": {
          const start = text.length;
          append(child.content);
          entities.push({ type: "code", offset: start, length: child.content.length });
          break;
        }
        case "image": {
          const altText = child.content || "";
          append(altText);
          break;
        }
        default:
          break;
      }
    }
  };

  for (const token of tokens) {
    switch (token.type) {
      case "paragraph_open":
        break;
      case "paragraph_close":
        if (listItemDepth === 0) appendBlockGap();
        break;
      case "heading_open":
        openEntity("bold");
        break;
      case "heading_close":
        closeEntity(entities, stack, "bold", text.length);
        appendBlockGap();
        break;
      case "inline":
        handleInline(token.children);
        break;
      case "bullet_list_open":
      case "ordered_list_open":
        appendBlockGap();
        break;
      case "list_item_open":
        listItemDepth += 1;
        ensureLineStart();
        append("• ");
        break;
      case "list_item_close":
        append("\n");
        listItemDepth = Math.max(0, listItemDepth - 1);
        break;
      case "fence":
      case "code_block": {
        appendBlockGap();
        const start = text.length;
        const content = token.content.replace(/\n$/, "");
        append(content);
        const info =
          typeof token.info === "string" ? token.info.trim().split(/\s+/)[0] : "";
        const language = info || "";
        entities.push({
          type: "pre",
          offset: start,
          length: content.length,
          language,
        });
        appendBlockGap();
        break;
      }
      case "hr":
        appendBlockGap();
        append(HR_SEPARATOR);
        appendBlockGap();
        break;
      default:
        break;
    }
  }

  return { text, entities };
}

function sliceEntitiesForRange(entities, start, end) {
  const sliced = [];
  for (const entity of entities || []) {
    const entityStart = entity.offset;
    const entityEnd = entity.offset + entity.length;
    const overlapStart = Math.max(start, entityStart);
    const overlapEnd = Math.min(end, entityEnd);
    if (overlapStart >= overlapEnd) continue;

    sliced.push({
      ...entity,
      offset: overlapStart - start,
      length: overlapEnd - overlapStart,
    });
  }
  return sliced;
}

// Split text and entities while respecting entity boundaries when possible.
// If an entity spans the max boundary, we prefer splitting before it.
// If the entity itself is larger than max, we split inside it and clip.
function splitTelegramWithEntities(text, entities, max = TELEGRAM_MAX_LEN) {
  const parts = [];
  let pos = 0;

  while (pos < text.length) {
    const targetEnd = Math.min(pos + max, text.length);
    let safeEnd = targetEnd;

    for (const entity of entities || []) {
      const entityStart = entity.offset;
      const entityEnd = entity.offset + entity.length;
      const crossesEnd = entityStart < safeEnd && entityEnd > safeEnd;
      if (crossesEnd && entityStart > pos) {
        safeEnd = Math.min(safeEnd, entityStart);
      }
    }

    if (safeEnd === pos) safeEnd = targetEnd;

    const chunkText = text.slice(pos, safeEnd);
    const chunkEntities = sliceEntitiesForRange(entities, pos, safeEnd);
    parts.push({ text: chunkText, entities: chunkEntities });
    pos = safeEnd;
  }

  return parts;
}

export {
  mdToTelegramHtml,
  preProcessMd,
  applyEntitiesToMarkdown,
  splitTelegram,
  splitTelegramWithEntities,
  markdownToEntities,
};
