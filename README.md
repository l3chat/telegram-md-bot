[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Українська](README.uk.md)

# Telegram Markdown Formatter Bot

A public Telegram bot that turns Markdown into a **single Telegram Rich Message**.

Live bot: **@tgMdFormatter_bot**

Built with **GPT-6.1** · Source: https://github.com/l3chat/telegram-md-bot

## Features

- Markdown → Telegram Rich Message
- Long structured messages
- Automatic splitting of documents longer than one Rich Message limit
- Headings, lists, quotes, tables, code blocks and links
- Photos, audio, voice messages, video and files inside the same Rich Message
- Automatic media linking — users do not need to write `tg://...` URLs
- Accepts Markdown as text or as `.md`, `.markdown`, or `.txt` files
- Temporary multi-message drafts backed by Cloudflare Durable Objects
- Automatic draft expiry after 24 hours
- Localized UI in:
  - English
  - Russian
  - German
  - French
  - Ukrainian

## Basic usage

### Text only

Send Markdown directly:

```md
# Title

This is **bold** and this is *italic*.

- one
- two
```

The bot returns one formatted Rich Message. If the document is too large for a single Rich Message, it is split automatically into multiple structured Rich Messages at safe Markdown boundaries.

### Text with media

The simplest workflow:

1. Send photos, audio, video, voice messages or files.
2. Send the Markdown text or a `.md/.txt` file.
3. The bot automatically builds one Rich Message.

If Markdown contains a local media reference such as:

```md
![](photo.jpg "Caption")
```

and a file named `photo.jpg` was uploaded, the bot inserts it at that location.

Uploaded media that are not explicitly referenced are appended automatically.

### Photo with caption

A single photo can be sent together with a Markdown caption. The bot uses the caption as the document text and builds one Rich Message.

## Commands

- `/help` — usage help
- `/help en`
- `/help ru`
- `/help de`
- `/help fr`
- `/help uk`
- `/media` — list media waiting in the current draft
- `/send` — build the current draft
- `/clear` — discard the current draft
- `/privacy` — show the localized privacy notice and public privacy-page link
- `/test` — print the localized Rich Message Test Page directly in the bot chat

The bot automatically chooses the UI language from Telegram's `language_code`; unsupported languages fall back to English.

## Public Telegram profile

The Worker automatically synchronizes the bot's public Telegram configuration through the Bot API after deployment/first webhook activity:

- localized command menus;
- localized display name;
- localized short description;
- localized full description.

Supported profile languages: **EN / RU / DE / FR / UK**.

The default profile is English.

## Privacy

The bot provides a localized `/privacy` command.

A public privacy page is served directly by the Worker:

```text
https://<worker>.workers.dev/privacy
```

Language can be selected with `?lang=en|ru|de|fr|uk`.

A repository copy is also available in `PRIVACY.md`.

## Architecture

```text
Telegram
   ↓ webhook
Cloudflare Worker
   ↓
DraftSession Durable Object
   ↓
Telegram Bot API / sendRichMessage
```

Each user/chat pair gets an independent `DraftSession` Durable Object.

The object stores only temporary draft metadata such as:

- Markdown draft
- Telegram `file_id` values
- file names / aliases
- media order
- album state

Actual photos and audio remain hosted by Telegram.

Durable Object state is automatically removed after 24 hours using an alarm.

## Project structure

```text
src/
├── index.js          # Telegram webhook and bot workflow
├── media.js          # Media detection and Rich Markdown media mapping
├── draft-session.js  # Durable Object draft storage
├── i18n.js           # EN/RU/DE/FR/UK localization
└── format.js         # Legacy sendMessage fallback formatter

test/
├── index.test.js
├── media.test.js
└── i18n.test.js

wrangler.jsonc        # Cloudflare Worker + Durable Object configuration
```

## Deployment

### Requirements

- Cloudflare Workers account
- Telegram bot token from BotFather
- Node.js 20+
- Wrangler

### Secrets

Configure:

- `BOT_TOKEN`
- `WEBHOOK_SECRET` (recommended)

### Durable Object

`wrangler.jsonc` already contains the binding:

```json
{
  "durable_objects": {
    "bindings": [
      {
        "name": "DRAFT_SESSIONS",
        "class_name": "DraftSession"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["DraftSession"]
    }
  ]
}
```

No KV namespace is required.

### Deploy

```bash
npm ci
npm test
npx wrangler deploy
```

### Set Telegram webhook

```text
POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

Example JSON body:

```json
{
  "url": "https://<worker>.workers.dev",
  "secret_token": "<WEBHOOK_SECRET>"
}
```

## Health check

Open the Worker URL in a browser.

Current build returns:

```text
tg-md-bot: OK test-page-v1
```

## Demo document

A full manual demo / regression test is available in:

- `RICH_MESSAGE_DEMO.md`

It exercises headings, lists, task lists, quotes, tables, code, links, formulas and media placement.

## Testing

Run:

```bash
npm test
```

CI runs automatically on pushes and pull requests to `main`.

## Security and privacy notes

- Bot token and webhook secret are stored as Cloudflare secrets.
- Incoming webhooks can be verified with `WEBHOOK_SECRET`.
- Draft state is isolated per chat/user pair.
- Draft state expires automatically after 24 hours.
- Media binaries are not copied into Durable Object storage; Telegram `file_id` references are stored instead.

## Current limits

Telegram Rich Messages have platform limits, including message size and media count. The bot uses a conservative ~30,000-character target and automatically splits longer Markdown at structural boundaries where possible. Fenced code blocks are reopened/closed when a single code block itself must be split. Media are attached only to the chunk that references them. The bot currently enforces a maximum of **50 media items** in one prepared document.

## Status

Active development.

Current production architecture:

**Rich Messages + Durable Objects + automatic media linking + five UI languages.**


## Localized documentation

### README

- [English](README.md)
- [Русский](README.ru.md)
- [Deutsch](README.de.md)
- [Français](README.fr.md)
- [Українська](README.uk.md)

### Privacy

- [English](PRIVACY.en.md)
- [Русский](PRIVACY.ru.md)
- [Deutsch](PRIVACY.de.md)
- [Français](PRIVACY.fr.md)
- [Українська](PRIVACY.uk.md)

### Bot description

- [English](BOT_DESCRIPTION.md)
- [Русский](BOT_DESCRIPTION.ru.md)
- [Deutsch](BOT_DESCRIPTION.de.md)
- [Français](BOT_DESCRIPTION.fr.md)
- [Українська](BOT_DESCRIPTION.uk.md)
