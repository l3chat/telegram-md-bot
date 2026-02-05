import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markdownToEntities,
  splitTelegramWithEntities,
} from "../src/format.js";

test("bold and italics formatting survive inside lists", () => {
  const input = "- **bold**\n- __bold__";
  const { text, entities } = markdownToEntities(input);

  assert.equal(text, "• bold\n• bold\n");
  assert.equal(entities.length, 2);
  assert.deepEqual(entities[0], { type: "bold", offset: 2, length: 4 });
  assert.deepEqual(entities[1], { type: "italic", offset: 9, length: 4 });
});

test("splitTelegramWithEntities avoids splitting inside entities", () => {
  const text = "hello world";
  const entities = [{ type: "bold", offset: 6, length: 5 }];
  const parts = splitTelegramWithEntities(text, entities, 7);

  assert.equal(parts.length, 2);
  assert.deepEqual(parts[0], { text: "hello ", entities: [] });
  assert.deepEqual(parts[1], {
    text: "world",
    entities: [{ type: "bold", offset: 0, length: 5 }],
  });
});

test("tables are converted into monospaced code blocks", () => {
  const input = "| A | B |\n|---|---|\n| 1 | 2 |";
  const { text, entities } = markdownToEntities(input);

  assert.ok(text.includes("A | B"));
  assert.ok(text.includes("1 | 2"));
  assert.equal(entities.length, 1);
  assert.deepEqual(entities[0], {
    type: "pre",
    offset: 0,
    length: text.length - 2,
  });
});
