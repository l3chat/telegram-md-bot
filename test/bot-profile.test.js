import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_LOCALES,
  publicBotConfig,
} from "../src/bot-profile.js";

test("public bot profile exists in all supported languages", () => {
  assert.deepEqual(PUBLIC_LOCALES, ["en", "ru", "de", "fr", "uk"]);

  for (const locale of PUBLIC_LOCALES) {
    const config = publicBotConfig(locale);
    assert.ok(config.name.length > 0 && config.name.length <= 64);
    assert.ok(config.shortDescription.length > 0 && config.shortDescription.length <= 120);
    assert.ok(config.description.length > 0 && config.description.length <= 512);
    assert.ok(config.description.includes("GPT-6.1"));
    assert.deepEqual(
      config.commands.map((x) => x.command),
      ["help", "test", "media", "send", "clear", "privacy", "stats", "share"]
    );
  }
});
