import { prepareRichMarkdownMedia } from "./media.js";
import { splitRichMessage } from "./rich-split.js";
import { trackStat } from "./stats-store.js";
import { savePreparedShare } from "./share-store.js";
import { t } from "./i18n.js";

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

async function finalizeAlbumDraft(
  token,
  chatId,
  session,
  stats = null,
  statsUserId = null,
  shares = null,
  env = null,
  locale = "en"
) {
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
    const sent = await telegramApiCall("sendRichMessage", token, {
      chat_id: chatId,
      rich_message:
        part.media.length > 0
          ? { markdown: part.markdown, media: part.media }
          : { markdown: part.markdown },
    });
    await trackStat(stats, "rich_messages", statsUserId);

    if (
      shares &&
      env &&
      statsUserId != null &&
      sent?.result?.message_id &&
      !(part.media || []).some(
        (item) => item?.media?.type === "photo_from_document"
      )
    ) {
      try {
        const shareToken = await savePreparedShare(
          shares,
          env,
          statsUserId,
          {
            markdown: part.markdown,
            ...(part.media.length > 0 ? { media: part.media } : {}),
          },
          {
            title: t(locale, "inlineSendTitle"),
            description: t(locale, "inlineSendDescription"),
          }
        );

        if (shareToken) {
          await telegramApiCall("editMessageReplyMarkup", token, {
            chat_id: chatId,
            message_id: sent.result.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: t(locale, "sendToChat"),
                    switch_inline_query_chosen_chat: {
                      query: "share_" + shareToken,
                      allow_user_chats: true,
                      allow_bot_chats: false,
                      allow_group_chats: true,
                      allow_channel_chats: true,
                    },
                  },
                ],
              ],
            },
          });
        }
      } catch (error) {
        console.error("Could not prepare album inline share", error);
      }
    }
  }
}

export { finalizeAlbumDraft };
