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

Supports:

- **Bold**, *italic*
- Inline code and code blocks
- Headings
- Bullet lists
- Links
- Tables (as monospaced blocks)

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

Markdown ↓ Parser ↓ Text + Entities ↓ Telegram Bot API

The bot parses incoming Markdown messages and converts them into structured formatting entities before sending them back to Telegram.

---

## 🚀 Getting Started

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
git clone https://github.com/yourname/telegram-md-bot.git
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

---

### 6. Verify Webhook

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

The returned `url` must match your Worker URL.

---

## 📌 Usage

1. Open your bot in Telegram
2. Send Markdown text
3. Receive formatted message
4. Forward it anywhere

---

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

`npm run build`
```

---

## 🏗 Project Structure

```text
src/
 └── index.js      # Main worker logic
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

---

## 🛡 Security

- Webhook requests are verified
- Tokens are stored as secrets
- No credentials in repository
- HTTPS-only communication

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

## 📈 Roadmap

- Advanced table rendering
- Quote blocks
- Export to PDF
- Channel publishing mode
- Template support

---

## 🤝 Contributing

Contributions are welcome.

Please open an issue or submit a pull request.

---

## 📄 License

MIT License

---

> 🔹 добавить demo-bot ссылку
>
> Скажи, что хочется улучшить дальше 🙂
