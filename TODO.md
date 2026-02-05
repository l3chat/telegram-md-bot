1. [x] Entities-only refactor (overall): output `text` + entities and remove HTML output.
2. [x] Entities-only subtask: choose parsing strategy and data model for entity generation.
3. [x] Entities-only subtask: implement Markdown -> `text` + entities builder.
4. [x] Entities-only subtask: implement safe splitting that respects entity boundaries.
5. [x] Entities-only subtask: update send logic to use `entities` without `parse_mode`.
6. [x] Entities-only subtask: update tests and README to match entities-only behavior.
7. [x] Fix the table test expectation in `test/index.test.js` to match real `preProcessMd` output.
8. [x] Decide whether `WEBHOOK_SECRET` is required; make code and docs consistent.
9. [x] Centralize constants like max message length and separator text.
10. [x] Add basic CI for `npm test` and optionally lint/format tooling.
11. [x] Separate formatting logic from the Worker handler into a module (e.g., `src/format.js`).
12. [x] Add a Markdown test content file for Telegram copy/paste (`MANUAL_TEST_CONTENT.md`).
13. [x] Add fixture-based test for `MANUAL_TEST_CONTENT.md`.
14. [ ] Roadmap: Advanced table rendering.
15. [ ] Roadmap: Quote blocks.
