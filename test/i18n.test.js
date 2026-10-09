import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLocale,
  localeFromMessage,
  localeFromHelpCommand,
  localeFromTestCommand,
  helpMarkdown,
  t,
} from "../src/i18n.js";

test("normalizes supported Telegram language codes", () => {
  assert.equal(normalizeLocale("de-DE"), "de");
  assert.equal(normalizeLocale("fr_FR"), "fr");
  assert.equal(normalizeLocale("ru"), "ru");
  assert.equal(normalizeLocale("uk-UA"), "uk");
  assert.equal(normalizeLocale("es"), "en");
});

test("uses Telegram user language by default", () => {
  assert.equal(localeFromMessage({ from: { language_code: "de-DE" } }), "de");
});

test("explicit /help language overrides Telegram language", () => {
  assert.equal(localeFromHelpCommand("/help fr", "de"), "fr");
  assert.equal(localeFromHelpCommand("/start@tgMdFormatter_bot ru", "en"), "ru");
  assert.equal(localeFromHelpCommand("/help", "de"), "de");
  assert.equal(localeFromHelpCommand("/help uk", "en"), "uk");
});

test("help exists in all five languages", () => {
  for (const locale of ["ru", "en", "de", "fr", "uk"]) {
    const help = helpMarkdown(locale);
    assert.ok(help.includes("# Markdown Formatter"));
    assert.ok(help.length > 300);
  }
});

test("service messages are localized", () => {
  assert.equal(t("de", "draftCleared"), "Entwurf gelöscht.");
  assert.equal(t("fr", "kindVideo"), "Vidéo");
  assert.equal(t("uk", "draftCleared"), "Чернетку очищено.");
});


test("explicit /test language overrides Telegram language", () => {
  assert.equal(localeFromTestCommand("/test ru", "en"), "ru");
  assert.equal(localeFromTestCommand("/test@tgMdFormatter_bot de", "fr"), "de");
  assert.equal(localeFromTestCommand("/test", "uk"), "uk");
});
