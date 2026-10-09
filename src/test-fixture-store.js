const FIXTURE_VERSION = "v1";

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
  const photo = await registerFixture(
    token, chatId, "sendPhoto",
    { photo: FIXTURE_URLS.photo },
    (result) => {
      const sizes = result.photo || [];
      return sizes.length ? sizes[sizes.length - 1].file_id : null;
    }
  );
  const audio = await registerFixture(
    token, chatId, "sendAudio",
    { audio: FIXTURE_URLS.audio, title: "Ding Dong Test", performer: "Markdown Formatter" },
    (result) => result.audio?.file_id
  );
  const video = await registerFixture(
    token, chatId, "sendVideo",
    { video: FIXTURE_URLS.video, supports_streaming: true },
    (result) => result.video?.file_id
  );
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
