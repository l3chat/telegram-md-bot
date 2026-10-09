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
    starts: 0,
    rich_messages: 0,
    media: 0,
    errors: 0,
  };
}

function normalizeSource(value) {
  const source = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  return source || null;
}

function normalizeUserRecord(value) {
  if (typeof value === "number") {
    return { last_seen: value, source: null, started_at: null, rich: false };
  }
  return {
    last_seen: Number(value?.last_seen || 0),
    source: normalizeSource(value?.source),
    started_at: value?.started_at || null,
    rich: Boolean(value?.rich),
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
    const source = normalizeSource(body.source);

    if (body.user_id != null) {
      const key = await this.userKey(body.user_id);
      const record = normalizeUserRecord(users[key]);
      record.last_seen = now;

      if (source && !record.source) record.source = source;
      if (body.event === "starts" && !record.started_at) {
        record.started_at = new Date(now).toISOString();
      }
      if (body.event === "rich_messages") record.rich = true;

      users[key] = record;
    }

    for (const [key, raw] of Object.entries(users)) {
      const record = normalizeUserRecord(raw);
      if (now - record.last_seen > RETENTION_MS) delete users[key];
      else users[key] = record;
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
    const sources = {};

    for (const raw of Object.values(users)) {
      const record = normalizeUserRecord(raw);
      const age = now - record.last_seen;
      if (age <= DAY_MS) dau += 1;
      if (age <= 7 * DAY_MS) wau += 1;
      if (age <= 30 * DAY_MS) {
        mau += 1;
        if (record.source) {
          const row = sources[record.source] || {
            users: 0,
            rich_users: 0,
          };
          row.users += 1;
          if (record.rich) row.rich_users += 1;
          sources[record.source] = row;
        }
      }
    }

    return {
      dau,
      wau,
      mau,
      ...counters,
      sources,
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

async function trackStat(namespace, event, userId = null, source = null) {
  const stub = statsStub(namespace);
  if (!stub) return;
  try {
    await stub.fetch("https://stats/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        user_id: userId,
        source: normalizeSource(source),
      }),
    });
  } catch (error) {
    console.error("Stats tracking failed", error);
  }
}

async function getStats(namespace) {
  const stub = statsStub(namespace);
  if (!stub) return { ...emptyCounters(), sources: {} };
  const response = await stub.fetch("https://stats/snapshot");
  if (!response.ok) throw new Error("Stats snapshot failed");
  return response.json();
}

export {
  DAY_MS,
  RETENTION_MS,
  normalizeSource,
  statsStub,
  trackStat,
  getStats,
};
