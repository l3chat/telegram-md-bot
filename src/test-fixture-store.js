const FIXTURE_VERSION = "v2";

const FIXTURE_URLS = {
  photo: "https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/test-media/images/184273.png",
  audio: "https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/test-media/audio/ding-dong-01.mp3",
  video: "https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/test-media/video/numbers-01.mp4",
};

async function callTelegram(method, token, payload) {
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(method + " failed: " + JSON.stringify(data));
  return data.result;
}

async function fetchFixture(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "tg-md-bot-test-fixtures" },
  });
  if (!response.ok) {
    throw new Error("Fixture download failed: HTTP " + response.status + " " + url);
  }
  return response.arrayBuffer();
}

async function uploadTelegramFile(
  method,
  token,
  chatId,
  fieldName,
  fileName,
  mimeType,
  sourceUrl,
  extra = {}
) {
  const bytes = await fetchFixture(sourceUrl);
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set(fieldName, new Blob([bytes], { type: mimeType }), fileName);

  for (const [key, value] of Object.entries(extra)) {
    form.set(key, String(value));
  }

  const response = await fetch(
    "https://api.telegram.org/bot" + token + "/" + method,
    { method: "POST", body: form }
  );
  const data = await response.json();
  if (!data.ok) {
    throw new Error(method + " upload failed: " + JSON.stringify(data));
  }
  return data.result;
}

async function quietlyDelete(token, chatId, messageId) {
  try {
    await callTelegram("deleteMessage", token, {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (error) {
    console.warn("Could not delete temporary test media message", error);
  }
}

async function registerFixture(token, chatId, method, payload, readFileId) {
  const result = await callTelegram(method, token, { chat_id: chatId, ...payload });
  const fileId = readFileId(result);
  if (!fileId) throw new Error("Telegram did not return reusable media id");
  await quietlyDelete(token, chatId, result.message_id);
  return fileId;
}

async function registerFixtures(token, chatId) {
  const photoMessage = await uploadTelegramFile(
    "sendPhoto",
    token,
    chatId,
    "photo",
    "184273.png",
    "image/png",
    FIXTURE_URLS.photo
  );
  const photoSizes = photoMessage.photo || [];
  const photo = photoSizes.length
    ? photoSizes[photoSizes.length - 1].file_id
    : null;
  await quietlyDelete(token, chatId, photoMessage.message_id);

  const audioMessage = await uploadTelegramFile(
    "sendAudio",
    token,
    chatId,
    "audio",
    "ding-dong-01.mp3",
    "audio/mpeg",
    FIXTURE_URLS.audio,
    {
      title: "Ding Dong Test",
      performer: "Markdown to Rich Message",
    }
  );
  const audio = audioMessage.audio?.file_id;
  await quietlyDelete(token, chatId, audioMessage.message_id);

  const videoMessage = await uploadTelegramFile(
    "sendVideo",
    token,
    chatId,
    "video",
    "numbers-01.mp4",
    "video/mp4",
    FIXTURE_URLS.video,
    { supports_streaming: true }
  );
  const video = videoMessage.video?.file_id;
  await quietlyDelete(token, chatId, videoMessage.message_id);

  if (!photo || !audio || !video) {
    throw new Error("Telegram did not return reusable file_id for all test fixtures");
  }

  return { version: FIXTURE_VERSION, photo, audio, video };
}

export class TestFixtureStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async read() {
    const stored = await this.state.storage.get("fixtures");
    if (
      stored?.version === FIXTURE_VERSION &&
      stored.photo &&
      stored.audio &&
      stored.video
    ) {
      return stored;
    }
    return null;
  }

  async getOrCreate(chatId) {
    const stored = await this.read();
    if (stored) return stored;
    const fixtures = await registerFixtures(this.env.BOT_TOKEN, chatId);
    await this.state.storage.put("fixtures", fixtures);
    return fixtures;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\/+/, "");

    if (action === "get-or-create") {
      const body = await request.json().catch(() => ({}));
      if (!body.chat_id) return new Response("chat_id required", { status: 400 });
      return Response.json(await this.getOrCreate(body.chat_id));
    }

    if (action === "get") {
      return Response.json((await this.read()) || {});
    }

    if (action === "clear") {
      await this.state.storage.delete("fixtures");
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
}

function fixtureStoreStub(namespace) {
  if (!namespace) throw new Error("TEST_FIXTURES binding is not configured");
  return namespace.get(namespace.idFromName("global-test-fixtures"));
}

async function getOrCreateTestFixtures(namespace, chatId) {
  const stub = fixtureStoreStub(namespace);
  const response = await stub.fetch("https://fixtures/get-or-create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  if (!response.ok) {
    throw new Error("TestFixtureStore failed: HTTP " + response.status);
  }
  return response.json();
}

export {
  FIXTURE_VERSION,
  FIXTURE_URLS,
  fixtureStoreStub,
  getOrCreateTestFixtures,
};
