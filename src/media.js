import { t } from "./i18n.js";

const MEDIA_SESSION_TTL_SECONDS = 24 * 60 * 60;

function emptyMediaSession() {
  return { items: [], markdown: null, revision: null, media_group_id: null };
}

function mediaSessionKey(message) {
  const chatId = message?.chat?.id;
  const userId = message?.from?.id || chatId;
  return "media:" + chatId + ":" + userId;
}

function normalizeRef(value) {
  let s = String(value || "").trim();
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
  try {
    s = decodeURIComponent(s);
  } catch {
    // Keep the original text if percent-decoding fails.
  }
  s = s.replace(/\\/g, "/").replace(/^\.\/+/, "");
  return s.toLowerCase();
}

function basename(value) {
  const s = String(value || "").replace(/\\/g, "/");
  const parts = s.split("/");
  return parts[parts.length - 1] || s;
}

function sanitizeAlias(value) {
  let s = String(value || "").trim();
  if (!s || s.includes("\n") || s.length > 160) return "";
  s = basename(s);
  s = s.replace(/\s+/g, "_");
  s = s.replace(/[<>()\[\]]/g, "_");
  return s;
}

function nextAlias(session, prefix) {
  const used = new Set(
    (session?.items || []).map((item) => normalizeRef(item.alias))
  );
  let n = 1;
  while (used.has(normalizeRef(prefix + "_" + n))) n += 1;
  return prefix + "_" + n;
}

function isMarkdownLikeDocument(document) {
  if (!document) return false;
  const name = (document.file_name || "").toLowerCase();
  const mime = (document.mime_type || "").toLowerCase();
  return (
    /\.(md|markdown|txt)$/.test(name) ||
    mime === "text/markdown" ||
    mime === "text/plain"
  );
}

function detectIncomingMedia(message) {
  if (Array.isArray(message?.photo) && message.photo.length > 0) {
    const photo = message.photo[message.photo.length - 1];
    return {
      kind: "photo",
      file_id: photo.file_id,
      file_name: null,
      alias: null,
      mime_type: "image/jpeg",
      message_id: message.message_id,
    };
  }

  if (message?.audio) {
    const audio = message.audio;
    return {
      kind: "audio",
      file_id: audio.file_id,
      file_name: audio.file_name || null,
      alias: sanitizeAlias(audio.file_name) || null,
      mime_type: audio.mime_type || "audio/mpeg",
      message_id: message.message_id,
    };
  }

  if (message?.voice) {
    const voice = message.voice;
    return {
      kind: "voice",
      file_id: voice.file_id,
      file_name: null,
      alias: null,
      mime_type: voice.mime_type || "audio/ogg",
      message_id: message.message_id,
    };
  }

  if (message?.video) {
    const video = message.video;
    return {
      kind: "video",
      file_id: video.file_id,
      file_name: video.file_name || null,
      alias: sanitizeAlias(video.file_name) || null,
      mime_type: video.mime_type || "video/mp4",
      message_id: message.message_id,
    };
  }

  if (message?.document && !isMarkdownLikeDocument(message.document)) {
    const document = message.document;
    return {
      kind: "document",
      file_id: document.file_id,
      file_name: document.file_name || null,
      alias: sanitizeAlias(document.file_name) || null,
      mime_type: document.mime_type || "application/octet-stream",
      message_id: message.message_id,
    };
  }

  return null;
}

function mediaPrefix(kind) {
  if (kind === "photo") return "photo";
  if (kind === "voice") return "voice";
  if (kind === "audio") return "audio";
  if (kind === "video") return "video";
  return "file";
}

function addMediaToSession(session, item) {
  const next = {
    ...emptyMediaSession(),
    ...session,
    items: Array.isArray(session?.items) ? [...session.items] : [],
  };

  const preferred = sanitizeAlias(item.alias || item.file_name);
  const used = new Set(next.items.map((existing) => normalizeRef(existing.alias)));
  const alias =
    preferred && !used.has(normalizeRef(preferred))
      ? preferred
      : nextAlias(next, mediaPrefix(item.kind));

  next.items.push({ ...item, alias });

  if (next.items.length > 60) next.items = next.items.slice(-60);
  return next;
}

function setPendingMarkdown(session, markdown, message) {
  const next = {
    ...emptyMediaSession(),
    ...session,
    items: Array.isArray(session?.items) ? [...session.items] : [],
  };
  next.markdown = String(markdown || "");
  next.revision = message?.message_id ?? Date.now();
  next.media_group_id = message?.media_group_id || next.media_group_id || null;
  return next;
}

function touchSession(session, message) {
  const next = {
    ...emptyMediaSession(),
    ...session,
    items: Array.isArray(session?.items) ? [...session.items] : [],
  };
  next.revision = message?.message_id ?? Date.now();
  next.media_group_id = message?.media_group_id || next.media_group_id || null;
  return next;
}

function makeLookup(session) {
  const lookup = new Map();

  for (const item of session?.items || []) {
    const candidates = [
      item.alias,
      basename(item.alias),
      item.file_name,
      basename(item.file_name),
    ].filter(Boolean);

    for (const candidate of candidates) {
      lookup.set(normalizeRef(candidate), item);
    }
  }

  return lookup;
}

function isRemoteMediaRef(ref) {
  return /^(https?:\/\/|tg:\/\/)/i.test(String(ref || "").trim());
}

function mediaDescriptor(item, id) {
  const scheme =
    item.kind === "photo"
      ? "photo"
      : item.kind === "video"
        ? "video"
        : item.kind === "document"
          ? "document"
          : "audio";

  const mediaType = item.kind === "voice" ? "voice_note" : item.kind;

  return {
    id,
    scheme,
    input: {
      id,
      media: {
        type: mediaType,
        media: item.file_id,
      },
    },
  };
}

function defaultCaption(item) {
  if (item.file_name) return item.file_name;
  if (item.kind === "photo") return "Фото";
  if (item.kind === "voice") return "Голосовая запись";
  if (item.kind === "audio") return "Аудио";
  if (item.kind === "video") return "Видео";
  return item.alias || "Файл";
}

function prepareRichMarkdownMedia(
  markdown,
  session = emptyMediaSession(),
  { appendUnreferenced = false } = {}
) {
  const lookup = makeLookup(session);
  const media = [];
  const missing = [];
  const used = new Set();
  const descriptorByItem = new Map();
  let counter = 0;
  let tooMany = false;

  const ensureDescriptor = (item) => {
    if (descriptorByItem.has(item)) return descriptorByItem.get(item);

    counter += 1;
    if (counter > 50) {
      tooMany = true;
      return null;
    }

    const descriptor = mediaDescriptor(item, "media_" + counter);
    descriptorByItem.set(item, descriptor);
    media.push(descriptor.input);
    return descriptor;
  };

  const mediaLine =
    /^([ \t]*)!\[([^\]\n]*)\]\(\s*(?:<([^>\n]+)>|([^\s)\n]+))(?:\s+["']([^"'\n]*)["'])?\s*\)[ \t]*$/gm;

  let rewritten = String(markdown || "").replace(
    mediaLine,
    (full, indent, alt, angleRef, bareRef, title) => {
      const ref = angleRef || bareRef || "";
      if (isRemoteMediaRef(ref)) return full;

      const item = lookup.get(normalizeRef(ref));
      if (!item) {
        missing.push(ref);
        return full;
      }

      const descriptor = ensureDescriptor(item);
      if (!descriptor) return full;
      used.add(item);

      const safeTitle = title
        ? ' "' + String(title).replace(/"/g, "'") + '"'
        : "";

      return (
        indent +
        "![" +
        alt +
        "](tg://" +
        descriptor.scheme +
        "?id=" +
        descriptor.id +
        safeTitle +
        ")"
      );
    }
  );

  if (appendUnreferenced) {
    const blocks = [];
    for (const item of session?.items || []) {
      if (used.has(item)) continue;
      const descriptor = ensureDescriptor(item);
      if (!descriptor) continue;
      used.add(item);
      const caption = defaultCaption(item).replace(/"/g, "'");
      blocks.push(
        '![](tg://' +
          descriptor.scheme +
          "?id=" +
          descriptor.id +
          ' "' +
          caption +
          '")'
      );
    }

    if (blocks.length > 0) {
      rewritten = rewritten.trimEnd() + "\n\n" + blocks.join("\n\n");
    }
  }

  return {
    markdown: rewritten,
    media,
    missing: [...new Set(missing)],
    tooMany,
    usedCount: used.size,
  };
}

function mediaStoredText(item, locale = "en") {
  const kindKey =
    item.kind === "photo"
      ? "kindPhoto"
      : item.kind === "voice"
        ? "kindVoice"
        : item.kind === "audio"
          ? "kindAudio"
          : item.kind === "video"
            ? "kindVideo"
            : "kindFile";

  return t(locale, kindKey) + " " + t(locale, "mediaReceived");
}

function mediaListText(session, locale = "en") {
  const items = session?.items || [];
  if (items.length === 0) {
    return t(locale, "pendingNone");
  }

  const lines = items.map((item, index) => {
    const marker =
      item.kind === "photo"
        ? "🖼"
        : item.kind === "voice"
          ? "🎙"
          : item.kind === "audio"
            ? "🎵"
            : item.kind === "video"
              ? "🎬"
              : "📎";
    return String(index + 1) + ". " + marker + " " + item.alias;
  });

  return (
    t(locale, "pendingTitle") +
    "\n\n" +
    lines.join("\n") +
    "\n\n" +
    t(locale, "pendingFooter")
  );
}

export {
  MEDIA_SESSION_TTL_SECONDS,
  emptyMediaSession,
  mediaSessionKey,
  isMarkdownLikeDocument,
  detectIncomingMedia,
  addMediaToSession,
  setPendingMarkdown,
  touchSession,
  prepareRichMarkdownMedia,
  mediaStoredText,
  mediaListText,
};
