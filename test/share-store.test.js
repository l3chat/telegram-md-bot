import { test } from "node:test";
import assert from "node:assert/strict";
import { ShareStore } from "../src/share-store.js";

class MemoryStorage {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.get(key); }
  async put(key, value) { this.map.set(key, value); }
  async deleteAll() { this.map.clear(); }
  async setAlarm() {}
}

test("ShareStore saves and returns a prepared Rich Message", async () => {
  const storage = new MemoryStorage();
  const store = new ShareStore({ storage }, { BOT_TOKEN: "test-token" });

  await store.put({
    owner_hash: "abc",
    rich_message: { markdown: "# Hello" },
    title: "Send this Rich Message",
    description: "Tap to send",
  });

  const saved = await store.get();
  assert.equal(saved.owner_hash, "abc");
  assert.deepEqual(saved.rich_message, { markdown: "# Hello" });
  assert.equal(saved.title, "Send this Rich Message");
});

test("ShareStore expires all prepared data on alarm", async () => {
  const storage = new MemoryStorage();
  const store = new ShareStore({ storage }, { BOT_TOKEN: "test-token" });

  await store.put({
    owner_hash: "abc",
    rich_message: { markdown: "Hello" },
  });
  await store.alarm();

  assert.equal(await store.get(), null);
});
