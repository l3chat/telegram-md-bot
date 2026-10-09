# Media test fixtures

Small deterministic media files for manual and automated testing of `@tgMdFormatter_bot`.

## Images

- `images/184273.png`
- `images/265947.png`
- `images/502916.png`
- `images/731408.png`
- `images/890154.png`

Each image contains one six-digit number on a plain background.

## Audio

- `audio/ding-dong-01.mp3` — short two-tone chime
- `audio/chimes-02.mp3` — short three-tone chime

## Video

- `video/numbers-01.mp4` — 184273 → 502916 → 731408
- `video/numbers-02.mp4` — 265947 → 890154 → 184273

The videos are intentionally tiny and simple so they are practical Git fixtures.

## Suggested manual test

1. Send several image/audio/video files to the bot.
2. Run `/media` and verify all pending files are listed.
3. Send Markdown that references some files by name.
4. Verify explicitly referenced media appear at the requested positions.
5. Verify unreferenced media are appended automatically.
6. For an album-style draft, use `/send`.
7. Run `/media` after successful assembly and verify the draft is empty.

These files contain no personal data and are intended only for regression testing.
