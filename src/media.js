const MEDIA_SESSION_TTL_SECONDS = 24 * 60 * 60;

function emptyMediaSession() {
  return { items: [] };
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
  const used = new Set((session?.items || []).map((item) => normalizeRef(item.alias)));
  let n = 1;
  while (used.has(normalizeRef(prefix + "_" + n))) n += 1;
  return prefix + "_" + n;
}

function detectIncomingMedia(message, session = emptyMediaSession()) {
  const explicitAlias = sanitizeAlias(message?.caption);

  if (Array.isArray(message?.photo) && message.photo.length > 0) {
    const photo = message.photo[message.photo.length - 1];
    return {
      kind: "photo",
      file_id: photo.file_id,
      file_name: null,
      alias: explicitAlias || nextAlias(session, "photo"),
      mime_type: "image/jpeg",
    };
  }

  if (message?.audio) {
    const audio = message.audio;
    return {
      kind: "audio",
      file_id: audio.file_id,
      file_name: audio.file_name || null,
      alias:
        explicitAlias ||
        sanitizeAlias(audio.file_name) ||
        nextAlias(session, "audio"),
      mime_type: audio.mime_type || "audio/mpeg",
    };
  }

  if (message?.voice) {
    const voice = message.voice;
    return {
      kind: "voice",
      file_id: voice.file_id,
      file_name: null,
      alias: explicitAlias || nextAlias(session, "voice"),
      mime_type: voice.mime_type || "audio/ogg",
    };
  }

  return null;
}

function addMediaToSession(session, item) {
  const next = {
    items: Array.isArray(session?.items) ? [...session.items] : [],
  };

  // Reusing an alias replaces the previous media with the new upload.
  const normalizedAlias = normalizeRef(item.alias);
  next.items = next.items.filter(
    (existing) => normalizeRef(existing.alias) !== normalizedAlias
  );
  next.items.push(item);

  // Rich messages support at most 50 media attachments. Keep a little history,
  // but avoid unbounded KV growth.
  if (next.items.length > 60) next.items = next.items.slice(-60);
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

function prepareRichMarkdownMedia(markdown, session = emptyMediaSession()) {
  const lookup = makeLookup(session);
  const media = [];
  const missing = [];
  let counter = 0;

  // Rich Markdown requires media to be a separate block, so only replace image
  // syntax that occupies its own line.
  const mediaLine =
    /^([ \t]*)!\[([^\]\n]*)\]\(\s*(?:<([^>\n]+)>|([^\s)\n]+))(?:\s+["']([^"'\n]*)["'])?\s*\)[ \t]*$/gm;

  const rewritten = String(markdown || "").replace(
    mediaLine,
    (full, indent, alt, angleRef, bareRef, title) => {
      const ref = angleRef || bareRef || "";
      if (isRemoteMediaRef(ref)) return full;

      const item = lookup.get(normalizeRef(ref));
      if (!item) {
        missing.push(ref);
        return full;
      }

      counter += 1;
      if (counter > 50) return full;

      const id = "media_" + counter;
      const scheme = item.kind === "photo" ? "photo" : "audio";
      const mediaType = item.kind === "voice" ? "voice_note" : item.kind;

      media.push({
        id,
        media: {
          type: mediaType,
          media: item.file_id,
        },
      });

      const safeTitle = title
        ? ' "' + String(title).replace(/"/g, "'") + '"'
        : "";
      return (
        indent +
        "![" +
        alt +
        "](tg://" +
        scheme +
        "?id=" +
        id +
        safeTitle +
        ")"
      );
    }
  );

  return {
    markdown: rewritten,
    media,
    missing: [...new Set(missing)],
    tooMany: counter > 50,
  };
}

async function loadMediaSession(store, key) {
  if (!store) return emptyMediaSession();
  const session = await store.get(key, { type: "json" });
  if (!session || !Array.isArray(session.items)) return emptyMediaSession();
  return session;
}

async function saveMediaSession(store, key, session) {
  if (!store) return false;
  await store.put(key, JSON.stringify(session), {
    expirationTtl: MEDIA_SESSION_TTL_SECONDS,
  });
  return true;
}

async function clearMediaSession(store, key) {
  if (!store) return false;
  await store.delete(key);
  return true;
}

function mediaSnippet(item) {
  return '![](' + item.alias + ' "Подпись")';
}

function mediaStoredText(item) {
  const label =
    item.kind === "photo"
      ? "Фото"
      : item.kind === "voice"
        ? "Голосовая запись"
        : "Аудио";

  return (
    label +
    " сохранено как " +
    item.alias +
    ".\n\nВ Markdown вставьте отдельной строкой:\n" +
    mediaSnippet(item) +
    "\n\nПосле этого пришлите Markdown-текст или .md-файл."
  );
}

function mediaListText(session) {
  const items = session?.items || [];
  if (items.length === 0) {
    return "Сохранённых картинок и аудио пока нет.";
  }

  const lines = items.map((item, index) => {
    const marker =
      item.kind === "photo" ? "🖼" : item.kind === "voice" ? "🎙" : "🎵";
    return String(index + 1) + ". " + marker + " " + item.alias;
  });

  return (
    "Сохранённые медиа (хранятся 24 часа):\n\n" +
    lines.join("\n") +
    "\n\n/media — показать список\n/clear — очистить список"
  );
}

export {
  MEDIA_SESSION_TTL_SECONDS,
  emptyMediaSession,
  mediaSessionKey,
  detectIncomingMedia,
  addMediaToSession,
  prepareRichMarkdownMedia,
  loadMediaSession,
  saveMediaSession,
  clearMediaSession,
  mediaStoredText,
  mediaListText,
};
