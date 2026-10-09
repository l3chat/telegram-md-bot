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


test("display math uses double-dollar fences", () => {
  const page = testPageMarkdown("en");
  assert.ok(page.includes("$$\nf(n)=n^2+n+41\n$$"));
  assert.ok(
    page.includes(
      "$$\n\\\\int_{-\\\\infty}^{\\\\infty} \\\\frac{1}{\\\\sqrt{2\\\\pi}} e^{-x^2/2}\\\\,dx = 1\n$$"
    )
  );
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
