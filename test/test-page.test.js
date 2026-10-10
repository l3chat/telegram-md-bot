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
    assert.ok(page.includes("|"));
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


test("display math uses double-dollar fences", () => {
  const page = testPageMarkdown("en");
  assert.ok(page.includes("$$\nf(n)=n^2+n+41\n$$"));
  assert.ok(page.includes("\\int_{-\\infty}^{\\infty}"));
  assert.ok(page.includes("\\frac{1}{\\sqrt{2\\pi}}"));
  assert.ok(page.includes("e^{-x^2/2}"));
  assert.ok(page.includes("\\,dx = 1"));
});

test("Test Page media are distributed through the document", () => {
  const page = testPageWithMedia("en");
  const photo = page.indexOf("test_photo");
  const quote = page.indexOf("## 3. Quote");
  const audio = page.indexOf("test_audio");
  const math = page.indexOf("## 6. Math");
  const video = page.indexOf("test_video");
  const mediaSyntax = page.indexOf("## 8. Media syntax");

  assert.ok(photo > -1 && photo < quote);
  assert.ok(audio > quote && audio < math);
  assert.ok(video > math && video < mediaSyntax);
});


test("localized lists and compact tables are used", () => {
  const ru = testPageMarkdown("ru");
  assert.ok(ru.includes("1. один"));
  assert.ok(ru.includes("|Тест|✓|"));
  assert.ok(!ru.includes("| Возможность | Статус |"));
  assert.ok(ru.includes("184273.png"));
  assert.ok(ru.includes("ding-dong-01.mp3"));
  assert.ok(ru.includes("numbers-01.mp4"));
  assert.ok(ru.includes("github.com/l3chat/telegram-md-bot/blob/main/docs/tutorial/test-page.ru.md"));
  assert.ok(ru.includes("raw.githubusercontent.com/l3chat/telegram-md-bot/main/docs/tutorial/test-page.ru.md"));
});
