const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * DAY_MS;

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function emptyCounters() {
  return {
    updates: 0,
    rich_messages: 0,
    media: 0,
    errors: 0,
  };
}

export class StatsStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async readUsers() {
    return (await this.state.storage.get("users")) || {};
  }

  async readCounters() {
    return {
      ...emptyCounters(),
      ...((await this.state.storage.get("counters")) || {}),
    };
  }

  async userKey(userId) {
    const salt = this.env.STATS_SALT || this.env.BOT_TOKEN || "stats";
    return sha256(salt + ":" + String(userId));
  }

  async track(body) {
    const now = Date.now();
    const users = await this.readUsers();
    const counters = await this.readCounters();

    if (body.user_id != null) {
      const key = await this.userKey(body.user_id);
      users[key] = now;
    }

    for (const [key, value] of Object.entries(users)) {
      if (now - Number(value) > RETENTION_MS) delete users[key];
    }

    if (body.event && Object.hasOwn(counters, body.event)) {
      counters[body.event] += 1;
    }

    await this.state.storage.put({ users, counters });
    return { ok: true };
  }

  async snapshot() {
    const now = Date.now();
    const users = await this.readUsers();
    const counters = await this.readCounters();

    let dau = 0;
    let wau = 0;
    let mau = 0;

    for (const seen of Object.values(users)) {
      const age = now - Number(seen);
      if (age <= DAY_MS) dau += 1;
      if (age <= 7 * DAY_MS) wau += 1;
      if (age <= 30 * DAY_MS) mau += 1;
    }

    return {
      dau,
      wau,
      mau,
      ...counters,
      since: (await this.state.storage.get("since")) || null,
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\/+/, "");

    if (action === "track") {
      const body = await request.json().catch(() => ({}));
      const since = await this.state.storage.get("since");
      if (!since) await this.state.storage.put("since", new Date().toISOString());
      return Response.json(await this.track(body));
    }

    if (action === "snapshot") {
      return Response.json(await this.snapshot());
    }

    return new Response("Not found", { status: 404 });
  }
}

function statsStub(namespace) {
  if (!namespace) return null;
  return namespace.get(namespace.idFromName("global-stats"));
}

async function trackStat(namespace, event, userId = null) {
  const stub = statsStub(namespace);
  if (!stub) return;
  try {
    await stub.fetch("https://stats/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, user_id: userId }),
    });
  } catch (error) {
    console.error("Stats tracking failed", error);
  }
}

async function getStats(namespace) {
  const stub = statsStub(namespace);
  if (!stub) return emptyCounters();
  const response = await stub.fetch("https://stats/snapshot");
  if (!response.ok) throw new Error("Stats snapshot failed");
  return response.json();
}

export {
  DAY_MS,
  RETENTION_MS,
  statsStub,
  trackStat,
  getStats,
};
