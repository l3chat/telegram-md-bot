# Telegram Markdown Formatter Bot

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange.svg)
![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)
![Serverless](https://img.shields.io/badge/Serverless-Yes-brightgreen.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)

A serverless Telegram bot that converts Markdown-formatted text into clean, properly formatted Telegram messages using native message entities.

This approach avoids HTML parsing problems and guarantees consistent formatting across all Telegram clients.

---

## ✨ Features

- Converts Markdown to Telegram-native formatting
- Uses message entities instead of HTML
- Sends messages with `entities` (no `parse_mode`)

## 🤖 Demo Bot

Try the live bot on Telegram: **@tgMdFormatter_bot**

Supports:

- **Bold**, *italic*
- Inline code and code blocks
- Headings
- Bullet lists
- Links
- Tables (as plain text blocks)

Additional highlights:

- Works in all Telegram clients
- No external server required
- Automatic deployment via GitHub

---

## 📖 Why Entities Instead of HTML

Telegram supports limited HTML tags and often rejects invalid markup.

Using message entities provides:

- Stable rendering
- No parsing errors
- Better client compatibility
- Predictable behavior

For production bots, entities mode is the recommended approach.

---

## ⚙️ How It Works

Processing pipeline:

```
Markdown 
   ↓ 
Parser 
   ↓ 
Text + Entities 
   ↓ 
Telegram Bot API
```

The bot parses incoming Markdown messages and converts them into structured formatting entities before sending them back to Telegram. Messages are sent with `text` + `entities` (no `parse_mode`).

---

## 🚀 Getting Started

### Quick Start

```bash
git clone https://github.com/<yourname>/telegram-md-bot.git
cd telegram-md-bot
npm install
```

Then deploy to Cloudflare Workers, set the required secrets, and configure the Telegram webhook.

### 1. Create a Telegram Bot

Open Telegram and contact **@BotFather**.

```text
/start

/newbot
```

Follow the instructions and save your `BOT_TOKEN`.

---

### 2. Fork or Clone Repository

```bash
git clone https://github.com/<yourname>/telegram-md-bot.git
cd telegram-md-bot
```

Or fork the repository on GitHub.

---

### 3. Deploy to Cloudflare Workers

1. Open Cloudflare Dashboard
2. Go to Workers & Pages
3. Create a new Worker from GitHub repository
4. Connect your forked repository
5. Enable automatic deployments

---

### 4. Configure Secrets

Add the following secrets in Cloudflare:

| Name | Description |
| --- | --- |
| `BOT_TOKEN` | Telegram bot token |
| `WEBHOOK_SECRET` | Webhook verification secret |

Path:

`Workers & Pages → Project → Settings → Variables and Secrets`

Set both as Secrets.

---

## 🔐 Environment Variables

Required:

- `BOT_TOKEN` — Telegram bot token
- `WEBHOOK_SECRET` — Secret token for webhook verification

Optional:

- `WEBHOOK_SECRET` can be left unset if you do not use secret verification.

---

### 5. Configure Telegram Webhook

After deployment, set the webhook:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>
```

Recommended (with secret verification):

```http
POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
Content-Type: application/json

{
  "url": "<WORKER_URL>",
  "secret_token": "<WEBHOOK_SECRET>"
}
```

Webhook vs polling:

- This bot expects **webhook** updates via Cloudflare Workers.
- Polling is not supported in this deployment model.

---

### 6. Verify Webhook

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

The returned `url` must match your Worker URL.

---

## ✅ Deployment Checklist

- Worker deployed successfully
- `BOT_TOKEN` configured
- `WEBHOOK_SECRET` configured (if used)
- Webhook set to your Worker URL
- Webhook verification passes

---

## 📌 Usage

1. Open your bot in Telegram
2. Send Markdown text
3. Receive formatted message
4. Forward it anywhere

---


## 🖼 Images and audio inside one Rich Message

The bot can also assemble Markdown together with Telegram-hosted media into a single Rich Message.

Workflow:

1. Send a photo to the bot as a Telegram photo, or send an audio file / voice note.
2. The bot stores the Telegram `file_id` for 24 hours and replies with an alias such as `photo_1` or the audio filename.
3. Reference that alias from Markdown on its own line:

```md
# Trip notes

Here is the map:

![](photo_1 "Map")

And here is the recording:

![](lesson.mp3 "Audio note")
```

4. Send the Markdown text or `.md` file. The bot rewrites the local aliases to `tg://photo?id=...` / `tg://audio?id=...` and passes the matching media list to `sendRichMessage`.

Commands:

- `/media` — list currently stored media aliases
- `/clear` — clear stored media
- `/help` — show the usage guide

Media aliases are stored for 24 hours. Rich Messages support up to 50 media elements.

### Cloudflare KV binding

Media sessions require one Workers KV namespace bound as:

```text
MEDIA_STORE
```

Create a KV namespace in Cloudflare, then add it to the `tg-md-bot` Worker under **Settings → Bindings → KV Namespace Bindings** with variable name `MEDIA_STORE`.

The bot continues to format plain Markdown even if this binding is not configured; only uploaded local media depends on it.


## 📝 Example

Input:

```md
## Weekly Report

| Task    | Status  |
|---------|---------|
| Backend | Done    |
| UI      | Pending |

- Fix bugs
- Write docs
- Prepare release

```

---

## 🧾 Example Output

The bot returns the same message with clean Telegram formatting and message entities applied. For example, headings, bold text, code, and lists will render exactly as expected in all clients.

---

## ✅ Supported Markdown

| Feature | Supported | Notes |
| --- | --- | --- |
| Bold | Yes | `**bold**` |
| Italic | Yes | `*italic*` |
| Inline code | Yes | `` `code` `` |
| Code blocks | Yes | Fenced blocks |
| Headings | Yes | `#`, `##`, `###` |
| Bullet lists | Yes | `- item` |
| Links | Yes | `[text](url)` and auto-linked URLs |
| Tables | Partial | Rendered as plain text blocks |
| Quotes | Yes | `> quoted text` |

---

## 📊 Supported vs Not Supported

| Category | Supported | Not Supported | Notes |
| --- | --- | --- | --- |
| Text emphasis | Bold, italic, strikethrough | Underline | Telegram entities are used |
| Code | Inline code, fenced blocks | Language-specific highlighting | Rendered as code entities |
| Headings | `#`, `##`, `###` | Deep heading levels | Rendered as bold text |
| Lists | Bulleted lists | Nested lists | Flat lists only |
| Links | Standard links, autolinks | Reference-style links | Basic Markdown link support |
| Tables | Basic tables | Alignment, complex tables | Rendered as plain text |
| Quotes | Basic `>` quotes | Nested blockquotes | Rendered via blockquote entities |

---

## 🏗 Project Structure

```text
src/
 ├── index.js      # Main worker logic
 └── format.js     # Markdown -> entities formatting pipeline
MANUAL_TEST_CONTENT.md  # Copy/paste sample for Telegram manual testing
test/fixtures/
 └── manual_test_expected.json  # Expected output for manual test fixture
wrangler.jsonc     # Cloudflare configuration
package.json       # Dependencies
```

---

## 🧪 Testing

You can test the worker locally using Wrangler:

```bash
npx wrangler dev
```

Then set webhook to the local tunnel.

Manual test content (copy/paste into Telegram):

- `MANUAL_TEST_CONTENT.md`

Fixture-based test:

- `test/fixtures/manual_test_expected.json` is generated from `MANUAL_TEST_CONTENT.md`
- `npm test` verifies the current formatter output matches that fixture

---

## 📚 Telegram Entities Docs

Official Telegram references for entities and formatting:

```text
https://core.telegram.org/bots/api#messageentity
https://core.telegram.org/bots/api#sendmessage
https://core.telegram.org/bots/api#formatting-options
https://core.telegram.org/api/entities
```

---

## 🛡 Security

- Webhook requests are verified
- Tokens are stored as secrets
- No credentials in repository
- HTTPS-only communication
- Secret verification is optional if `WEBHOOK_SECRET` is unset

---

## ⚠️ Troubleshooting

Bot does not respond:

- Check webhook URL
- Verify secrets
- Inspect Cloudflare logs

`400 / Parsing Errors`:

- Ensure entities mode is used
- Avoid unsupported markup

Pending updates:

- Reset webhook: `deleteWebhook` → `setWebhook`

---

## 🚫 Limitations

- Telegram has limits on entity counts and message length.
- Tables are rendered as plain text, not native tables.
- Complex nested Markdown may be simplified.

---

## ❓ FAQ

Why is my bot not responding?

- Check the webhook URL
- Verify secrets
- Inspect Cloudflare logs

Why do I get `400` errors?

- Ensure entities mode is used
- Avoid unsupported markup

Do I need to change bot settings?

- Ensure the bot can read messages in the target chat
- Disable Privacy Mode if you need group-wide formatting

---

## 📈 Roadmap

- Advanced table rendering
- Quote blocks

---

## 🤝 Contributing

Contributions are welcome.

Please open an issue or submit a pull request.

---

## 📄 License

MIT License
