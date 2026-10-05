import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyMediaSession,
  detectIncomingMedia,
  addMediaToSession,
  prepareRichMarkdownMedia,
} from "../src/media.js";

test("photo upload gets a reusable alias", () => {
  const item = detectIncomingMedia(
    {
      photo: [
        { file_id: "small" },
        { file_id: "large" },
      ],
    },
    emptyMediaSession()
  );

  assert.equal(item.kind, "photo");
  assert.equal(item.file_id, "large");
  assert.equal(item.alias, "photo_1");
});

test("audio upload keeps its filename as alias", () => {
  const item = detectIncomingMedia(
    {
      audio: {
        file_id: "audio-file-id",
        file_name: "lesson.mp3",
        mime_type: "audio/mpeg",
      },
    },
    emptyMediaSession()
  );

  assert.equal(item.kind, "audio");
  assert.equal(item.alias, "lesson.mp3");
});

test("local Markdown media refs become tg:// refs plus InputRichMessageMedia", () => {
  const session = addMediaToSession(emptyMediaSession(), {
    kind: "photo",
    file_id: "telegram-photo-id",
    file_name: null,
    alias: "schema.png",
    mime_type: "image/jpeg",
  });

  const prepared = prepareRichMarkdownMedia(
    '# Report\n\n![](schema.png "Diagram")\n\nDone.',
    session
  );

  assert.deepEqual(prepared.missing, []);
  assert.equal(prepared.media.length, 1);
  assert.deepEqual(prepared.media[0], {
    id: "media_1",
    media: {
      type: "photo",
      media: "telegram-photo-id",
    },
  });
  assert.ok(
    prepared.markdown.includes(
      '![](tg://photo?id=media_1 "Diagram")'
    )
  );
});

test("remote media URLs are left untouched", () => {
  const prepared = prepareRichMarkdownMedia(
    "![](https://example.org/photo.jpg)",
    emptyMediaSession()
  );

  assert.deepEqual(prepared.media, []);
  assert.deepEqual(prepared.missing, []);
  assert.equal(
    prepared.markdown,
    "![](https://example.org/photo.jpg)"
  );
});

test("missing local media is reported", () => {
  const prepared = prepareRichMarkdownMedia(
    "![](missing.png)",
    emptyMediaSession()
  );

  assert.deepEqual(prepared.missing, ["missing.png"]);
});


test("unreferenced uploaded media are appended automatically", () => {
  let session = addMediaToSession(emptyMediaSession(), {
    kind: "photo",
    file_id: "photo-id",
    file_name: null,
    alias: "photo_1",
    mime_type: "image/jpeg",
  });
  session = addMediaToSession(session, {
    kind: "audio",
    file_id: "audio-id",
    file_name: "lesson.mp3",
    alias: "lesson.mp3",
    mime_type: "audio/mpeg",
  });

  const prepared = prepareRichMarkdownMedia(
    "# Notes\n\nHello.",
    session,
    { appendUnreferenced: true }
  );

  assert.equal(prepared.media.length, 2);
  assert.ok(prepared.markdown.includes("tg://photo?id=media_1"));
  assert.ok(prepared.markdown.includes("tg://audio?id=media_2"));
  assert.equal(prepared.usedCount, 2);
});
