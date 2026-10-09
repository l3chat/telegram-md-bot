import { test } from "node:test";
import assert from "node:assert/strict";
import {
  errorMessageKey,
  isHeavyUpdate,
  MAX_RICH_MESSAGE_PARTS,
  MAX_TEXT_FILE_BYTES,
} from "../src/index.js";

test("public hardening constants are conservative", () => {
  assert.equal(MAX_RICH_MESSAGE_PARTS, 10);
  assert.equal(MAX_TEXT_FILE_BYTES, 20 * 1024 * 1024);
});

test("heavy update classification protects expensive operations", () => {
  assert.equal(isHeavyUpdate({ text: "/help" }), false);
  assert.equal(isHeavyUpdate({ text: "/privacy" }), false);
  assert.equal(isHeavyUpdate({ text: "/test" }), true);
  assert.equal(isHeavyUpdate({ text: "# long markdown" }), true);
  assert.equal(isHeavyUpdate({ photo: [{ file_id: "p" }] }), true);
  assert.equal(isHeavyUpdate({ document: { file_id: "d" } }), true);
});

test("Telegram errors map to actionable localized error keys", () => {
  assert.equal(
    errorMessageKey({ code: "TEXT_FILE_TOO_LARGE" }),
    "textFileTooLarge"
  );
  assert.equal(
    errorMessageKey({ code: "DOCUMENT_TOO_LONG" }),
    "documentTooLong"
  );
  assert.equal(
    errorMessageKey({
      telegram: { error_code: 429, description: "Too Many Requests" },
    }),
    "telegramFloodWait"
  );
  assert.equal(
    errorMessageKey({
      telegram: { error_code: 400, description: "Bad Request: wrong file_id" },
    }),
    "telegramFileError"
  );
  assert.equal(
    errorMessageKey({
      telegram: { error_code: 400, description: "Bad Request: message is too long" },
    }),
    "platformLimitError"
  );
});
