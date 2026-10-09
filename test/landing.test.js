import { test } from "node:test";
import assert from "node:assert/strict";
import { landingHtml, landingLocale } from "../src/landing.js";

test("landing page is localized and links to tracked Telegram start", () => {
  const page = landingHtml("ru");
  assert.ok(page.includes("Markdown → Rich Message"));
  assert.ok(page.includes("t.me/tgMdFormatter_bot?start=website"));
  assert.ok(page.includes("github.com/l3chat/telegram-md-bot"));
  assert.equal(landingLocale("de-DE"), "de");
  assert.equal(landingLocale("es"), "en");
});
