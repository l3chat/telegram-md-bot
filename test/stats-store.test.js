import { test } from "node:test";
import assert from "node:assert/strict";
import { StatsStore } from "../src/stats-store.js";

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    return this.map.get(key);
  }
  async put(key, value) {
    if (typeof key === "object" && value === undefined) {
      for (const [k, v] of Object.entries(key)) this.map.set(k, v);
      return;
    }
    this.map.set(key, value);
  }
}

test("StatsStore counts active users and aggregate events", async () => {
  const storage = new MemoryStorage();
  const store = new StatsStore(
    { storage },
    { STATS_SALT: "test-salt" }
  );

  await store.track({ event: "updates", user_id: 1001 });
  await store.track({ event: "updates", user_id: 1001 });
  await store.track({ event: "updates", user_id: 1002 });
  await store.track({ event: "media", user_id: null });
  await store.track({ event: "rich_messages", user_id: null });
  await store.track({ event: "errors", user_id: null });

  const stats = await store.snapshot();

  assert.equal(stats.dau, 2);
  assert.equal(stats.wau, 2);
  assert.equal(stats.mau, 2);
  assert.equal(stats.updates, 3);
  assert.equal(stats.media, 1);
  assert.equal(stats.rich_messages, 1);
  assert.equal(stats.errors, 1);

  const users = await storage.get("users");
  const keys = Object.keys(users);
  assert.equal(keys.length, 2);
  assert.ok(keys.every((key) => !key.includes("1001") && !key.includes("1002")));
});


test("StatsStore attributes referral conversion without raw user ids", async () => {
  const storage = new MemoryStorage();
  const store = new StatsStore(
    { storage },
    { STATS_SALT: "test-salt" }
  );

  await store.track({ event: "starts", user_id: 2001, source: "website" });
  await store.track({ event: "updates", user_id: 2001 });
  await store.track({ event: "rich_messages", user_id: 2001 });
  await store.track({ event: "starts", user_id: 2002, source: "share" });

  const snapshot = await store.snapshot();

  assert.equal(snapshot.starts, 2);
  assert.deepEqual(snapshot.sources.website, {
    users: 1,
    rich_users: 1,
  });
  assert.deepEqual(snapshot.sources.share, {
    users: 1,
    rich_users: 0,
  });
});
