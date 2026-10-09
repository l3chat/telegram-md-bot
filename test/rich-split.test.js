import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitRichMarkdown,
  splitRichMessage,
  richLength,
} from "../src/rich-split.js";

test("short Rich Markdown stays in one chunk", () => {
  const input = "# Title\n\nHello";
  assert.deepEqual(splitRichMarkdown(input, 30000), [input]);
});

test("long Markdown splits on paragraph boundaries", () => {
  const paragraph = "x".repeat(9000);
  const input = [paragraph, paragraph, paragraph, paragraph].join("\n\n");
  const parts = splitRichMarkdown(input, 20000);

  assert.equal(parts.length, 2);
  assert.ok(parts.every((part) => richLength(part) <= 20000));
  assert.equal(parts.join("\n\n"), input);
});

test("fenced code is preserved when it must be split", () => {
  const body = Array.from({ length: 200 }, (_, i) => "print(" + i + ")").join("\n");
  const input = "```python\n" + body + "\n```";
  const parts = splitRichMarkdown(input, 800);

  assert.ok(parts.length > 1);
  for (const part of parts) {
    assert.ok(part.startsWith("```python\n"));
    assert.ok(part.endsWith("\n```"));
    assert.ok(richLength(part) <= 800);
  }
});

test("media are attached only to the chunk that references them", () => {
  const first = "# One\n\n![](tg://photo?id=media_1 \"Photo\")\n\n" + "a".repeat(2500);
  const second = "# Two\n\n![](tg://audio?id=media_2 \"Audio\")\n\n" + "b".repeat(2500);
  const media = [
    { id: "media_1", media: { type: "photo", media: "p1" } },
    { id: "media_2", media: { type: "audio", media: "a1" } },
  ];

  const parts = splitRichMessage(first + "\n\n" + second, media, 3000);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts[0].media.map((x) => x.id), ["media_1"]);
  assert.deepEqual(parts[1].media.map((x) => x.id), ["media_2"]);
});
