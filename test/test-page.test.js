import { test } from "node:test";
import assert from "node:assert/strict";
import {
  testPageMarkdown,
} from "../src/test-page.js";
import { testPageWithMedia } from "../src/test-media-page.js";

test("Test Page exists in all five languages", () => {
  for (const locale of ["en", "ru", "de", "fr", "uk"]) {
    const page = testPageMarkdown(locale);
    assert.ok(page.includes("GPT-6.1"));
    assert.ok(page.includes("https://github.com/l3chat/telegram-md-bot"));
    assert.ok(page.includes("| Feature | Status |"));
    assert.ok(page.includes("```python"));
    assert.ok(page.includes("<details>"));
    assert.ok(page.length > 700);
  }
});

test("Test Page with media contains reusable Telegram references", () => {
  const page = testPageWithMedia("en");
  assert.ok(page.includes("test_photo"));
  assert.ok(page.includes("test_audio"));
  assert.ok(page.includes("test_video"));
});
