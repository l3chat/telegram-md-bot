const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 12) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function ownerHash(env, userId) {
  const salt = env.SHARE_SALT || env.STATS_SALT || env.BOT_TOKEN || "share";
  return sha256(salt + ":" + String(userId));
}

export class ShareStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async put(body) {
    await this.state.storage.put("share", {
      owner_hash: body.owner_hash,
      rich_message: body.rich_message,
      title: body.title || "Send Rich Message",
      description: body.description || "",
      created_at: Date.now(),
    });
    await this.state.storage.setAlarm(Date.now() + SHARE_TTL_MS);
    return { ok: true };
  }

  async get() {
    return (await this.state.storage.get("share")) || null;
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\/+/, "");

    if (action === "put") {
      const body = await request.json();
      return Response.json(await this.put(body));
    }

    if (action === "get") {
      return Response.json((await this.get()) || {});
    }

    return new Response("Not found", { status: 404 });
  }
}

function shareStub(namespace, token) {
  if (!namespace || !token) return null;
  return namespace.get(namespace.idFromName("share:" + token));
}

async function savePreparedShare(namespace, env, userId, richMessage, meta = {}) {
  if (!namespace || userId == null || !richMessage) return null;
  const token = randomToken();
  const stub = shareStub(namespace, token);
  const response = await stub.fetch("https://share/put", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner_hash: await ownerHash(env, userId),
      rich_message: richMessage,
      title: meta.title || "Send Rich Message",
      description: meta.description || "",
    }),
  });
  if (!response.ok) throw new Error("Could not store prepared share");
  return token;
}

async function getPreparedShare(namespace, env, token, userId) {
  const stub = shareStub(namespace, token);
  if (!stub || userId == null) return null;
  const response = await stub.fetch("https://share/get");
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.rich_message || !data?.owner_hash) return null;
  if (data.owner_hash !== (await ownerHash(env, userId))) return null;
  return data;
}

export {
  SHARE_TTL_MS,
  savePreparedShare,
  getPreparedShare,
};
