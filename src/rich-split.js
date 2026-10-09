const DEFAULT_RICH_MESSAGE_LIMIT = 30000;
const TELEGRAM_RICH_MESSAGE_LIMIT = 32768;

function richLength(value) {
  return Array.from(String(value || "")).length;
}

function sliceRich(value, start, end) {
  return Array.from(String(value || "")).slice(start, end).join("");
}

function splitLongLine(line, limit) {
  const chars = Array.from(line);
  const parts = [];
  for (let i = 0; i < chars.length; i += limit) {
    parts.push(chars.slice(i, i + limit).join(""));
  }
  return parts;
}

function splitByLines(text, limit) {
  const lines = String(text || "").split(/(?<=\n)/);
  const parts = [];
  let current = "";

  const flush = () => {
    if (current) parts.push(current);
    current = "";
  };

  for (const line of lines) {
    if (richLength(line) > limit) {
      flush();
      parts.push(...splitLongLine(line, limit));
      continue;
    }

    if (current && richLength(current + line) > limit) flush();
    current += line;
  }

  flush();
  return parts;
}

function fencedCodeInfo(block) {
  const match = String(block || "").match(/^([ \t]*)(`{3,}|~{3,})([^\n]*)\n?/);
  if (!match) return null;

  const indent = match[1] || "";
  const fence = match[2];
  const opening = match[0].replace(/\n?$/, "\n");
  const lines = String(block).split("\n");

  let closingIndex = -1;
  const closingRe = new RegExp(
    "^" +
      indent.replace(/[.*+?^$()|[\]\\]/g, "\\$&") +
      fence[0].replace(/[.*+?^$()|[\]\\]/g, "\\$&") +
      "{" +
      fence.length +
      ",}\\s*$"
  );

  for (let i = lines.length - 1; i > 0; i -= 1) {
    if (closingRe.test(lines[i])) {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex < 0) return null;

  return {
    opening,
    closing: indent + fence,
    body: lines.slice(1, closingIndex).join("\n"),
  };
}

function splitFencedCode(block, limit) {
  const info = fencedCodeInfo(block);
  if (!info) return null;

  const wrapperCost = richLength(info.opening) + richLength("\n" + info.closing);
  const bodyLimit = Math.max(64, limit - wrapperCost - 16);
  const bodyParts = splitByLines(info.body, bodyLimit);

  return bodyParts.map(
    (body) => info.opening + body.replace(/\n$/, "") + "\n" + info.closing
  );
}

function extractAtomicBlocks(markdown) {
  const lines = String(markdown || "").split("\n");
  const blocks = [];
  let current = [];
  let fence = null;
  let math = false;
  let detailsDepth = 0;

  const flush = () => {
    if (current.length === 0) return;
    blocks.push(current.join("\n"));
    current = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (!fence && !math && detailsDepth === 0 && line.trim() === "") {
      flush();
      continue;
    }

    current.push(line);

    if (fence) {
      const closing = new RegExp(
        "^\\s*" + fence[0] + "{" + fence.length + ",}\\s*$"
      );
      if (closing.test(line)) fence = null;
      continue;
    }

    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }

    if (/^\s*\$\$\s*$/.test(line)) {
      math = !math;
      continue;
    }

    if (!math) {
      const opens = (line.match(/<details(?:\s[^>]*)?>/gi) || []).length;
      const closes = (line.match(/<\/details>/gi) || []).length;
      detailsDepth = Math.max(0, detailsDepth + opens - closes);
    }
  }

  flush();
  return blocks;
}

function splitOversizedBlock(block, limit) {
  const fenced = splitFencedCode(block, limit);
  if (fenced) return fenced;

  return splitByLines(block, limit);
}

function splitRichMarkdown(markdown, limit = DEFAULT_RICH_MESSAGE_LIMIT) {
  if (!markdown?.trim()) return [];

  const safeLimit = Math.min(
    Math.max(256, Number(limit) || DEFAULT_RICH_MESSAGE_LIMIT),
    TELEGRAM_RICH_MESSAGE_LIMIT
  );

  if (richLength(markdown) <= safeLimit) return [markdown];

  const blocks = extractAtomicBlocks(markdown);
  const chunks = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  const append = (block) => {
    // When a long document has explicit top-level sections, keep a new H1/H2
    // with the content that follows it instead of squeezing the heading into
    // the end of the previous Rich Message.
    if (current && /^#{1,2}\s+/.test(block)) {
      flush();
    }

    const candidate = current ? current + "\n\n" + block : block;
    if (richLength(candidate) <= safeLimit) {
      current = candidate;
      return;
    }

    flush();

    if (richLength(block) <= safeLimit) {
      current = block;
      return;
    }

    const pieces = splitOversizedBlock(block, safeLimit);
    for (const piece of pieces) {
      if (richLength(piece) <= safeLimit) {
        chunks.push(piece.trim());
      } else {
        chunks.push(...splitByLines(piece, safeLimit).map((x) => x.trim()));
      }
    }
  };

  for (const block of blocks) append(block);
  flush();

  return chunks.filter(Boolean);
}

function mediaIdsInMarkdown(markdown) {
  const ids = new Set();
  const re = /tg:\/\/(?:photo|audio|video|document)\?[^)\s"'<>]*\bid=([^&)\s"'<>]+)/gi;
  let match;
  while ((match = re.exec(String(markdown || "")))) {
    ids.add(match[1]);
  }
  return ids;
}

function mediaForChunk(markdown, media = []) {
  if (!Array.isArray(media) || media.length === 0) return [];
  const ids = mediaIdsInMarkdown(markdown);
  return media.filter((item) => ids.has(String(item?.id || "")));
}

function splitRichMessage(markdown, media = [], limit = DEFAULT_RICH_MESSAGE_LIMIT) {
  return splitRichMarkdown(markdown, limit).map((chunk) => ({
    markdown: chunk,
    media: mediaForChunk(chunk, media),
  }));
}

export {
  DEFAULT_RICH_MESSAGE_LIMIT,
  TELEGRAM_RICH_MESSAGE_LIMIT,
  richLength,
  extractAtomicBlocks,
  splitRichMarkdown,
  mediaIdsInMarkdown,
  mediaForChunk,
  splitRichMessage,
};
