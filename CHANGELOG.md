# Changelog

## 2026-11-08

### Fixed
- Preserved Telegram rich-text entities when users type formatted text directly in Telegram. Bold, italic, strikethrough, inline code and related formatting are converted back into Markdown before Rich Message generation.
- Preserved formatting entities in media captions.
- Fixed excessive splitting of long Markdown documents with many H1/H2 headings. Headings no longer force a new Rich Message unless the current part is already substantially filled.
- Corrected the misleading “~300,000 characters” error explanation. The real guard is a maximum of 10 generated Rich Messages per operation; the corresponding character count depends on document structure.
- Updated CI expectations for `/version`, localized help headings and the production health build identifier.

### Documentation
- Refreshed all localized READMEs (EN/RU/DE/FR/UK).
- Documented manual-only `/syncprofile` behavior.
- Documented the current long-document splitting rules and the difference between a part-count limit and a character-count approximation.

## Earlier milestones
- Markdown → Telegram Rich Message conversion.
- Automatic media linking for photos, audio, video, voice messages and files.
- Durable Object draft storage with 24-hour expiry.
- Automatic album finalization.
- Localized UI and documentation in EN/RU/DE/FR/UK.
- `/test`, `/stats`, `/version`, `/share`, `/privacy`, `/media`, `/send` and `/clear`.
- Public landing page, webhook diagnostics and production smoke tests.
