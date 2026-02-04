import { test } from "node:test";
import assert from "node:assert/strict";
import { mdToTelegramHtml, preProcessMd, splitTelegram } from "../src/index.js";

test("bold and italics formatting survive inside lists", () => {
  const input = "- **bold**\n- __bold__";
  const output = mdToTelegramHtml(preProcessMd(input));

  const lines = output.split("\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "• <b>bold</b>");
  assert.equal(lines[1], "• <i>bold</i>");
});

test("splitTelegram splits long strings conservatively", () => {
  const input = "a".repeat(7001);
  const parts = splitTelegram(input, 3500);

  assert.equal(parts.length, 3);
  assert.equal(parts[0].length, 3500);
  assert.equal(parts[1].length, 3500);
  assert.equal(parts[2].length, 1);
});

test("tables are converted into monospaced code blocks", () => {
  const input = "| A | B |\n|---|---|\n| 1 | 2 |";
  const output = preProcessMd(input);

  assert.ok(output.startsWith("```\ntext\n"));
  assert.ok(output.trimEnd().endsWith("```"));
  assert.ok(output.includes("A | B"));
  assert.ok(output.includes("1 | 2"));
});
