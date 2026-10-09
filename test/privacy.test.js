import { test } from "node:test";
import assert from "node:assert/strict";
import {
  privacyMarkdown,
  privacyHtml,
} from "../src/privacy.js";

test("privacy notice is available in all five languages", () => {
  for (const locale of ["en", "ru", "de", "fr", "uk"]) {
    const md = privacyMarkdown(locale, "https://example.org/privacy?lang=" + locale);
    const html = privacyHtml(locale);

    assert.ok(md.length > 300);
    assert.ok(md.includes("24"));
    assert.ok(html.includes("<!doctype html>"));
    assert.ok(html.includes("github.com/l3chat/telegram-md-bot"));
  }
});
