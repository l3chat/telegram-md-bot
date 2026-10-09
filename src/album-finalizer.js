import { prepareRichMarkdownMedia } from "./media.js";
import { splitRichMessage } from "./rich-split.js";
import { trackStat } from "./stats-store.js";

const MAX_RICH_MESSAGE_PARTS = 10;

async function telegramApiCall(method, token, payload) {
  const response = await fetch(
    "https://api.telegram.org/bot" + token + "/" + method,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!data.ok) {
    throw new Error(method + " failed: " + JSON.stringify(data));
  }
  return data;
}

async function finalizeAlbumDraft(token, chatId, session, stats = null) {
  const prepared = prepareRichMarkdownMedia(session.markdown, session, {
    appendUnreferenced: true,
  });

  if (prepared.tooMany) {
    throw new Error("Album contains too many media items");
  }
  if (prepared.missing.length > 0) {
    throw new Error("Album Markdown references missing media");
  }

  const parts = splitRichMessage(prepared.markdown, prepared.media);
  if (parts.length > MAX_RICH_MESSAGE_PARTS) {
    throw new Error("Album would create too many Rich Messages");
  }

  for (const part of parts) {
    await telegramApiCall("sendRichMessage", token, {
      chat_id: chatId,
      rich_message:
        part.media.length > 0
          ? { markdown: part.markdown, media: part.media }
          : { markdown: part.markdown },
    });
    await trackStat(stats, "rich_messages");
  }
}

export { finalizeAlbumDraft };
